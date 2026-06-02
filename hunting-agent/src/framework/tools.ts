import { loadCandidates, loadEvents, type Candidate, type EventRecord } from "./loaders.js";

export interface CandidateQuery {
  readonly type?: string;
  readonly minBeaconScore?: number;
  readonly minCompositeScore?: number;
  readonly host?: string;
  readonly destIp?: string;
  readonly processGuid?: string;
  readonly processName?: string;
  readonly candidateIds?: readonly string[];
  readonly limit?: number;
}

export type AgentToolName =
  | "query_candidates"
  | "get_candidate_detail"
  | "get_related_events"
  | "lookup_asset"
  | "lookup_threat_intel"
  | "explain_score";

export type ToolTraceName = AgentToolName | "invalid_tool_decision";

export interface AgentToolCall {
  readonly tool: AgentToolName;
  readonly args: Record<string, unknown>;
}

export interface ToolDefinition {
  readonly name: AgentToolName;
  readonly purpose: string;
  readonly args: readonly string[];
  readonly returns: string;
}

export interface ToolTrace {
  readonly id: string;
  readonly step: number;
  readonly thought: string;
  readonly tool: ToolTraceName;
  readonly args: Record<string, unknown>;
  readonly status: "ok" | "error";
  readonly resultCount: number;
  readonly elapsedMs: number;
  readonly observation: string;
}

export interface ToolExecution {
  readonly trace: ToolTrace;
  readonly results: readonly unknown[];
  readonly candidates: readonly Candidate[];
}

export const LAB03_TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    name: "query_candidates",
    purpose: "Find candidate records by type, score, host, destination, process, or candidate id.",
    args: ["type?", "minBeaconScore?", "minCompositeScore?", "host?", "destIp?", "processGuid?", "processName?", "candidateIds?", "limit?"],
    returns: "Compact candidate rows sorted by score.",
  },
  {
    name: "get_candidate_detail",
    purpose: "Open one candidate when the agent needs attribution, enrichment, score, and evidence ids.",
    args: ["candidateId"],
    returns: "Detailed candidate record with key triage fields.",
  },
  {
    name: "get_related_events",
    purpose: "Retrieve raw supporting events for a candidate after the candidate has been identified.",
    args: ["candidateId", "eventTypes?", "limit?"],
    returns: "Sysmon and connection evidence tied to the candidate.",
  },
  {
    name: "lookup_asset",
    purpose: "Look up host context when process or user role matters.",
    args: ["host?", "srcIp?"],
    returns: "Observed users, processes, candidate count, and inferred asset role.",
  },
  {
    name: "lookup_threat_intel",
    purpose: "Check whether a destination has threat intelligence context.",
    args: ["destIp"],
    returns: "Threat-intel match, source, tags, and related candidates.",
  },
  {
    name: "explain_score",
    purpose: "Inspect why a candidate scored high or low before treating score as maliciousness.",
    args: ["candidateId"],
    returns: "Score dimensions and a short score interpretation.",
  },
];

