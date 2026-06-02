/**
 * mini-distillation CLI — score detection candidates from telemetry events.
 *
 * Usage:
 *   npx tsx src/distill.ts score <beacon|tls|powershell|all> <events.json> [--out <file>]
 *
 * Loads events (JSON array or NDJSON), filters per scorer, runs the scorer(s),
 * prints a readable summary to stdout, and writes candidates as NDJSON.
 * Deterministic candidate ids. No network, no DB, no services.
 *
 * This is the SCORING stage only — a faithful subset of the larger HUNT
 * pipeline. Enrichment (rarity, LOTS, threat-intel) and attribution are later
 * stages, deliberately out of scope. See README.md.
 */

import { writeFileSync } from 'node:fs';
import { loadEvents, filterConnEvents, filterTlsEvents, filterPowerShellEvents } from './load.js';
import { scoreBeaconCandidates } from './scorers/beacon.js';
import { scoreTlsAnomalyCandidates } from './scorers/tls-anomaly.js';
import { scorePowerShellInvocationAnomalyCandidates } from './scorers/powershell-invocation-anomaly.js';
import { loadTlsAnomalyConfig } from './config/tls.js';
import { loadPowerShellInvocationConfig } from './config/powershell.js';
import type { Candidate } from './types.js';

type Detector = 'beacon' | 'tls' | 'powershell';
const ALL_DETECTORS: Detector[] = ['beacon', 'tls', 'powershell'];

function usage(): never {
  console.error('Usage: npx tsx src/distill.ts score <beacon|tls|powershell|all> <events.json> [--out <file>]');
  console.error('');
  console.error('  beacon      Zeek conn.log  → beacon candidates (BCN-)');
  console.error('  tls         Zeek ssl.log   → TLS anomaly candidates (TLS-)');
  console.error('  powershell  Sysmon EID 1/7 → PowerShell invocation anomaly candidates (PSI-)');
  console.error('  all         run every detector');
  process.exit(1);
}

function runDetector(detector: Detector, events: ReturnType<typeof loadEvents>): Candidate[] {
  if (detector === 'beacon') {
    const conn = filterConnEvents(events);
    console.log(`  [beacon] ${conn.length} conn events`);
    return scoreBeaconCandidates(conn);
  }
  if (detector === 'tls') {
    const tls = filterTlsEvents(events);
    const { config, loaded, missing } = loadTlsAnomalyConfig();
    if (missing.length > 0) {
      for (const m of missing) {
        console.warn(`  [tls] known-bad feed not found: ${m} — fingerprint scoring degrades to 0`);
      }
    }
    console.log(`  [tls] ${tls.length} ssl events; feeds: ja3=${loaded.ja3} ja3s=${loaded.ja3s} pairs=${loaded.pairs} ja4x=${loaded.ja4x}`);
    return scoreTlsAnomalyCandidates(tls, config);
  }
  // powershell
  const psEvents = filterPowerShellEvents(events);
  const config = loadPowerShellInvocationConfig();
  console.log(`  [powershell] ${psEvents.length} sysmon process_create/image_load events; `
    + `taxonomy=${config.parent_taxonomy.size} allowlist=${config.host_allowlist.size} `
    + `hard_exclusions=${config.hard_parent_exclusions.length} vendor_pairs=${config.vendor_pairs.length}`);
  return scorePowerShellInvocationAnomalyCandidates(psEvents, config);
}

function summarizeCandidate(c: Candidate): string {
  if (c.type === 'beacon') {
    return `  ${c.candidate_id}  beacon  score=${c.beacon_score}  `
      + `${c.src_ip} -> ${c.dest_ip}:${c.dest_port}  `
      + `regularity=${c.regularity} median/mean_interval=${c.mean_interval_sec}s sessions=${c.session_count} `
      + `bytes_out_consist=${c.bytes_out_consistency} bytes_in_consist=${c.bytes_in_consistency} `
      + `histogram=${c.histogram_score} consecutive_hrs=${c.consecutive_hours} bytes_ratio=${c.bytes_ratio}`;
  }
  if (c.type === 'tls_anomaly') {
    return `  ${c.candidate_id}  tls_anomaly  score=${c.tls_anomaly_score}  `
      + `${c.src_ip} -> ${c.dest_ip}:${c.dest_port}  `
      + `cert=${c.cert_anomaly_score} fp=${c.fingerprint_anomaly_score} sni=${c.sni_anomaly_score}  `
      + `self_signed=${c.cert_self_signed} expired=${c.cert_expired} sni=${c.server_name ?? '(missing)'} `
      + `to_ip=${c.connection_to_ip} ja3=${c.ja3_hash ?? '(none)'} ja3_bad=${c.ja3_known_bad} pair_bad=${c.ja3_ja3s_pair_known_bad}`;
  }
  // powershell_invocation_anomaly
  return `  ${c.candidate_id}  powershell_invocation_anomaly  score=${c.powershell_invocation_anomaly_score}  `
    + `host=${c.host} proc=${c.process_name ?? '(unknown)'}  `
    + `rename=${c.rename_suspicion} custom_host=${c.custom_host_suspicion} parent=${c.parent_suspicion} cmd=${c.commandline_suspicion}  `
    + `dominant=${c.dominant_dimension} parent_proc=${c.parent_process_name} parent_category=${c.parent_category} `
    + `cmdline_class=${c.cmdline_classification} flags=${c.cmdline_flags_detected.join('|') || '(none)'}`;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 3 || args[0] !== 'score') usage();

  const detectorArg = args[1];
  const eventsPath = args[2];
  const outIdx = args.indexOf('--out');
  const outPath = outIdx !== -1 ? args[outIdx + 1] : 'candidates.ndjson';

  let detectors: Detector[];
  if (detectorArg === 'all') {
    detectors = ALL_DETECTORS;
  } else if ((ALL_DETECTORS as string[]).includes(detectorArg)) {
    detectors = [detectorArg as Detector];
  } else {
    console.error(`Unknown detector: "${detectorArg}". Use one of: beacon, tls, powershell, all.`);
    process.exit(1);
  }

  const events = loadEvents(eventsPath);
  console.log(`Loaded ${events.length} events from ${eventsPath}`);

  const candidates: Candidate[] = [];
  for (const detector of detectors) {
    const produced = runDetector(detector, events);
    console.log(`  [${detector}] ${produced.length} candidate(s) produced`);
    candidates.push(...produced);
  }

  console.log('');
  console.log(`Candidates (${candidates.length}):`);
  if (candidates.length === 0) {
    console.log('  (none)');
  }
  for (const c of candidates) {
    console.log(summarizeCandidate(c));
  }

  const ndjson = candidates.map((c) => JSON.stringify(c)).join('\n') + (candidates.length > 0 ? '\n' : '');
  writeFileSync(outPath, ndjson, 'utf-8');
  console.log('');
  console.log(`Wrote ${candidates.length} candidate(s) → ${outPath}`);
}

main();
