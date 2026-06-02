/**
 * PowerShell Invocation Anomaly Candidate Scoring.
 *
 * Scores Sysmon Event ID 1 (process_create) events that host the PowerShell
 * engine. Composite = max(rename, custom_host, parent, commandline) suspicion.
 *
 * Ported verbatim (logic + thresholds) from
 * aionsec_HUNT/src/pipeline/score/powershell-invocation-anomaly.ts. Trimmed:
 * config loading moved to ../config/powershell.ts; dropped the empty
 * `enrichment` object. NO fleet rarity needed — uses only the deterministic
 * config data files (parent taxonomy, host allowlist, hard exclusions, vendor
 * pairs).
 */

import { round } from '../stats.js';
import { assignDeterministicCandidateIds } from '../util.js';
import type {
  ImageLoadEvent,
  ProcessCreateEvent,
  TelemetryEvent,
  PowerShellInvocationAnomalyCandidate,
} from '../types.js';
import { isImageLoadEventType, isProcessCreateEventType } from '../types.js';
import {
  basenameFromPath,
  classifyCommandLine,
  classifyCustomHost,
  classifyParent,
  classifyRename,
  dominantDimension,
  normalizePath,
} from './powershell-classifiers.js';
import type {
  PowerShellInvocationConfig,
  ParentHardExclusionRule,
  VendorPairWhitelistEntry,
} from '../config/powershell.js';
import { DEFAULT_POWERSHELL_INVOCATION_CONFIG } from '../config/powershell.js';

const SMA_DLL_NAMES = [
  'system.management.automation.dll',
  'system.management.automation.ni.dll',
];

