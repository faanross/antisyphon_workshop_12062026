import { renderToolCatalog } from "../tools.js";
import type { ToolTrace } from "../tools.js";
import type { ConversationTurn } from "../session.js";

export const TRIAGE_SYSTEM_PROMPT = [
  "You are a threat-hunting triage analyst inside an agentic hunting harness.",
  "You operate in a bounded TAO loop: Thought, Action, Observation.",
  "The harness exposes read-only tools. Choose one useful tool action at a time.",
  "The harness validates and executes the selected tool. You reason over the returned observation.",
  "Use the smallest useful tool for the current question. Do not call every tool just because it exists.",
  "Never invent candidates, telemetry, process lineage, threat intel, or LOTS context that is not present in session context or tool observations.",
  "",
  "Triage method:",
  "- A beacon score measures regularity, not malicious intent.",
  "- LOTS matches can explain regular traffic, especially EDR, cloud backup, Microsoft 365, update, and monitoring services.",
  "- Rare destinations, threat-intel matches, suspicious parent chains, user-profile binaries, and masquerading process names increase concern.",
  "- A high score with legitimate service context may be a false positive.",
  "- A slightly lower score with multiple corroborating indicators may be the higher-priority threat.",
  "- Use LIKELY TRUE POSITIVE, LIKELY FALSE POSITIVE, or INCONCLUSIVE when assigning verdicts.",
].join("\n");

export const MEMORY_COMPACTION_SYSTEM_PROMPT = [
  "You compact a threat-hunting chat session for a model harness.",
  "Your job is to preserve operational continuity while making older conversation history shorter.",
  "Keep concrete entities, candidate IDs, destination IPs, tool findings, analyst decisions, unresolved questions, and stated assumptions.",
  "Do not add facts that are not present in the existing memory, turns, or tool traces.",
  "Write a concise but useful memory summary that can replace the compacted middle turns.",
].join("\n");

function formatTurnsForCompaction(turns: readonly ConversationTurn[]): string {
  if (turns.length === 0) return "No turns selected for compaction.";
  return turns
    .map((turn, index) => [
      `Turn ${index + 1}`,
      `role: ${turn.role}`,
      `timestamp: ${turn.timestamp}`,
      turn.content,
    ].join("\n"))
    .join("\n\n---\n\n");
}

function formatToolTracesForCompaction(traces: readonly ToolTrace[]): string {
  if (traces.length === 0) return "No older tool traces selected for compaction.";
  return traces
    .map((trace) => [
      `${trace.tool} step=${trace.step} status=${trace.status}`,
      `args=${JSON.stringify(trace.args)}`,
      `resultCount=${trace.resultCount}`,
      `observation=${trace.observation}`,
    ].join(" | "))
    .join("\n");
}

export function buildMemoryCompactionPrompt(input: {
  readonly existingSummary?: string;
  readonly turnsToCompact: readonly ConversationTurn[];
  readonly toolTracesToCompact: readonly ToolTrace[];
}): string {
  return [
    "MEMORY_COMPACTION_REQUEST",
    "",
    "Create an updated compact memory summary for this investigation session.",
    "This summary will be injected into later model calls in place of the older middle turns.",
    "",
    "Preserve:",
    "- candidate IDs and verdicts discussed",
    "- destination IPs, hosts, users, processes, and tool observations that affected reasoning",
    "- analyst decisions, corrections, preferences, and unresolved follow-up questions",
    "- distinctions between evidence, assumptions, and open questions",
    "",
    "Avoid:",
    "- generic filler",
    "- raw transcript style",
    "- invented evidence",
    "",
    "Existing compact memory:",
    input.existingSummary?.trim() || "None yet.",
    "",
    "Older turns to compact:",
    formatTurnsForCompaction(input.turnsToCompact),
    "",
    "Older tool traces to fold into memory:",
    formatToolTracesForCompaction(input.toolTracesToCompact),
    "",
    "Return only the updated compact memory summary.",
  ].join("\n");
}

export function buildToolDecisionPrompt(input: {
  readonly userMessage: string;
  readonly contextText: string;
  readonly observations: readonly string[];
}): string {
  return [
    "TOOL_SELECTION_REQUEST",
    "",
    "Choose the next best action for this investigation.",
    "",
    "Available tools:",
    renderToolCatalog(),
    "",
    "Return ONLY one JSON object. Do not wrap it in markdown.",
    "",
    "To call a tool:",
    `{"thought":"brief reason this tool is needed","action":"call_tool","tool":"query_candidates","args":{"type":"beacon","minBeaconScore":0.7}}`,
    "",
    "To stop calling tools when enough evidence has been gathered:",
    `{"thought":"brief reason no more tools are needed","action":"finish","finalAnswer":"brief draft conclusion"}`,
    "",
    "Current user message:",
    input.userMessage,
    "",
    input.contextText,
    "",
    "Observations already returned this turn:",
    input.observations.length > 0 ? input.observations.join("\n\n") : "None yet.",
  ].join("\n");
}

export function buildFinalTriagePrompt(input: {
  readonly userMessage: string;
  readonly contextText: string;
  readonly observations: readonly string[];
  readonly finalDraft?: string;
}): string {
  return [
    "FINAL_TRIAGE_RESPONSE",
    "",
    "Answer the analyst's latest message using only the session context and tool observations below.",
    "Do not invent candidate data. If evidence is missing, say what is missing.",
    "Mention which tool observations mattered. Keep the answer concise but explain the decision logic.",
    "",
    "Current user message:",
    input.userMessage,
    "",
    input.contextText,
    "",
    "Tool observations from this turn:",
    input.observations.join("\n\n") || "No tool observations.",
    "",
    input.finalDraft ? `Model draft from TAO loop:\n${input.finalDraft}` : "",
  ].join("\n");
}
