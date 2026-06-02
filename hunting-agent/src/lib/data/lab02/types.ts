export type ConnectionPairId =
  | 'c2-beacon'
  | 'edr-heartbeat'
  | 'm365-keepalive'
  | 'suspicious-pair'
  | 'normal-browsing';

export interface ConnLogEntry {
  ts: string;
  uid: string;
  src_ip: string;
  src_port: number;
  dest_ip: string;
  dest_port: number;
  proto: string;
  service: string;
  duration: number;
  orig_bytes: number;
  resp_bytes: number;
  conn_state: string;
}

export interface SysmonEID3 {
  event_id: 3;
  utc_time: string;
  host: string;
  process_guid: string;
  process_id: number;
  image: string;
  user: string;
  protocol: string;
  initiated: boolean;
  source_ip: string;
  source_port: number;
  destination_ip: string;
  destination_port: number;
}

export interface SysmonEID1 {
  event_id: 1;
  utc_time: string;
  host: string;
  process_guid: string;
  process_id: number;
  image: string;
  command_line: string;
  user: string;
  parent_process_guid: string;
  parent_process_id: number;
  parent_image: string;
}

export interface ProcessTreeNode {
  process_name: string;
  pid: number;
  full_path: string;
  user: string;
  command_line?: string;
  created: string;
  annotation?: {
    icon: 'red-flag' | 'yellow-warning' | 'blue-info' | 'green-check';
    tooltip: string;
  };
  children: ProcessTreeNode[];
}

export interface ScoringBreakdown {
  regularity: number;
  mad_interval: number;
  median_interval: number;
  orig_byte_consistency: number;
  mad_orig_bytes: number;
  median_orig_bytes: number;
  resp_byte_consistency: number;
  mad_resp_bytes: number;
  median_resp_bytes: number;
  duration_consistency: number;
  histogram_score: number;
  consecutive_hours: number;
  composite_score: number;
  beacon_score: number;
}

export interface CompositeWeights {
  regularity: number;
  orig_byte_consistency: number;
  resp_byte_consistency: number;
  duration_consistency: number;
  histogram_score: number;
  consecutive_hours: number;
}

export interface Enrichment {
  threat_intel_match: boolean;
  threat_intel_source: string | null;
  geoip_country: string;
  geoip_asn: string;
  destination_rarity: number;
  first_seen: string;
  lots_match: boolean;
  lots_service?: string | null;
  missing_sni: boolean;
  business_hours_proportion: number;
}

export interface Attribution {
  process_name: string;
  process_id: number;
  process_path: string;
  user: string;
  parent_process: string;
  grandparent_process: string;
  confidence: 'high' | 'partial' | 'none';
}

export interface BeaconCandidate {
  type: 'beacon';
  entity_key: {
    src_ip: string;
    dest_ip: string;
    dest_port: number;
  };
  beacon_score: number;
  scores: ScoringBreakdown;
  connection_count: number;
  median_interval_seconds: number;
  time_window: {
    start: string;
    end: string;
  };
  attribution: Attribution;
  enrichment: Enrichment;
  evidence_count: number;
}

export interface ConnectionPair {
  id: ConnectionPairId;
  label: string;
  description: string;
  sample_conn_log: ConnLogEntry[];
  total_connections: number;
  sysmon_eid3: SysmonEID3 | null;
  sysmon_eid1_chain: SysmonEID1[];
  process_tree: ProcessTreeNode;
  scoring: ScoringBreakdown;
  weights: CompositeWeights;
  intervals: number[];
  orig_bytes_values: number[];
  resp_bytes_values: number[];
  duration_values: number[];
  hourly_histogram: number[];
  candidate: BeaconCandidate;
}

export type ConnectionPairMap = Record<ConnectionPairId, ConnectionPair>;
