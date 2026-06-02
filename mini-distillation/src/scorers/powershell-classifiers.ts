/**
 * PowerShell command-line tokenizer + dimension classifiers.
 *
 * Ported verbatim (logic + thresholds) from aionsec_HUNT:
 *   - src/pipeline/score/powershell-cmdline-tokenizer.ts
 *   - src/pipeline/score/powershell-invocation-anomaly-classifiers.ts
 *
 * Four independent suspicion dimensions, each in [0, 1]:
 *   rename       — process masquerading as a renamed PowerShell binary
 *   custom_host  — non-standard process hosting the PowerShell engine (S.M.A.dll)
 *   parent       — suspicious parent process (taxonomy lookup)
 *   commandline  — offensive flag combinations (encoded, hidden, bypass, ...)
 */

import type {
  PowerShellInvocationCmdlineClassification,
  PowerShellInvocationDataQualityFlag,
  PowerShellInvocationDominantDimension,
  PowerShellInvocationHostCategory,
  PowerShellInvocationParentCategory,
} from '../types.js';

// ════════════════════════════════════════════════════════════
// Tokenizer
// ════════════════════════════════════════════════════════════

export interface TokenizedPowerShellCommandLine {
  raw_tokens: string[];
  canonical_flags: string[];
  parameter_values: Map<string, string[]>;
}

interface PowerShellParameterDefinition {
  canonical: string;
  key: string;
  takes_value: boolean;
}

const UNICODE_DASH_CHARS = '–—―';
const PARAM_PREFIX_RE = new RegExp(`^[-/${UNICODE_DASH_CHARS}]`);
const PARAM_STRIP_RE = new RegExp(`^[-/${UNICODE_DASH_CHARS}]+`);

const PARAMETER_DEFINITIONS: PowerShellParameterDefinition[] = [
  { canonical: 'NoProfile', key: 'noprofile', takes_value: false },
  { canonical: 'WindowStyle', key: 'windowstyle', takes_value: true },
  { canonical: 'NonInteractive', key: 'noninteractive', takes_value: false },
  { canonical: 'ExecutionPolicy', key: 'executionpolicy', takes_value: true },
  { canonical: 'EncodedCommand', key: 'encodedcommand', takes_value: true },
  { canonical: 'STA', key: 'sta', takes_value: false },
  { canonical: 'Version', key: 'version', takes_value: true },
  { canonical: 'Command', key: 'command', takes_value: true },
  { canonical: 'NoExit', key: 'noexit', takes_value: false },
];

const PARAMETER_ALIAS: Record<string, string> = {
  nop: 'NoProfile',
  noni: 'NonInteractive',
  w: 'WindowStyle',
  ep: 'ExecutionPolicy',
  enc: 'EncodedCommand',
  e: 'EncodedCommand',
  v: 'Version',
};

function normalizeTokenDashPrefix(token: string): string {
  if (token.length === 0) return token;
  return token.replace(PARAM_STRIP_RE, '-');
}

function isParameterToken(token: string): boolean {
  return PARAM_PREFIX_RE.test(token);
}

function resolveCanonicalParameter(rawName: string): PowerShellParameterDefinition | null {
  const normalized = rawName.trim().toLowerCase();
  if (normalized.length === 0) return null;

  const aliasHit = PARAMETER_ALIAS[normalized];
  if (aliasHit) {
    return PARAMETER_DEFINITIONS.find((def) => def.canonical === aliasHit) ?? null;
  }

  const matches = PARAMETER_DEFINITIONS.filter((def) => def.key.startsWith(normalized));
  if (matches.length !== 1) return null;
  return matches[0];
}

function normalizeParameterValue(value: string): string {
  return value.trim().toLowerCase();
}

function pushUnique(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}

function addParameterValue(map: Map<string, string[]>, key: string, value: string): void {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}

export function splitPowerShellCommandLine(commandLine: string): string[] {
  const out: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < commandLine.length; i += 1) {
    const ch = commandLine[i];

    if (escaped) { current += ch; escaped = false; continue; }
    if (inDouble && ch === '`') { escaped = true; continue; }
    if (!inDouble && ch === '\'') { inSingle = !inSingle; continue; }
    if (!inSingle && ch === '"') { inDouble = !inDouble; continue; }

    if (!inSingle && !inDouble && /\s/.test(ch)) {
      if (current.length > 0) { out.push(current); current = ''; }
      continue;
    }

    current += ch;
  }

  if (current.length > 0) out.push(current);
  return out;
}

