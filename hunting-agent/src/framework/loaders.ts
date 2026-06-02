import { readFile } from "node:fs/promises";
import path from "node:path";

export interface Candidate {
  readonly candidate_id: string;
  readonly type: string;
  readonly compositeScore?: number;
  readonly beacon_score?: number;
  readonly src_ip?: string;
  readonly dest_ip?: string;
  readonly host?: string;
  readonly user?: string;
  readonly process_name?: string;
  readonly parent_chain?: readonly string[];
  readonly lots_match?: boolean;
  readonly lots_service?: string | null;
  readonly threat_intel_match?: boolean;
  readonly threat_intel_source?: string | null;
  readonly destination_rarity?: number;
  readonly constituent_event_ids?: readonly string[];
  readonly notes?: string;
  readonly [key: string]: unknown;
}

export interface EventRecord {
  readonly event_id: string;
  readonly event_type: string;
  readonly timestamp: string;
  readonly host: string;
  readonly [key: string]: unknown;
}

async function readJson<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), relativePath);
  return JSON.parse(await readFile(fullPath, "utf8")) as T;
}

export function loadCandidates(): Promise<Candidate[]> {
  return readJson<Candidate[]>("data/candidates_enriched.json");
}

export function loadEvents(): Promise<EventRecord[]> {
  return readJson<EventRecord[]>("data/events_enriched.json");
}