function score(candidate: Candidate): number {
  return Number(candidate.compositeScore ?? candidate.beacon_score ?? 0);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function clampLimit(value: unknown, fallback: number, max: number): number {
  const parsed = asNumber(value);
  if (parsed === undefined) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

function rawValue(record: EventRecord, key: string): unknown {
  const raw = record.raw;
  if (raw && typeof raw === "object" && key in raw) {
    return (raw as Record<string, unknown>)[key];
  }
  return undefined;
}

function eventProcessGuid(record: EventRecord): string | undefined {
  return asString(rawValue(record, "ProcessGuid"));
}

function eventSummary(event: EventRecord): Record<string, unknown> {
  return {
    id: event.event_id ?? event.id,
    type: event.event_type,
    timestamp: event.timestamp,
    host: event.host,
    src_ip: event.src_ip,
    dest_ip: event.dest_ip,
    image: rawValue(event, "Image"),
    command_line: rawValue(event, "CommandLine"),
    process_guid: rawValue(event, "ProcessGuid"),
    parent_process_guid: rawValue(event, "ParentProcessGuid"),
  };
}

function compactCandidate(candidate: Candidate): Record<string, unknown> {
  return {
    candidate_id: candidate.candidate_id,
    type: candidate.type,
    host: candidate.host,
    src_ip: candidate.src_ip,
    dest_ip: candidate.dest_ip,
    beacon_score: candidate.beacon_score,
    compositeScore: candidate.compositeScore,
    process_name: candidate.process_name,
    parent_chain: candidate.parent_chain,
    lots_match: candidate.lots_match,
    lots_service: candidate.lots_service,
    threat_intel_match: candidate.threat_intel_match,
    threat_intel_source: candidate.threat_intel_source,
    threat_intel_tags: candidate.threat_intel_tags,
    destination_rarity: candidate.destination_rarity,
    destination_hosts_count: candidate.destination_hosts_count,
    notes: candidate.notes,
  };
}

function detailedCandidate(candidate: Candidate): Record<string, unknown> {
  return {
    ...compactCandidate(candidate),
    user: candidate.user,
    process_guid: candidate.process_guid,
    process_path: candidate.process_path,
    parent_process: candidate.parent_process,
    parent_process_path: candidate.parent_process_path,
    connection_count: candidate.connection_count,
    median_interval_seconds: candidate.median_interval_seconds,
    regularity: candidate.regularity,
    duration_consistency: candidate.duration_consistency,
    bytes_out_consistency: candidate.bytes_out_consistency,
    bytes_in_consistency: candidate.bytes_in_consistency,
    histogram_score: candidate.histogram_score,
    consecutive_hours: candidate.consecutive_hours,
    first_seen: candidate.first_seen,
    geoip_country: candidate.geoip_country,
    geoip_asn: candidate.geoip_asn,
    constituent_event_ids: candidate.constituent_event_ids,
  };
}

function candidateById(candidates: readonly Candidate[], candidateId: string): Candidate {
  const candidate = candidates.find((item) => item.candidate_id === candidateId);
  if (!candidate) throw new Error(`Unknown candidateId: ${candidateId}`);
  return candidate;
}

function candidateIdsFromQuery(value: unknown): readonly string[] | undefined {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return asStringArray(value);
}

function queryFromArgs(args: Record<string, unknown>): CandidateQuery {
  return {
    type: asString(args.type),
    minBeaconScore: asNumber(args.minBeaconScore),
    minCompositeScore: asNumber(args.minCompositeScore),
    host: asString(args.host),
    destIp: asString(args.destIp),
    processGuid: asString(args.processGuid),
    processName: asString(args.processName),
    candidateIds: candidateIdsFromQuery(args.candidateIds),
    limit: clampLimit(args.limit, 10, 25),
  };
}

function makeTrace(input: {
  readonly step: number;
  readonly thought: string;
  readonly tool: ToolTraceName;
  readonly args: Record<string, unknown>;
  readonly status: "ok" | "error";
  readonly resultCount: number;
  readonly elapsedMs: number;
  readonly observation: string;
}): ToolTrace {
  return {
    id: `tool-${Date.now()}-${input.step}-${Math.random().toString(36).slice(2)}`,
    ...input,
  };
}

function inferAssetRole(host: string | undefined): string {
  if (!host) return "unknown";
  if (host.startsWith("DEV-WS")) return "developer workstation";
  if (host.startsWith("EDR") || host.includes("SEC")) return "security infrastructure";
  return "workstation";
}

function summarizeEventTypes(events: readonly EventRecord[]): string {
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.event_type, (counts.get(event.event_type) ?? 0) + 1);
  return [...counts.entries()].map(([type, count]) => `${type}=${count}`).join(", ");
}

export function renderToolCatalog(): string {
  return LAB03_TOOL_DEFINITIONS
    .map((tool) => [
      `- ${tool.name}`,
      `  purpose: ${tool.purpose}`,
      `  args: ${tool.args.join(", ")}`,
      `  returns: ${tool.returns}`,
    ].join("\n"))
    .join("\n");
}

export async function queryCandidates(query: CandidateQuery = {}): Promise<Candidate[]> {
  const limit = query.limit ?? 25;
  const candidates = await loadCandidates();
  return candidates
    .filter((candidate) => {
      if (query.type && candidate.type !== query.type) return false;
      if (query.host && candidate.host !== query.host) return false;
      if (query.destIp && candidate.dest_ip !== query.destIp) return false;
      if (query.processGuid && candidate.process_guid !== query.processGuid) return false;
      if (query.processName && candidate.process_name !== query.processName) return false;
      if (query.candidateIds && !query.candidateIds.includes(candidate.candidate_id)) return false;
      if (query.minBeaconScore !== undefined && Number(candidate.beacon_score ?? 0) < query.minBeaconScore) return false;
      if (query.minCompositeScore !== undefined && score(candidate) < query.minCompositeScore) return false;
      return true;
    })
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}

export function summarizeCandidate(candidate: Candidate): string {
  const signals = [
    `${candidate.candidate_id} (${candidate.type})`,
    candidate.dest_ip ? `dest=${candidate.dest_ip}` : undefined,
    `score=${score(candidate).toFixed(2)}`,
    candidate.lots_match ? `LOTS=${candidate.lots_service ?? "true"}` : "LOTS=false",
    candidate.threat_intel_match ? `intel=${candidate.threat_intel_source ?? "match"}` : "intel=false",
    candidate.process_name ? `process=${candidate.process_name}` : undefined,
  ].filter(Boolean);
  return signals.join(" | ");
}

export async function executeQueryCandidates(query: CandidateQuery = {}): Promise<{
  trace: ToolTrace;
  results: Candidate[];
}> {
  const started = performance.now();
  const results = await queryCandidates(query);
  const elapsedMs = Math.round(performance.now() - started);
  return {
    trace: makeTrace({
      step: 0,
      thought: "Compatibility wrapper executed query_candidates directly.",
      tool: "query_candidates",
      args: { ...query },
      status: "ok",
      resultCount: results.length,
      elapsedMs,
      observation: `query_candidates returned ${results.length} candidate(s).`,
    }),
    results,
  };
}

export async function executeAgentToolCall(
  call: AgentToolCall,
  step: number,
  thought: string,
): Promise<ToolExecution> {
  const started = performance.now();
  try {
    const candidates = await loadCandidates();
    const args = call.args ?? {};
    let results: readonly unknown[] = [];
    let visibleCandidates: readonly Candidate[] = [];
    let observation = "";

    if (call.tool === "query_candidates") {
      const query = queryFromArgs(args);
      const matched = await queryCandidates(query);
      results = matched.map(compactCandidate);
      visibleCandidates = matched;
      observation = matched.length > 0
        ? `Found ${matched.length} candidate(s): ${matched.map(summarizeCandidate).join("; ")}`
        : "No candidates matched the requested filters.";
    } else if (call.tool === "get_candidate_detail") {
      const candidateId = asString(args.candidateId);
      if (!candidateId) throw new Error("get_candidate_detail requires candidateId");
      const candidate = candidateById(candidates, candidateId);
      results = [detailedCandidate(candidate)];
      visibleCandidates = [candidate];
      observation = `${candidate.candidate_id}: score=${score(candidate).toFixed(2)}, process=${candidate.process_name}, LOTS=${candidate.lots_match ? candidate.lots_service ?? "true" : "false"}, intel=${candidate.threat_intel_match ? candidate.threat_intel_source ?? "match" : "false"}.`;
    } else if (call.tool === "get_related_events") {
      const candidateId = asString(args.candidateId);
      if (!candidateId) throw new Error("get_related_events requires candidateId");
      const candidate = candidateById(candidates, candidateId);
      const allowedIds = new Set(candidate.constituent_event_ids ?? []);
      const eventTypes = new Set(asStringArray(args.eventTypes) ?? []);
      const limit = clampLimit(args.limit, 12, 30);
      const events = (await loadEvents())
        .filter((event) => allowedIds.has(event.event_id ?? event.id))
        .filter((event) => eventTypes.size === 0 || eventTypes.has(event.event_type))
        .slice(0, limit);
      results = events.map(eventSummary);
      visibleCandidates = [candidate];
      observation = events.length > 0
        ? `${candidateId} has ${events.length} related event(s): ${summarizeEventTypes(events)}.`
        : `${candidateId} has no related events for the requested filter.`;
    } else if (call.tool === "lookup_asset") {
      const host = asString(args.host);
      const srcIp = asString(args.srcIp);
      const related = candidates.filter((candidate) =>
        (host && candidate.host === host) || (srcIp && candidate.src_ip === srcIp)
      );
      const assetHost = host ?? related[0]?.host;
      results = [{
        host: assetHost,
        src_ip: srcIp ?? related[0]?.src_ip,
        inferred_role: inferAssetRole(assetHost),
        observed_users: [...new Set(related.map((candidate) => candidate.user).filter(Boolean))],
        observed_processes: [...new Set(related.map((candidate) => candidate.process_name).filter(Boolean))],
        candidate_ids: related.map((candidate) => candidate.candidate_id),
        candidate_count: related.length,
      }];
      visibleCandidates = related;
      observation = related.length > 0
        ? `${assetHost ?? srcIp} appears as ${inferAssetRole(assetHost)} with ${related.length} candidate(s) and processes: ${[...new Set(related.map((candidate) => candidate.process_name).filter(Boolean))].join(", ")}.`
        : `No asset context found for ${host ?? srcIp ?? "the requested asset"}.`;
    } else if (call.tool === "lookup_threat_intel") {
      const destIp = asString(args.destIp);
      if (!destIp) throw new Error("lookup_threat_intel requires destIp");
      const related = candidates.filter((candidate) => candidate.dest_ip === destIp);
      const intelCarrier = related.find((candidate) => candidate.threat_intel_match) ?? related[0];
      results = [{
        dest_ip: destIp,
        match: Boolean(intelCarrier?.threat_intel_match),
        source: intelCarrier?.threat_intel_source ?? null,
        tags: intelCarrier?.threat_intel_tags ?? [],
        related_candidate_ids: related.map((candidate) => candidate.candidate_id),
        first_seen: intelCarrier?.first_seen,
        geoip_country: intelCarrier?.geoip_country,
        geoip_asn: intelCarrier?.geoip_asn,
      }];
      visibleCandidates = related;
      observation = intelCarrier?.threat_intel_match
        ? `${destIp} has threat-intel match from ${intelCarrier.threat_intel_source ?? "unknown source"} with tags ${(intelCarrier.threat_intel_tags as readonly string[] | undefined)?.join(", ") ?? "none"}.`
        : `${destIp} has no threat-intel match in the local fixture.`;
    } else if (call.tool === "explain_score") {
      const candidateId = asString(args.candidateId);
      if (!candidateId) throw new Error("explain_score requires candidateId");
      const candidate = candidateById(candidates, candidateId);
      results = [{
        candidate_id: candidate.candidate_id,
        beacon_score: candidate.beacon_score,
        compositeScore: candidate.compositeScore,
        regularity: candidate.regularity,
        interval_mad_seconds: candidate.interval_mad_seconds ?? candidate.interval_mad,
        median_interval_seconds: candidate.median_interval_seconds,
        bytes_out_consistency: candidate.bytes_out_consistency,
        bytes_in_consistency: candidate.bytes_in_consistency,
        duration_consistency: candidate.duration_consistency,
        histogram_score: candidate.histogram_score,
        consecutive_hours: candidate.consecutive_hours,
        interpretation: "High score means regularity and consistency. It is not a maliciousness verdict without enrichment and attribution.",
      }];
      visibleCandidates = [candidate];
      observation = `${candidateId} score=${score(candidate).toFixed(2)}: regularity=${candidate.regularity}, byte consistency=${candidate.bytes_out_consistency}/${candidate.bytes_in_consistency}, duration=${candidate.duration_consistency}; score indicates beacon shape, not intent.`;
    }

    return {
      trace: makeTrace({
        step,
        thought,
        tool: call.tool,
        args,
        status: "ok",
        resultCount: results.length,
        elapsedMs: Math.round(performance.now() - started),
        observation,
      }),
      results,
      candidates: visibleCandidates,
    };
  } catch (error) {
    return {
      trace: makeTrace({
        step,
        thought,
        tool: call.tool,
        args: call.args ?? {},
        status: "error",
        resultCount: 0,
        elapsedMs: Math.round(performance.now() - started),
        observation: error instanceof Error ? error.message : "Unknown tool execution error",
      }),
      results: [],
      candidates: [],
    };
  }
}

export function isAgentToolName(name: string): name is AgentToolName {
  return LAB03_TOOL_DEFINITIONS.some((tool) => tool.name === name);
}

export function summarizeToolResults(results: readonly unknown[], maxChars = 2200): string {
  if (results.length === 0) return "[]";
  const rendered = JSON.stringify(results, null, 2);
  if (rendered.length <= maxChars) return rendered;
  return `${rendered.slice(0, maxChars)}\n... [truncated]`;
}

export interface McpToolDefinitionLike {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

export interface McpClientLike {
  readonly callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{
    readonly ok: boolean;
    readonly tool: string;
    readonly data?: unknown;
    readonly error?: string;
    readonly durationMs?: number;
  }>;
}

export interface UnifiedAgentToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly source: "in-process" | "mcp";
}

export interface AgentToolCallResult {
  readonly ok: boolean;
  readonly tool: string;
  readonly source: "in-process" | "mcp";
  readonly data?: unknown;
  readonly error?: string;
  readonly durationMs?: number;
  readonly trace?: ToolTrace;
}

function localToolParameters(tool: ToolDefinition): Record<string, unknown> {
  return {
    type: "object",
    properties: Object.fromEntries(
      tool.args.map((arg) => {
        const name = arg.replace(/\?$/, "");
        const type = name === "limit" || name.startsWith("min")
          ? "number"
          : name === "eventTypes" || name === "candidateIds"
            ? "array"
            : "string";

        return [
          name,
          {
            type,
            description: arg.endsWith("?") ? "Optional argument" : "Required argument",
          },
        ];
      }),
    ),
  };
}

export function buildAgentToolSurface(
  mcpTools: readonly McpToolDefinitionLike[] = [],
): readonly UnifiedAgentToolDefinition[] {
  const localTools = LAB03_TOOL_DEFINITIONS.map((tool) => ({
    name: tool.name,
    description: tool.purpose,
    parameters: localToolParameters(tool),
    source: "in-process" as const,
  }));

  const mcpDefinitions = mcpTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    source: "mcp" as const,
  }));

  return [...localTools, ...mcpDefinitions];
}

export async function executeUnifiedAgentToolCall(
  name: string,
  args: Record<string, unknown>,
  mcpClient: McpClientLike | null,
  step = 0,
  thought = "The model selected this tool from the unified tool surface.",
): Promise<AgentToolCallResult> {
  if (isAgentToolName(name)) {
    const execution = await executeAgentToolCall({ tool: name, args }, step, thought);

    return {
      ok: execution.trace.status === "ok",
      tool: name,
      source: "in-process",
      data: execution.results,
      error: execution.trace.status === "error" ? execution.trace.observation : undefined,
      durationMs: execution.trace.elapsedMs,
      trace: execution.trace,
    };
  }

  if (mcpClient) {
    const result = await mcpClient.callTool(name, args);

    return {
      ok: result.ok,
      tool: result.tool,
      source: "mcp",
      data: result.data,
      error: result.error,
      durationMs: result.durationMs,
    };
  }

  return {
    ok: false,
    tool: name,
    source: "mcp",
    error: `Unknown tool: ${name}. No MCP client available.`,
  };
}
