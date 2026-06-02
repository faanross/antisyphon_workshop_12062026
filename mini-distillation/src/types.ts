/**
 * Trimmed event + candidate types.
 *
 * Faithful subset of aionsec_HUNT's src/types/events.ts and src/types/candidates.ts.
 * Only the fields the three ported scorers read/emit are kept. Field names match
 * the full system exactly so candidate output is comparable.
 */

// ─── Events ─────────────────────────────────────────────────

/** Zeek conn.log event — input to the beacon scorer. */
export interface ConnLogEvent {
  id: string;
  timestamp: string;        // ISO 8601
  source: 'zeek';
  event_type: 'conn';
  src_ip: string;
  src_port?: number;
  dest_ip: string;
  dest_port: number;
  proto: string;
  service?: string;
  conn_state?: string;
  duration?: number;        // seconds
  orig_bytes?: number;      // payload bytes out
  resp_bytes?: number;      // payload bytes in
  orig_pkts?: number;
  resp_pkts?: number;
  zeek_uid?: string;
  history?: string;
  [key: string]: unknown;
}

/** Zeek ssl.log event — input to the TLS anomaly scorer. */
export interface TlsSslEvent {
  id: string;
  timestamp: string;
  source: 'zeek';
  event_type: 'ssl';
  src_ip: string;
  dest_ip: string;
  dest_port: number;
  server_name: string | null;
  tls_version: string | null;
  cipher: string | null;
  ja3_hash: string | null;
  ja4_hash: string | null;
  ja3s_hash: string | null;
  ja4x_hash: string | null;
  sni_matches_cert: boolean | null;
  cert_subject: string | null;
  cert_issuer: string | null;
  cert_serial: string | null;
  cert_not_before: string | null;
  cert_not_after: string | null;
  cert_self_signed: boolean;
  cert_expired: boolean;
  cert_validity_days: number | null;
  cert_key_type: string | null;
  cert_key_length: number | null;
  cert_san_dns: string[];
  cert_chain_length: number;
  connection_to_ip: boolean;
  [key: string]: unknown;
}

export const SYSMON_PROCESS_CREATE_EVENT_TYPE = 'process_create' as const;
export const SYSMON_IMAGE_LOAD_EVENT_TYPE = 'image_load' as const;

export function isProcessCreateEventType(value: unknown): value is typeof SYSMON_PROCESS_CREATE_EVENT_TYPE {
  return value === SYSMON_PROCESS_CREATE_EVENT_TYPE;
}
export function isImageLoadEventType(value: unknown): value is typeof SYSMON_IMAGE_LOAD_EVENT_TYPE {
  return value === SYSMON_IMAGE_LOAD_EVENT_TYPE;
}

/** Sysmon Event ID 1 — input to the PowerShell invocation scorer. */
export interface ProcessCreateEvent {
  id: string;
  timestamp: string;
  source: 'sysmon';
  event_type: typeof SYSMON_PROCESS_CREATE_EVENT_TYPE;
  event_id: 1;
  host: string;
  process_name: string;
  process_path: string;
  process_id: number;
  process_guid: string;
  parent_process_name: string;
  parent_process_path: string;
  parent_process_id?: number;
  parent_process_guid: string;
  user: string;
  integrity_level?: string;
  original_file_name: string | null;
  description: string | null;
  product: string | null;
  company: string | null;
  command_line: string;
  [key: string]: unknown;
}

/** Sysmon Event ID 7 — optional corroboration for custom-host scoring. */
export interface ImageLoadEvent {
  id: string;
  timestamp: string;
  source: 'sysmon';
  event_type: typeof SYSMON_IMAGE_LOAD_EVENT_TYPE;
  event_id: 7;
  host: string;
  process_name: string;
  image: string;
  process_id: number;
  process_guid: string;
  image_loaded: string;
  [key: string]: unknown;
}

/** Generic telemetry event — anything loaded from the events file. */
export interface TelemetryEvent {
  id: string;
  timestamp: string;
  source: string;
  event_type: string;
  [key: string]: unknown;
}

// ─── PowerShell classification enums ────────────────────────

export type PowerShellInvocationHostCategory =
  | 'canonical' | 'ms_alternate' | 'vendor_alternate' | 'lolbin' | 'unknown' | 'renamed';

