/**
 * PowerShell Invocation Anomaly config + data-file loaders.
 *
 * Ported from the loader half of
 * aionsec_HUNT/src/pipeline/score/powershell-invocation-anomaly.ts. Resolves
 * the data files relative to this package's `data/` directory. All loaders
 * degrade gracefully (return empty) when a file is absent.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDataLines } from '../util.js';
import {
  basenameFromPath,
  normalizePath,
  type HostAllowlistEntry,
  type ParentTaxonomyEntry,
} from '../scorers/powershell-classifiers.js';

export interface ParentHardExclusionRule {
  source: string;
  regex: string;
}

export interface VendorPairWhitelistEntry {
  parent_process_path_pattern: string;
  command_line_pattern: string;
}

export interface PowerShellInvocationConfig {
  min_dimension_score: number;
  custom_host_correlation_window_ms: number;
  hard_parent_exclusions: ParentHardExclusionRule[];
  host_allowlist: Map<string, HostAllowlistEntry[]>;
  parent_taxonomy: Map<string, ParentTaxonomyEntry>;
  vendor_pairs: VendorPairWhitelistEntry[];
}

// Package data dir: <package root>/data
const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../data');

const HARD_EXCLUSIONS_PATH = join(DATA_DIR, 'parent-hard-exclusions.json');
const HOST_ALLOWLIST_PATH = join(DATA_DIR, 'host-allowlist.json');
const PARENT_TAXONOMY_PATH = join(DATA_DIR, 'parent-taxonomy.csv');
const VENDOR_PAIRS_PATH = join(DATA_DIR, 'powershell-invocation-vendor-pairs.csv');

function buildBaseConfig(): PowerShellInvocationConfig {
  return {
    min_dimension_score: 0.30,
    custom_host_correlation_window_ms: 30_000,
    hard_parent_exclusions: [],
    host_allowlist: new Map<string, HostAllowlistEntry[]>(),
    parent_taxonomy: new Map<string, ParentTaxonomyEntry>(),
    vendor_pairs: [],
  };
}

function ensureAnchoredRegex(regex: string): void {
  const trimmed = regex.trim();
  if (!trimmed.startsWith('^') || !trimmed.endsWith('$')) {
    throw new Error(`Unanchored hard-exclusion regex (must be ^...$): ${regex}`);
  }
}

export function loadParentHardExclusionsFile(path: string): ParentHardExclusionRule[] {
  if (!existsSync(path)) return [];
  const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Array<{ source?: string; regex?: string }>;
  const out: ParentHardExclusionRule[] = [];
  for (const item of parsed) {
    const source = (item.source ?? '').trim();
    const regex = (item.regex ?? '').trim();
    if (source.length === 0 || regex.length === 0) continue;
    ensureAnchoredRegex(regex);
    out.push({ source, regex });
  }
  return out;
}

export function loadHostAllowlistFile(path: string): Map<string, HostAllowlistEntry[]> {
  if (!existsSync(path)) return new Map<string, HostAllowlistEntry[]>();
  const parsed = JSON.parse(readFileSync(path, 'utf-8')) as HostAllowlistEntry[];
  const out = new Map<string, HostAllowlistEntry[]>();
  for (const entry of parsed) {
    const normalizedName = basenameFromPath(entry.process_name);
    if (normalizedName.length === 0) continue;
    const normalizedEntry: HostAllowlistEntry = {
      ...entry,
      process_name: normalizedName,
      path_prefix: entry.path_prefix ? normalizePath(entry.path_prefix) : undefined,
    };
    const bucket = out.get(normalizedName) ?? [];
    bucket.push(normalizedEntry);
    out.set(normalizedName, bucket);
  }
  return out;
}

export function loadParentTaxonomyFile(path: string): Map<string, ParentTaxonomyEntry> {
  if (!existsSync(path)) return new Map<string, ParentTaxonomyEntry>();
  const out = new Map<string, ParentTaxonomyEntry>();
  for (const line of parseDataLines(readFileSync(path, 'utf-8'))) {
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const parentBasename = basenameFromPath(parts[0]);
    const category = parts[1].trim() as ParentTaxonomyEntry['category'];
    const score = Number.parseFloat(parts[2].trim());
    if (parentBasename.length === 0 || !Number.isFinite(score)) continue;
    out.set(parentBasename, {
      parent_basename: parentBasename,
      category,
      score: Math.max(0, Math.min(1, score)),
    });
  }
  return out;
}

function normalizePattern(value: string): string {
  return value.trim().replace(/\//g, '\\').toLowerCase();
}

export function loadVendorPairWhitelistFile(path: string): VendorPairWhitelistEntry[] {
  if (!existsSync(path)) return [];
  const out: VendorPairWhitelistEntry[] = [];
  for (const line of parseDataLines(readFileSync(path, 'utf-8'))) {
    const parts = line.split(',');
    if (parts.length < 2) continue;
    const parentPattern = normalizePattern(parts[0]);
    const cmdPattern = normalizePattern(parts.slice(1).join(','));
    if (parentPattern.length === 0 || cmdPattern.length === 0) continue;
    out.push({ parent_process_path_pattern: parentPattern, command_line_pattern: cmdPattern });
  }
  return out;
}

export function loadPowerShellInvocationConfig(): PowerShellInvocationConfig {
  const config = buildBaseConfig();
  config.hard_parent_exclusions = loadParentHardExclusionsFile(HARD_EXCLUSIONS_PATH);
  config.host_allowlist = loadHostAllowlistFile(HOST_ALLOWLIST_PATH);
  config.parent_taxonomy = loadParentTaxonomyFile(PARENT_TAXONOMY_PATH);
  config.vendor_pairs = loadVendorPairWhitelistFile(VENDOR_PAIRS_PATH);
  return config;
}

export const DEFAULT_POWERSHELL_INVOCATION_CONFIG: PowerShellInvocationConfig = (() => {
  try {
    return loadPowerShellInvocationConfig();
  } catch {
    return buildBaseConfig();
  }
})();
