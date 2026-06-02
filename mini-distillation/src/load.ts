/**
 * Event loading + filtering.
 *
 * Accepts either a JSON array of events or NDJSON (one JSON object per line).
 * Mirrors the validation in aionsec_HUNT/src/types/events.ts loadEvents():
 * each event needs a non-empty `source`, `event_type`, and a parseable
 * `timestamp`; a synthetic `id` is generated when missing.
 */

import { readFileSync } from 'node:fs';
import type {
  ConnLogEvent,
  TlsSslEvent,
  TelemetryEvent,
} from './types.js';
import { isImageLoadEventType, isProcessCreateEventType } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasNonEmptyString(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0;
}

function hasValidTimestamp(record: Record<string, unknown>): boolean {
  const value = record.timestamp;
  return typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function hasRequiredFields(record: Record<string, unknown>): boolean {
  return hasNonEmptyString(record, 'source')
    && hasNonEmptyString(record, 'event_type')
    && hasValidTimestamp(record);
}

function parsePayload(raw: string, path: string): unknown[] {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return [];

  // JSON array
  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error(`events file must contain a JSON array or NDJSON: ${path}`);
    }
    return parsed;
  }

  // NDJSON — one object per (non-empty) line
  const out: unknown[] = [];
  for (const line of trimmed.split('\n')) {
    const t = line.trim();
    if (t.length === 0) continue;
    out.push(JSON.parse(t));
  }
  return out;
}

export function loadEvents(path: string): TelemetryEvent[] {
  const raw = readFileSync(path, 'utf-8');
  const parsed = parsePayload(raw, path);

  const out: TelemetryEvent[] = [];
  for (let idx = 0; idx < parsed.length; idx += 1) {
    const item = parsed[idx];
    if (!isRecord(item)) continue;
    if (!hasRequiredFields(item)) continue;

    const id = hasNonEmptyString(item, 'id')
      ? String(item.id).trim()
      : `evt-synth-${String(idx + 1).padStart(6, '0')}`;

    out.push({ ...item, id } as TelemetryEvent);
  }
  return out;
}

// ─── Per-scorer filters (match the dispatch in HUNT's index.ts) ───

export function filterConnEvents(events: TelemetryEvent[]): ConnLogEvent[] {
  return events.filter(e => e.source === 'zeek' && e.event_type === 'conn') as unknown as ConnLogEvent[];
}

export function filterTlsEvents(events: TelemetryEvent[]): TlsSslEvent[] {
  return events.filter(e => e.source === 'zeek' && e.event_type === 'ssl') as unknown as TlsSslEvent[];
}

export function filterPowerShellEvents(events: TelemetryEvent[]): TelemetryEvent[] {
  return events.filter(e =>
    e.source === 'sysmon'
    && (isProcessCreateEventType(e.event_type) || isImageLoadEventType(e.event_type)));
}