export function tokenizePowerShellCommandLine(commandLine: string): TokenizedPowerShellCommandLine {
  const rawTokens = splitPowerShellCommandLine(commandLine ?? '');
  const canonicalFlags: string[] = [];
  const parameterValues = new Map<string, string[]>();

  for (let i = 0; i < rawTokens.length; i += 1) {
    const rawToken = rawTokens[i];
    if (!isParameterToken(rawToken)) continue;

    const normalizedPrefix = normalizeTokenDashPrefix(rawToken);
    const stripped = normalizedPrefix.replace(/^-+/, '');
    if (stripped.length === 0) continue;

    let name = stripped;
    let inlineValue: string | null = null;
    const colonIdx = stripped.indexOf(':');
    const equalsIdx = stripped.indexOf('=');
    const splitIdx = [colonIdx, equalsIdx]
      .filter((idx) => idx > 0)
      .sort((left, right) => left - right)[0] ?? -1;
    if (splitIdx > 0) {
      name = stripped.slice(0, splitIdx);
      inlineValue = stripped.slice(splitIdx + 1);
    }

    const resolved = resolveCanonicalParameter(name);
    if (!resolved) continue;

    let value: string | null = inlineValue;
    if (resolved.takes_value && !value) {
      const nextToken = rawTokens[i + 1];
      if (nextToken && !isParameterToken(nextToken)) {
        value = nextToken;
        i += 1;
      }
    }

    if (value !== null) {
      addParameterValue(parameterValues, resolved.canonical, value);
    }

    if (resolved.canonical === 'WindowStyle' && value) {
      pushUnique(canonicalFlags, `WindowStyle:${normalizeParameterValue(value)}`);
      continue;
    }
    if (resolved.canonical === 'ExecutionPolicy' && value) {
      pushUnique(canonicalFlags, `ExecutionPolicy:${normalizeParameterValue(value)}`);
      continue;
    }
    if (resolved.canonical === 'Version' && value) {
      pushUnique(canonicalFlags, `Version:${normalizeParameterValue(value)}`);
      continue;
    }

    pushUnique(canonicalFlags, resolved.canonical);
  }

  return { raw_tokens: rawTokens, canonical_flags: canonicalFlags, parameter_values: parameterValues };
}

export function hasCanonicalFlag(tokens: TokenizedPowerShellCommandLine, canonical: string): boolean {
  return tokens.canonical_flags.includes(canonical);
}

export function getParameterValues(tokens: TokenizedPowerShellCommandLine, canonical: string): string[] {
  return [...(tokens.parameter_values.get(canonical) ?? [])];
}

// ════════════════════════════════════════════════════════════
// Classifiers
// ════════════════════════════════════════════════════════════

export interface HostAllowlistEntry {
  process_name: string;
  tier: 'canonical' | 'ms_alternate' | 'vendor_alternate' | 'lolbin';
  category: string;
  path_prefix?: string;
}

export interface ParentTaxonomyEntry {
  parent_basename: string;
  category: PowerShellInvocationParentCategory;
  score: number;
}

export interface RenameClassificationResult {
  score: number;
  force_host_category: PowerShellInvocationHostCategory | null;
  data_quality_flag: PowerShellInvocationDataQualityFlag | null;
}

export interface CustomHostClassificationResult {
  score: number;
  host_category: PowerShellInvocationHostCategory;
}

export interface ParentClassificationResult {
  score: number;
  parent_category: PowerShellInvocationParentCategory;
  data_quality_flag: PowerShellInvocationDataQualityFlag | null;
}

export interface CmdlineClassificationResult {
  score: number;
  cmdline_classification: PowerShellInvocationCmdlineClassification;
  cmdline_flags_detected: string[];
}

const CANONICAL_ORIGINAL_FILE_NAMES = new Set([
  'powershell.exe',
  'pwsh.dll',
  'powershell_ise.exe',
]);

const CANONICAL_HOST_PROCESSES = new Set([
  'powershell.exe',
  'powershell_ise.exe',
  'pwsh.exe',
  'wsmprovhost.exe',
  'winrshost.exe',
]);

export function normalizePath(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\//g, '\\').toLowerCase();
}

export function basenameFromPath(value: string | null | undefined): string {
  const normalized = normalizePath(value);
  if (normalized.length === 0) return '';
  const parts = normalized.split('\\').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : normalized;
}

