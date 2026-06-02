/**
 * TLS Anomaly Candidate Scoring.
 *
 * Detects TLS connections with suspicious certificate properties, known-bad
 * fingerprints, or SNI anomalies. Composite = max of three independent
 * dimensions — the strongest signal wins:
 *   1. Certificate anomaly (self-signed, expired, validity, short serial)
 *   2. Fingerprint anomaly (JA3/JA3S/JA4X known-bad lookup)
 *   3. SNI anomaly (missing, mismatch, IP-only connection)
 *
 * Entity key: (src_ip, dest_ip, dest_port).
 *
 * Ported verbatim (logic + weights) from
 * aionsec_HUNT/src/pipeline/score/tls-anomaly.ts. Trimmed: dropped always-null
 * attribution fields and the empty `enrichment` object.
 *
 * The fingerprint dimension degrades gracefully to 0 when the known-bad feed
 * sets are empty (feeds absent) — cert + SNI dimensions compute standalone.
 */

import type { TlsSslEvent, TlsAnomalyCandidate } from '../types.js';
import { round } from '../stats.js';
import { isRfc1918, assignDeterministicCandidateIds } from '../util.js';

export interface TlsAnomalyConfig {
  min_dimension_score: number;

  cert_self_signed_weight: number;
  cert_expired_weight: number;
  cert_short_validity_weight: number;
  cert_long_validity_weight: number;
  cert_short_serial_weight: number;

  cert_short_validity_days: number;
  cert_long_validity_years: number;
  cert_short_serial_bytes: number;

  fp_ja3_ja3s_pair_score: number;
  fp_ja4x_match_score: number;
  fp_ja3_match_score: number;
  fp_ja3s_match_score: number;

  sni_mismatch_score: number;
  sni_to_ip_score: number;
  sni_missing_score: number;

  known_bad_ja3: Set<string>;
  known_bad_ja3s: Set<string>;
  known_bad_ja3_ja3s_pairs: Set<string>;  // "ja3|ja3s" format
  known_bad_ja4x: Set<string>;
}

export const DEFAULT_TLS_ANOMALY_CONFIG: TlsAnomalyConfig = {
  min_dimension_score: 0.30,

  cert_self_signed_weight: 0.40,
  cert_expired_weight: 0.20,
  cert_short_validity_weight: 0.15,
  cert_long_validity_weight: 0.15,
  cert_short_serial_weight: 0.10,

  cert_short_validity_days: 7,
  cert_long_validity_years: 10,
  cert_short_serial_bytes: 4,

  fp_ja3_ja3s_pair_score: 0.95,
  fp_ja4x_match_score: 0.95,
  fp_ja3_match_score: 0.90,
  fp_ja3s_match_score: 0.80,

  sni_mismatch_score: 0.70,
  sni_to_ip_score: 0.60,
  sni_missing_score: 0.50,

  known_bad_ja3: new Set(),
  known_bad_ja3s: new Set(),
  known_bad_ja3_ja3s_pairs: new Set(),
  known_bad_ja4x: new Set(),
};