function normalizePattern(value: string): string {
  return value.trim().replace(/\//g, '\\').toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wildcardContainsMatch(value: string, pattern: string): boolean {
  const normalizedValue = normalizePattern(value);
  const normalizedPattern = normalizePattern(pattern);
  if (normalizedPattern.includes('*')) {
    const regexSource = escapeRegExp(normalizedPattern).replace(/\\\*/g, '.*');
    if (regexSource.length === 0) return false;
    return new RegExp(regexSource, 'i').test(normalizedValue);
  }
  if (normalizedPattern.includes('\\')) return normalizedValue.includes(normalizedPattern);
  return basenameFromPath(normalizedValue) === basenameFromPath(normalizedPattern);
}

function matchesVendorWhitelist(
  parentProcessPath: string,
  commandLine: string,
  vendorPairs: VendorPairWhitelistEntry[],
): boolean {
  return vendorPairs.some((entry) =>
    wildcardContainsMatch(parentProcessPath, entry.parent_process_path_pattern)
    && wildcardContainsMatch(commandLine, entry.command_line_pattern));
}

function matchesHardExclusion(parentProcessPath: string, rules: ParentHardExclusionRule[]): boolean {
  if (parentProcessPath.length === 0) return false;
  return rules.some((rule) => new RegExp(rule.regex, 'i').test(parentProcessPath));
}

function isSmaDllImageLoad(imageLoaded: string): boolean {
  const normalized = normalizePath(imageLoaded);
  return SMA_DLL_NAMES.some((name) => normalized.endsWith(`\\${name}`) || normalized.endsWith(name));
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

interface ParsedProcessCreate {
  id: string;
  timestamp: string;
  host: string;
  process_guid: string;
  process_name: string | null;
  process_path: string;
  process_id: number | null;
  parent_process_name: string | null;
  parent_process_path: string;
  parent_process_guid: string | null;
  user: string;
  original_file_name: string | null;
  description: string | null;
  product: string | null;
  company: string | null;
  command_line: string;
}

function parseProcessCreate(event: ProcessCreateEvent): ParsedProcessCreate | null {
  const host = asString(event.host);
  const processGuid = asString(event.process_guid);
  const timestamp = asString(event.timestamp);
  if (!host || !processGuid || !timestamp) return null;

  return {
    id: event.id,
    timestamp,
    host,
    process_guid: processGuid,
    process_name: asString(event.process_name),
    process_path: asString(event.process_path) ?? '',
    process_id: asNumber(event.process_id),
    parent_process_name: asString(event.parent_process_name),
    parent_process_path: asString(event.parent_process_path) ?? '',
    parent_process_guid: asString(event.parent_process_guid),
    user: asString(event.user) ?? '',
    original_file_name: event.original_file_name ?? null,
    description: event.description ?? null,
    product: event.product ?? null,
    company: event.company ?? null,
    command_line: asString(event.command_line) ?? '',
  };
}

interface ParsedImageLoad {
  id: string;
  timestamp: string;
  host: string;
  process_guid: string;
  image: string;
  image_loaded: string;
}

function parseImageLoad(event: ImageLoadEvent): ParsedImageLoad | null {
  const host = asString(event.host);
  const processGuid = asString(event.process_guid);
  const timestamp = asString(event.timestamp);
  if (!host || !processGuid || !timestamp) return null;

  return {
    id: event.id,
    timestamp,
    host,
    process_guid: processGuid,
    image: asString(event.image) ?? '',
    image_loaded: asString(event.image_loaded) ?? '',
  };
}

function buildImageLoadIndex(imageLoads: ParsedImageLoad[]): Map<string, ParsedImageLoad[]> {
  const out = new Map<string, ParsedImageLoad[]>();
  for (const imageLoad of imageLoads) {
    const key = `${imageLoad.host}\x1f${imageLoad.process_guid}`;
    const bucket = out.get(key) ?? [];
    bucket.push(imageLoad);
    out.set(key, bucket);
  }
  for (const [key, bucket] of out) {
    bucket.sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
    out.set(key, bucket);
  }
  return out;
}

function findCorrelatedSmaLoad(
  processEvent: ParsedProcessCreate,
  imageLoadIndex: Map<string, ParsedImageLoad[]>,
  windowMs: number,
): ParsedImageLoad | null {
  const key = `${processEvent.host}\x1f${processEvent.process_guid}`;
  const entries = imageLoadIndex.get(key) ?? [];
  if (entries.length === 0) return null;

  const processTs = new Date(processEvent.timestamp).getTime();
  let bestMatch: ParsedImageLoad | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const entry of entries) {
    if (!isSmaDllImageLoad(entry.image_loaded)) continue;
    const delta = Math.abs(new Date(entry.timestamp).getTime() - processTs);
    if (delta > windowMs) continue;
    if (delta < bestDelta) {
      bestMatch = entry;
      bestDelta = delta;
    }
  }

  return bestMatch;
}

function uniqueFlags<T extends string>(values: Array<T | null>): T[] {
  const out: T[] = [];
  for (const value of values) {
    if (!value) continue;
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

function parseTimestampMs(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeEvidenceWindow(
  anchorTimestamp: string,
  evidenceIds: ReadonlyArray<string>,
  timestampByEventId: ReadonlyMap<string, string>,
): { start: string; end: string } {
  const anchorMs = parseTimestampMs(anchorTimestamp);
  if (anchorMs === null) {
    return { start: anchorTimestamp, end: anchorTimestamp };
  }

  let minTs = anchorMs;
  let maxTs = anchorMs;

  for (const evidenceId of evidenceIds) {
    const evidenceTimestamp = timestampByEventId.get(evidenceId);
    if (!evidenceTimestamp) continue;
    const evidenceMs = parseTimestampMs(evidenceTimestamp);
    if (evidenceMs === null) continue;
    if (evidenceMs < minTs) minTs = evidenceMs;
    if (evidenceMs > maxTs) maxTs = evidenceMs;
  }

  return { start: new Date(minTs).toISOString(), end: new Date(maxTs).toISOString() };
}

export function scorePowerShellInvocationAnomalyCandidates(
  events: TelemetryEvent[],
  config: PowerShellInvocationConfig = DEFAULT_POWERSHELL_INVOCATION_CONFIG,
): PowerShellInvocationAnomalyCandidate[] {
  const processCreates: ParsedProcessCreate[] = [];
  const imageLoads: ParsedImageLoad[] = [];
  const timestampByEventId = new Map<string, string>();

  for (const event of events) {
    if (event.source !== 'sysmon') continue;

    if (isProcessCreateEventType(event.event_type)) {
      const parsed = parseProcessCreate(event as unknown as ProcessCreateEvent);
      if (parsed) {
        processCreates.push(parsed);
        timestampByEventId.set(parsed.id, parsed.timestamp);
      }
      continue;
    }

    if (isImageLoadEventType(event.event_type)) {
      const parsed = parseImageLoad(event as unknown as ImageLoadEvent);
      if (parsed) {
        imageLoads.push(parsed);
        timestampByEventId.set(parsed.id, parsed.timestamp);
      }
    }
  }

  const imageLoadIndex = buildImageLoadIndex(imageLoads);
  const hasImageLoadTelemetry = imageLoads.length > 0;
  const candidates: PowerShellInvocationAnomalyCandidate[] = [];

  for (const event of processCreates) {
    if (matchesHardExclusion(event.parent_process_path, config.hard_parent_exclusions)) continue;
    if (matchesVendorWhitelist(event.parent_process_path, event.command_line, config.vendor_pairs)) continue;

    const rename = classifyRename(
      event.process_name,
      event.original_file_name,
      event.description,
      event.company,
    );

    const correlatedSmaLoad = findCorrelatedSmaLoad(
      event,
      imageLoadIndex,
      config.custom_host_correlation_window_ms,
    );
    const customHost = classifyCustomHost(
      event.process_name,
      event.process_path,
      config.host_allowlist,
      correlatedSmaLoad !== null,
      rename.force_host_category,
    );

    const parent = classifyParent(
      event.parent_process_name,
      event.parent_process_path,
      event.command_line,
      config.parent_taxonomy,
    );

    const cmdline = classifyCommandLine(event.command_line);
    const dataQualityFlags = uniqueFlags([
      rename.data_quality_flag,
      parent.data_quality_flag,
      !hasImageLoadTelemetry ? 'custom_host_uncheckable' : null,
    ]);

    const composite = Math.max(rename.score, customHost.score, parent.score, cmdline.score);
    if (composite < config.min_dimension_score) continue;

    const dominant = dominantDimension(rename.score, customHost.score, parent.score, cmdline.score);
    const evidenceIds = [event.id];
    if (correlatedSmaLoad && !evidenceIds.includes(correlatedSmaLoad.id)) evidenceIds.push(correlatedSmaLoad.id);
    const window = computeEvidenceWindow(event.timestamp, evidenceIds, timestampByEventId);

    candidates.push({
      candidate_id: '',
      type: 'powershell_invocation_anomaly',
      time_window_start: window.start,
      time_window_end: window.end,
      host: event.host,

      process_guid: event.process_guid,
      rename_suspicion: round(rename.score, 4),
      custom_host_suspicion: round(customHost.score, 4),
      parent_suspicion: round(parent.score, 4),
      commandline_suspicion: round(cmdline.score, 4),
      powershell_invocation_anomaly_score: round(composite, 4),

      dominant_dimension: dominant,
      host_category: customHost.host_category,
      parent_category: parent.parent_category,
      cmdline_classification: cmdline.cmdline_classification,
      cmdline_flags_detected: cmdline.cmdline_flags_detected,

      process_name: event.process_name,
      process_path: event.process_path,
      original_file_name: event.original_file_name,
      description: event.description,
      product: event.product,
      company: event.company,
      command_line: event.command_line,
      user: event.user,
      process_id: event.process_id,
      parent_process_name: event.parent_process_name ?? '',
      parent_process_path: event.parent_process_path,
      parent_process_guid: event.parent_process_guid,
      sma_dll_loaded: correlatedSmaLoad !== null,
      sma_dll_load_image: correlatedSmaLoad?.image ?? null,
      data_quality_flags: dataQualityFlags,

      evidence: { constituent_event_ids: evidenceIds },
    });
  }

  return assignDeterministicCandidateIds('PSI', candidates.sort((left, right) => {
    if (right.powershell_invocation_anomaly_score !== left.powershell_invocation_anomaly_score) {
      return right.powershell_invocation_anomaly_score - left.powershell_invocation_anomaly_score;
    }
    if ((left.host ?? '') !== (right.host ?? '')) return (left.host ?? '').localeCompare(right.host ?? '');
    if (left.time_window_start !== right.time_window_start) return left.time_window_start.localeCompare(right.time_window_start);
    return left.process_guid.localeCompare(right.process_guid);
  }));
}