function isMissingVersionInfo(value: string | null | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.length === 0 || normalized === '-' || normalized === 'unknown';
}

function normalizedStartsWith(value: string | null | undefined, prefix: string): boolean {
  return (value ?? '').trim().toLowerCase().startsWith(prefix.toLowerCase());
}

function normalizeCategoryScore(category: PowerShellInvocationHostCategory): number {
  switch (category) {
    case 'canonical': return 0.0;
    case 'ms_alternate': return 0.10;
    case 'vendor_alternate': return 0.20;
    case 'lolbin': return 0.95;
    case 'unknown': return 0.95;
    case 'renamed': return 0.0;
    default: return 0.95;
  }
}

export function classifyRename(
  processName: string | null | undefined,
  originalFileName: string | null | undefined,
  description: string | null | undefined,
  company: string | null | undefined,
): RenameClassificationResult {
  const processBasename = basenameFromPath(processName);
  const canonicalHost = CANONICAL_HOST_PROCESSES.has(processBasename);
  const originalNormalized = (originalFileName ?? '').trim().toLowerCase();

  if (!canonicalHost && CANONICAL_ORIGINAL_FILE_NAMES.has(originalNormalized)) {
    return { score: 1.0, force_host_category: 'renamed', data_quality_flag: null };
  }

  const missingOriginal = isMissingVersionInfo(originalFileName);
  const fallbackDescriptionMatch = normalizedStartsWith(description, 'windows powershell')
    || normalizedStartsWith(description, 'pwsh');
  const fallbackCompanyMatch = (company ?? '').trim().toLowerCase() === 'microsoft corporation';
  if (!canonicalHost && missingOriginal && fallbackDescriptionMatch && fallbackCompanyMatch) {
    return { score: 0.95, force_host_category: 'renamed', data_quality_flag: null };
  }

  if (missingOriginal && !(fallbackDescriptionMatch && fallbackCompanyMatch)) {
    return { score: 0.0, force_host_category: null, data_quality_flag: 'rename_uncheckable' };
  }

  return { score: 0.0, force_host_category: null, data_quality_flag: null };
}

export function classifyHostCategory(
  processName: string | null | undefined,
  processPath: string | null | undefined,
  hostAllowlist: Map<string, HostAllowlistEntry[]>,
): PowerShellInvocationHostCategory {
  const normalizedPath = normalizePath(processPath);
  const processBasename = basenameFromPath(processName) || basenameFromPath(processPath);
  if (processBasename.length === 0) return 'unknown';
  if (CANONICAL_HOST_PROCESSES.has(processBasename)) return 'canonical';

  const entries = hostAllowlist.get(processBasename) ?? [];
  for (const entry of entries) {
    const prefix = normalizePath(entry.path_prefix ?? '');
    if (prefix.length > 0 && !normalizedPath.startsWith(prefix)) continue;
    return entry.tier;
  }

  return 'unknown';
}

export function classifyCustomHost(
  processName: string | null | undefined,
  processPath: string | null | undefined,
  hostAllowlist: Map<string, HostAllowlistEntry[]>,
  smaDllLoaded: boolean,
  forcedHostCategory: PowerShellInvocationHostCategory | null,
): CustomHostClassificationResult {
  if (forcedHostCategory === 'renamed') {
    return { score: 0.0, host_category: 'renamed' };
  }

  const hostCategory = classifyHostCategory(processName, processPath, hostAllowlist);
  if (!smaDllLoaded) {
    return { score: 0.0, host_category: hostCategory };
  }

  return { score: normalizeCategoryScore(hostCategory), host_category: hostCategory };
}

export function classifyParent(
  parentProcessName: string | null | undefined,
  parentProcessPath: string | null | undefined,
  commandLine: string | null | undefined,
  parentTaxonomy: Map<string, ParentTaxonomyEntry>,
): ParentClassificationResult {
  const parentBasename = basenameFromPath(parentProcessName) || basenameFromPath(parentProcessPath);
  if (parentBasename.length === 0) {
    return { score: 0.0, parent_category: 'unknown', data_quality_flag: 'parent_uncheckable' };
  }

  if (parentBasename === 'services.exe') {
    return { score: 0.50, parent_category: 'service_host', data_quality_flag: null };
  }

  if (parentBasename === 'wmiprvse.exe') {
    const parentPath = normalizePath(parentProcessPath);
    const cmdLower = normalizePath(commandLine);
    const lowRisk = parentPath.includes('\\windows\\ccm\\')
      || cmdLower.includes('appvclient')
      || cmdLower.includes('winrm');
    return { score: lowRisk ? 0.0 : 0.50, parent_category: 'service_host', data_quality_flag: null };
  }

  const taxonomyEntry = parentTaxonomy.get(parentBasename);
  if (taxonomyEntry) {
    return { score: taxonomyEntry.score, parent_category: taxonomyEntry.category, data_quality_flag: null };
  }

  return { score: 0.30, parent_category: 'unknown', data_quality_flag: null };
}