function normalizeHash(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function hasHash(set: Set<string>, hash: string): boolean {
  return set.has(hash) || set.has(hash.toLowerCase()) || set.has(hash.toUpperCase());
}

// ─── Dimension 1: Certificate Anomaly ───────────────────────

export function computeCertAnomalyScore(event: TlsSslEvent, config: TlsAnomalyConfig): number {
  // Self-signed to internal IP → excluded
  if (event.cert_self_signed && isRfc1918(event.dest_ip)) return 0;

  let score = 0;

  if (event.cert_self_signed) score += config.cert_self_signed_weight;
  if (event.cert_expired) score += config.cert_expired_weight;

  if (event.cert_validity_days !== null && event.cert_validity_days !== undefined) {
    if (event.cert_validity_days < config.cert_short_validity_days) {
      score += config.cert_short_validity_weight;
    }
    if (event.cert_validity_days > config.cert_long_validity_years * 365) {
      score += config.cert_long_validity_weight;
    }
  }

  if (event.cert_serial !== null && event.cert_serial !== undefined) {
    const hex = event.cert_serial.replace(/^0x/i, '');
    const serialBytes = Math.ceil(hex.length / 2);
    if (serialBytes > 0 && serialBytes < config.cert_short_serial_bytes) {
      score += config.cert_short_serial_weight;
    }
  }

  return Math.min(1.0, score);
}

// ─── Dimension 2: Fingerprint Anomaly ───────────────────────

export function computeFingerprintAnomalyScore(event: TlsSslEvent, config: TlsAnomalyConfig): number {
  let maxScore = 0;
  const ja3 = normalizeHash(event.ja3_hash);
  const ja3s = normalizeHash(event.ja3s_hash);
  const ja4x = normalizeHash(event.ja4x_hash);

  if (ja3 && ja3s) {
    const pair = `${ja3}|${ja3s}`;
    if (hasHash(config.known_bad_ja3_ja3s_pairs, pair)) {
      maxScore = Math.max(maxScore, config.fp_ja3_ja3s_pair_score);
    }
  }
  if (ja4x && hasHash(config.known_bad_ja4x, ja4x)) {
    maxScore = Math.max(maxScore, config.fp_ja4x_match_score);
  }
  if (ja3 && hasHash(config.known_bad_ja3, ja3)) {
    maxScore = Math.max(maxScore, config.fp_ja3_match_score);
  }
  if (ja3s && hasHash(config.known_bad_ja3s, ja3s)) {
    maxScore = Math.max(maxScore, config.fp_ja3s_match_score);
  }

  return maxScore;
}

// ─── Dimension 3: SNI Anomaly ───────────────────────────────

export function computeSniAnomalyScore(event: TlsSslEvent, config: TlsAnomalyConfig): number {
  let maxScore = 0;

  if (event.server_name && event.sni_matches_cert === false) {
    maxScore = Math.max(maxScore, config.sni_mismatch_score);
  }
  if (event.server_name && event.connection_to_ip) {
    maxScore = Math.max(maxScore, config.sni_to_ip_score);
  }
  if (!event.server_name) {
    maxScore = Math.max(maxScore, config.sni_missing_score);
  }

  return maxScore;
}

// ─── Core Scoring ───────────────────────────────────────────

export function scoreTlsAnomalyCandidates(
  events: TlsSslEvent[],
  config: TlsAnomalyConfig = DEFAULT_TLS_ANOMALY_CONFIG,
): TlsAnomalyCandidate[] {
  const groups = groupByEntityKey(events);
  const candidates: TlsAnomalyCandidate[] = [];

  for (const [key, entries] of groups) {
    let bestCert = 0;
    let bestFingerprint = 0;
    let bestSni = 0;
    let bestEntry: TlsSslEvent = entries[0];
    let bestEntryMax = -1;

    let ja3Bad = false;
    let ja3sBad = false;
    let pairBad = false;
    let ja4xBad = false;

    for (const e of entries) {
      const certScore = computeCertAnomalyScore(e, config);
      const fpScore = computeFingerprintAnomalyScore(e, config);
      const sniScore = computeSniAnomalyScore(e, config);
      const entryMax = Math.max(certScore, fpScore, sniScore);
      const ja3 = normalizeHash(e.ja3_hash);
      const ja3s = normalizeHash(e.ja3s_hash);
      const ja4x = normalizeHash(e.ja4x_hash);

      if (entryMax > bestEntryMax) {
        bestEntry = e;
        bestEntryMax = entryMax;
      }

      bestCert = Math.max(bestCert, certScore);
      bestFingerprint = Math.max(bestFingerprint, fpScore);
      bestSni = Math.max(bestSni, sniScore);

      if (ja3 && hasHash(config.known_bad_ja3, ja3)) ja3Bad = true;
      if (ja3s && hasHash(config.known_bad_ja3s, ja3s)) ja3sBad = true;
      if (ja3 && ja3s && hasHash(config.known_bad_ja3_ja3s_pairs, `${ja3}|${ja3s}`)) pairBad = true;
      if (ja4x && hasHash(config.known_bad_ja4x, ja4x)) ja4xBad = true;
    }

    const composite = Math.max(bestCert, bestFingerprint, bestSni);
    if (composite < config.min_dimension_score) continue;

    const timestamps = entries.map(e => new Date(e.timestamp).getTime() / 1000).sort((a, b) => a - b);
    const [srcIp, destIp, destPort] = key.split('|');

    candidates.push({
      candidate_id: '',
      type: 'tls_anomaly',
      time_window_start: new Date(timestamps[0] * 1000).toISOString(),
      time_window_end: new Date(timestamps[timestamps.length - 1] * 1000).toISOString(),

      src_ip: srcIp,
      dest_ip: destIp,
      dest_port: parseInt(destPort),

      cert_anomaly_score: round(bestCert, 4),
      fingerprint_anomaly_score: round(bestFingerprint, 4),
      sni_anomaly_score: round(bestSni, 4),
      tls_anomaly_score: round(composite, 4),

      cert_subject: bestEntry.cert_subject ?? null,
      cert_issuer: bestEntry.cert_issuer ?? null,
      cert_serial: bestEntry.cert_serial ?? null,
      cert_validity_days: bestEntry.cert_validity_days ?? null,
      cert_not_before: bestEntry.cert_not_before ?? null,
      cert_not_after: bestEntry.cert_not_after ?? null,
      cert_self_signed: bestEntry.cert_self_signed ?? false,
      cert_expired: bestEntry.cert_expired ?? false,
      cert_key_type: bestEntry.cert_key_type ?? null,
      cert_key_length: bestEntry.cert_key_length ?? null,
      cert_san_dns: bestEntry.cert_san_dns ?? [],
      cert_chain_length: bestEntry.cert_chain_length ?? 0,

      ja3_hash: bestEntry.ja3_hash ?? null,
      ja4_hash: bestEntry.ja4_hash ?? null,
      ja3s_hash: bestEntry.ja3s_hash ?? null,
      ja4x_hash: bestEntry.ja4x_hash ?? null,
      ja3_known_bad: ja3Bad,
      ja3s_known_bad: ja3sBad,
      ja3_ja3s_pair_known_bad: pairBad,
      ja4x_known_bad: ja4xBad,

      server_name: bestEntry.server_name ?? null,
      sni_matches_cert: bestEntry.sni_matches_cert ?? null,
      connection_to_ip: bestEntry.connection_to_ip ?? false,

      tls_version: bestEntry.tls_version ?? null,
      cipher_suite: bestEntry.cipher ?? null,
      total_tls_connections: entries.length,
      session_count: entries.length,

      evidence: { constituent_event_ids: entries.map(e => e.id) },
    });
  }

  return assignDeterministicCandidateIds('TLS', candidates.sort((a, b) => b.tls_anomaly_score - a.tls_anomaly_score));
}

function groupByEntityKey(events: TlsSslEvent[]): Map<string, TlsSslEvent[]> {
  const groups = new Map<string, TlsSslEvent[]>();
  for (const e of events) {
    const key = `${e.src_ip}|${e.dest_ip}|${e.dest_port}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return groups;
}