export type PowerShellInvocationParentCategory =
  | 'interactive' | 'script_host' | 'office' | 'lolbin' | 'service_host'
  | 'web_server' | 'browser' | 'wermgr' | 'unknown';

export type PowerShellInvocationCmdlineClassification =
  | 'tier_1_offensive_fingerprint' | 'tier_2_combination' | 'tier_3_encoded_with_other'
  | 'tier_4_partial_shape' | 'tier_5_encoded_alone' | 'benign';

export type PowerShellInvocationDataQualityFlag =
  | 'rename_uncheckable' | 'custom_host_uncheckable' | 'parent_uncheckable';

export type PowerShellInvocationDominantDimension =
  | 'rename' | 'custom_host' | 'parent' | 'commandline' | 'none';

// ─── Candidates ─────────────────────────────────────────────

export interface CandidateEvidence {
  constituent_event_ids: string[];
}

export interface BeaconCandidate {
  candidate_id: string;
  type: 'beacon';
  src_ip: string;
  dest_ip: string;
  dest_port: number;
  time_window_start: string;
  time_window_end: string;

  regularity: number;
  mean_interval_sec: number;
  std_interval_sec: number;
  jitter_mad: number;

  bytes_out_consistency: number;
  bytes_in_consistency: number;
  bytes_out_total: number;
  bytes_in_total: number;
  bytes_ratio: number;

  duration_consistency: number;
  consecutive_hours: number;
  session_count: number;
  time_span_hours: number;

  histogram_cv: number;
  bimodal_score: number;
  histogram_score: number;

  beacon_score: number;

  evidence: CandidateEvidence;
}

export interface TlsAnomalyCandidate {
  candidate_id: string;
  type: 'tls_anomaly';
  time_window_start: string;
  time_window_end: string;
  src_ip: string;
  dest_ip: string;
  dest_port: number;

  cert_anomaly_score: number;
  fingerprint_anomaly_score: number;
  sni_anomaly_score: number;
  tls_anomaly_score: number;

  cert_subject: string | null;
  cert_issuer: string | null;
  cert_serial: string | null;
  cert_validity_days: number | null;
  cert_not_before: string | null;
  cert_not_after: string | null;
  cert_self_signed: boolean;
  cert_expired: boolean;
  cert_key_type: string | null;
  cert_key_length: number | null;
  cert_san_dns: string[];
  cert_chain_length: number;

  ja3_hash: string | null;
  ja4_hash: string | null;
  ja3s_hash: string | null;
  ja4x_hash: string | null;
  ja3_known_bad: boolean;
  ja3s_known_bad: boolean;
  ja3_ja3s_pair_known_bad: boolean;
  ja4x_known_bad: boolean;

  server_name: string | null;
  sni_matches_cert: boolean | null;
  connection_to_ip: boolean;

  tls_version: string | null;
  cipher_suite: string | null;
  total_tls_connections: number;
  session_count: number;

  evidence: CandidateEvidence;
}

export interface PowerShellInvocationAnomalyCandidate {
  candidate_id: string;
  type: 'powershell_invocation_anomaly';
  time_window_start: string;
  time_window_end: string;
  host: string;
  process_guid: string;

  rename_suspicion: number;
  custom_host_suspicion: number;
  parent_suspicion: number;
  commandline_suspicion: number;
  powershell_invocation_anomaly_score: number;

  dominant_dimension: PowerShellInvocationDominantDimension;
  host_category: PowerShellInvocationHostCategory;
  parent_category: PowerShellInvocationParentCategory;
  cmdline_classification: PowerShellInvocationCmdlineClassification;
  cmdline_flags_detected: string[];

  process_name: string | null;
  process_path: string;
  original_file_name: string | null;
  description: string | null;
  product: string | null;
  company: string | null;
  command_line: string;
  user: string;
  process_id: number | null;
  parent_process_name: string;
  parent_process_path: string;
  parent_process_guid: string | null;
  sma_dll_loaded: boolean;
  sma_dll_load_image: string | null;
  data_quality_flags: PowerShellInvocationDataQualityFlag[];

  evidence: CandidateEvidence;
}

export type Candidate = BeaconCandidate | TlsAnomalyCandidate | PowerShellInvocationAnomalyCandidate;