function isWindowStyleHidden(values: string[]): boolean {
  return values.some((value) => {
    const normalized = value.trim().toLowerCase();
    return normalized === 'hidden' || normalized === '1';
  });
}

function isExecutionPolicyBypass(values: string[]): boolean {
  return values.some((value) => value.trim().toLowerCase() === 'bypass');
}

function hasVersion2(values: string[]): boolean {
  return values.some((value) => value.trim().toLowerCase().startsWith('2'));
}

export function classifyCommandLine(commandLine: string | null | undefined): CmdlineClassificationResult {
  const tokenized = tokenizePowerShellCommandLine(commandLine ?? '');
  const encodedValues = getParameterValues(tokenized, 'EncodedCommand');
  const windowStyleValues = getParameterValues(tokenized, 'WindowStyle');
  const executionPolicyValues = getParameterValues(tokenized, 'ExecutionPolicy');
  const versionValues = getParameterValues(tokenized, 'Version');

  const hasNoProfile = hasCanonicalFlag(tokenized, 'NoProfile');
  const hasSta = hasCanonicalFlag(tokenized, 'STA');
  const hasNonInteractive = hasCanonicalFlag(tokenized, 'NonInteractive');
  const hasEncoded = hasCanonicalFlag(tokenized, 'EncodedCommand');
  const hasHiddenWindow = isWindowStyleHidden(windowStyleValues);
  const hasEpBypass = isExecutionPolicyBypass(executionPolicyValues);
  const downgradeV2 = hasVersion2(versionValues);
  const encodedLongEnough = encodedValues.some((value) => value.trim().length >= 5);

  const suspiciousFlags = [hasNoProfile, hasHiddenWindow, hasNonInteractive, hasEpBypass, hasEncoded, hasSta];
  const suspiciousCount = suspiciousFlags.filter(Boolean).length;

  const tier1Fingerprint = hasEncoded && hasNoProfile && hasSta && hasHiddenWindow;
  if (tier1Fingerprint || downgradeV2) {
    return { score: 1.0, cmdline_classification: 'tier_1_offensive_fingerprint', cmdline_flags_detected: tokenized.canonical_flags };
  }
  if (suspiciousCount >= 3) {
    return { score: 0.90, cmdline_classification: 'tier_2_combination', cmdline_flags_detected: tokenized.canonical_flags };
  }
  if (hasEncoded && encodedLongEnough && (hasNoProfile || hasHiddenWindow || hasNonInteractive || hasEpBypass)) {
    return { score: 0.75, cmdline_classification: 'tier_3_encoded_with_other', cmdline_flags_detected: tokenized.canonical_flags };
  }
  if (hasHiddenWindow && (hasEncoded || hasNonInteractive)) {
    return { score: 0.60, cmdline_classification: 'tier_4_partial_shape', cmdline_flags_detected: tokenized.canonical_flags };
  }
  if (hasEncoded && encodedLongEnough && suspiciousCount === 1) {
    return { score: 0.40, cmdline_classification: 'tier_5_encoded_alone', cmdline_flags_detected: tokenized.canonical_flags };
  }

  return { score: 0.0, cmdline_classification: 'benign', cmdline_flags_detected: tokenized.canonical_flags };
}

export function dominantDimension(
  renameSuspicion: number,
  customHostSuspicion: number,
  parentSuspicion: number,
  commandlineSuspicion: number,
): PowerShellInvocationDominantDimension {
  const composite = Math.max(renameSuspicion, customHostSuspicion, parentSuspicion, commandlineSuspicion);
  if (composite <= 0) return 'none';
  if (renameSuspicion === composite) return 'rename';
  if (customHostSuspicion === composite) return 'custom_host';
  if (parentSuspicion === composite) return 'parent';
  return 'commandline';
}
