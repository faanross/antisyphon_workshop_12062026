/**
 * Shared utilities: IP classification, deterministic candidate IDs, and a
 * tiny CSV/feed line parser.
 *
 * The deterministic-id logic is ported from aionsec_HUNT's shared-utils
 * (canonical-json.ts + deterministic-identity.ts + candidate-id.ts), trimmed
 * into one file. Same canonicalization → same SHA-256 → same ID, so candidate
 * IDs here match the full system's scheme.
 */

import { createHash } from 'node:crypto';

// ─── IP classification (from utils/ip.ts) ───────────────────

export function isRfc1918(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p))) return false;

  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;

  return false;
}

// ─── Deterministic candidate IDs ────────────────────────────

const ROUNDING_DECIMALS = 6;
const ROUNDING_FACTOR = 10 ** ROUNDING_DECIMALS;

function roundNumber(value: number): number {
  if (!Number.isFinite(value)) return value;
  return Math.round(value * ROUNDING_FACTOR) / ROUNDING_FACTOR;
}

/**
 * Recursively normalize a value for deterministic identity:
 * - numbers rounded to 6 decimals
 * - object keys sorted
 * - array elements normalized then sorted by their canonical serialization
 * - undefined values dropped
 */
function normalizeForDeterministicIdentity(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'number') {
    return roundNumber(value);
  }

  if (Array.isArray(value)) {
    const normalizedItems = value.map((item) => normalizeForDeterministicIdentity(item));
    return normalizedItems.sort((left, right) => {
      const leftSerialized = canonicalJson(left);
      const rightSerialized = canonicalJson(right);
      return leftSerialized.localeCompare(rightSerialized);
    });
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort((left, right) => left.localeCompare(right))) {
      const normalized = normalizeForDeterministicIdentity(record[key]);
      if (normalized !== undefined) {
        out[key] = normalized;
      }
    }
    return out;
  }

  return value;
}

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256HexForDeterministicIdentity(value: unknown): string {
  const canonical = canonicalJson(normalizeForDeterministicIdentity(value));
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function generateDeterministicCandidateId(prefix: string, payload: Record<string, unknown>): string {
  return `${prefix}-${sha256HexForDeterministicIdentity(payload).slice(0, 16)}`;
}

/**
 * Assign a deterministic SHA-256-derived candidate_id to each candidate.
 * The id is computed over the payload with candidate_id excluded.
 */
export function assignDeterministicCandidateIds<T extends { candidate_id: string }>(
  prefix: string,
  candidates: readonly T[],
): T[] {
  return candidates.map((candidate) => {
    const { candidate_id: _ignored, ...payload } = candidate as T & Record<string, unknown>;
    return {
      ...payload,
      candidate_id: generateDeterministicCandidateId(prefix, payload),
    } as T;
  });
}

// ─── Tiny CSV / feed parser ─────────────────────────────────

/**
 * Split raw text into non-empty, non-comment lines.
 * Strips full-line and inline '#' comments and trims whitespace.
 */
export function parseDataLines(raw: string): string[] {
  const lines: string[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const inlineCommentIdx = trimmed.indexOf('#');
    const withoutComment = inlineCommentIdx === -1
      ? trimmed
      : trimmed.slice(0, inlineCommentIdx).trim();
    if (withoutComment.length > 0) lines.push(withoutComment);
  }
  return lines;
}

/**
 * Load a feed file into a Set of lowercased entries (one per line).
 * Returns an empty Set if the file is absent — feeds degrade gracefully.
 */
export function loadFeedFileToSet(path: string, exists: (p: string) => boolean, read: (p: string) => string): Set<string> {
  if (!exists(path)) return new Set();
  return new Set(parseDataLines(read(path)).map((line) => line.toLowerCase()));
}
