import type { PipelineState } from "./types.js";
import { createPipelineState } from "./state.js";
import type { CandidateQuery, ToolTrace } from "./tools.js";

export interface ConversationTurn {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: string;
}

export interface ContextSectionBudget {
  readonly id: string;
  readonly label: string;
  readonly tokens: number;
  readonly description: string;
}

export interface ContextCompactionReport {
  readonly checked: boolean;
  readonly occurred: boolean;
  readonly beforeTokens: number;
  readonly afterTokens: number;
  readonly triggerTokens: number;
  readonly ratio: number;
  readonly compactedTurns: number;
  readonly compactedToolTraces: number;
  readonly retainedTurns: number;
  readonly retainedToolTraces: number;
  readonly reason: string;
}

export interface ContextBudgetReport {
  readonly systemPromptTokens: number;
  readonly toolCatalogTokens: number;
  readonly retainedContextTokens: number;
  readonly maxRetainedContextTokens: number;
  readonly currentMessageTokens: number;
  readonly currentTurnPromptTokens: number;
  readonly currentTurnOutputTokens: number;
  readonly currentTurnTotalTokens: number;
  readonly estimatedTokens: number;
  readonly maxTokens: number;
  readonly pinnedTurnCount: number;
  readonly recentTurnCount: number;
  readonly recentToolTraceCount: number;
  readonly droppedTurnCount: number;
  readonly memorySummaryTokens: number;
  readonly stateSummaryTokens: number;
  readonly pinnedTurnTokens: number;
  readonly recentTurnTokens: number;
  readonly recentToolTraceTokens: number;
  readonly compactedTurnCount: number;
  readonly compactionCount: number;
  readonly compactionTriggerTokens: number;
  readonly compactionTriggerRatio: number;
  readonly contextSections: readonly ContextSectionBudget[];
  readonly compaction: ContextCompactionReport;
  readonly strategy: string;
}

export interface ContextBundle {
  readonly text: string;
  readonly budget: ContextBudgetReport;
}

export interface ChatSession {
  readonly sessionId: string;
  readonly state: PipelineState;
  readonly turns: readonly ConversationTurn[];
  readonly toolTraces: readonly ToolTrace[];
  readonly memorySummary?: string;
  readonly compactedTurnCount: number;
  readonly compactionCount: number;
  readonly lastCompactedAt?: string;
  readonly lastQuery?: CandidateQuery;
}

const DEFAULT_MAX_CONTEXT_TOKENS = 1800;
const DEFAULT_RECENT_TURN_LIMIT = 6;
const DEFAULT_PINNED_TURN_LIMIT = 2;
const DEFAULT_RECENT_TOOL_TRACE_LIMIT = 8;
const DEFAULT_COMPACTION_TRIGGER_RATIO = 0.8;

const sessions = new Map<string, ChatSession>();

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function withTurnTokenEstimates(
  budget: ContextBudgetReport,
  currentTurnPromptTokens: number,
  currentTurnOutputTokens: number,
): ContextBudgetReport {
  return {
    ...budget,
    currentTurnPromptTokens,
    currentTurnOutputTokens,
    currentTurnTotalTokens: currentTurnPromptTokens + currentTurnOutputTokens,
  };
}

function maxContextTokens(): number {
  const raw = process.env.CONTEXT_MAX_TOKENS;
  if (!raw) return DEFAULT_MAX_CONTEXT_TOKENS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 200
    ? parsed
    : DEFAULT_MAX_CONTEXT_TOKENS;
}

function recentTurnLimit(): number {
  const raw = process.env.CONTEXT_RECENT_TURNS;
  if (!raw) return DEFAULT_RECENT_TURN_LIMIT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 2
    ? parsed
    : DEFAULT_RECENT_TURN_LIMIT;
}

function pinnedTurnLimit(): number {
  const raw = process.env.CONTEXT_PINNED_TURNS;
  if (!raw) return DEFAULT_PINNED_TURN_LIMIT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_PINNED_TURN_LIMIT;
}

function recentToolTraceLimit(): number {
  const raw = process.env.CONTEXT_RECENT_TOOL_TRACES;
  if (!raw) return DEFAULT_RECENT_TOOL_TRACE_LIMIT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_RECENT_TOOL_TRACE_LIMIT;
}

function compactionTriggerRatio(): number {
  const raw = process.env.CONTEXT_COMPACTION_TRIGGER_RATIO;
  if (!raw) return DEFAULT_COMPACTION_TRIGGER_RATIO;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0.2 && parsed < 1
    ? parsed
    : DEFAULT_COMPACTION_TRIGGER_RATIO;
}

export function getOrCreateSession(sessionId: string): ChatSession {
  const existing = sessions.get(sessionId);
  if (existing) return existing;

  const created: ChatSession = {
    sessionId,
    state: createPipelineState(sessionId),
    turns: [],
    toolTraces: [],
    compactedTurnCount: 0,
    compactionCount: 0,
  };
  sessions.set(sessionId, created);
  return created;
}

export function saveSession(session: ChatSession): ChatSession {
  sessions.set(session.sessionId, session);
  return session;
}

export function resetSession(sessionId: string): void {
  sessions.delete(sessionId);
}

function trimForContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 15))}... [truncated]`;
}

function summarizeState(state: PipelineState, latestAnalysisChars = 600): string {
  const lastInput = state.inputs.at(-1);
  const lastAnalysis = state.analyses.at(-1);

  return [
    `Session: ${state.sessionId}`,
    `Inputs recorded: ${state.inputs.length}`,
    `Analyses recorded: ${state.analyses.length}`,
    lastInput ? `Latest input: ${trimForContext(lastInput.value, 280)}` : "Latest input: none",
    lastAnalysis
      ? `Latest analysis summary: ${trimForContext(lastAnalysis.insight, latestAnalysisChars)}`
      : "Latest analysis summary: none",
  ].join("\n");
}

function formatTurns(turns: readonly ConversationTurn[]): string {
  if (turns.length === 0) return "No prior turns in this session.";
  return turns
    .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
    .join("\n\n");
}

function formatMemorySummary(summary: string | undefined, maxChars: number): string {
  if (!summary?.trim()) return "No compacted long-term conversation memory yet.";
  return trimForContext(summary.trim(), maxChars);
}

function formatToolTraces(traces: readonly ToolTrace[], limit = 5): string {
  if (traces.length === 0) return "No prior tool calls in this session.";
  if (limit === 0) return "Prior tool calls omitted for context budget.";
  return traces
    .slice(-limit)
    .map((trace) => [
      `${trace.tool} step=${trace.step} status=${trace.status}`,
      `args=${JSON.stringify(trace.args)}`,
      `returned=${trace.resultCount}`,
      `observation=${trimForContext(trace.observation, 260)}`,
    ].join(" | "))
    .join("\n");
}

function renderContextSections(input: {
  readonly currentMessage: string;
  readonly session: ChatSession;
  readonly pinnedTurns: readonly ConversationTurn[];
  readonly recentTurns: readonly ConversationTurn[];
  readonly memorySummaryChars: number;
  readonly latestAnalysisChars: number;
  readonly toolTraceLimit: number;
}): Record<string, string> {
  return {
    currentMessage: trimForContext(input.currentMessage, 1200),
    memorySummary: formatMemorySummary(input.session.memorySummary, input.memorySummaryChars),
    stateSummary: summarizeState(input.session.state, input.latestAnalysisChars),
    toolTraces: formatToolTraces(input.session.toolTraces, input.toolTraceLimit),
    pinnedTurns: formatTurns(input.pinnedTurns),
    recentTurns: formatTurns(input.recentTurns),
  };
}

function renderContext(input: {
  readonly currentMessage: string;
  readonly session: ChatSession;
  readonly pinnedTurns: readonly ConversationTurn[];
  readonly recentTurns: readonly ConversationTurn[];
  readonly memorySummaryChars: number;
  readonly latestAnalysisChars: number;
  readonly toolTraceLimit: number;
}): string {
  const sections = renderContextSections(input);
  return [
    "## Current user message",
    sections.currentMessage,
    "## Compacted conversation memory",
    sections.memorySummary,
    "## Session state summary",
    sections.stateSummary,
    "## Recent tool observations",
    sections.toolTraces,
    "## Pinned opening turns",
    sections.pinnedTurns,
    "## Recent conversation turns",
    sections.recentTurns,
  ].join("\n\n");
}

function splitTurnsForContext(session: ChatSession, turnLimit = recentTurnLimit()): {
  pinnedTurns: readonly ConversationTurn[];
  recentTurns: readonly ConversationTurn[];
  omittedRawTurnCount: number;
} {
  const pinnedTurns = session.turns.slice(0, pinnedTurnLimit());
  const recentTurns = session.turns
    .slice(-turnLimit)
    .filter((turn) => !pinnedTurns.includes(turn));
  const omittedRawTurnCount = Math.max(
    0,
    session.turns.length - pinnedTurns.length - recentTurns.length,
  );
  return { pinnedTurns, recentTurns, omittedRawTurnCount };
}

export interface SessionCompactionPlan {
  readonly shouldCompact: boolean;
  readonly maxTokens: number;
  readonly estimatedTokens: number;
  readonly triggerTokens: number;
  readonly triggerRatio: number;
  readonly turnsToCompact: readonly ConversationTurn[];
  readonly toolTracesToCompact: readonly ToolTrace[];
  readonly retainedTurns: readonly ConversationTurn[];
  readonly retainedToolTraces: readonly ToolTrace[];
}

export function planSessionCompaction(
  session: ChatSession,
  currentMessage: string,
): SessionCompactionPlan {
  const maxTokens = maxContextTokens();
  const triggerRatio = compactionTriggerRatio();
  const triggerTokens = Math.floor(maxTokens * triggerRatio);
  const pinnedTurns = session.turns.slice(0, pinnedTurnLimit());
  const recentCount = Math.min(
    recentTurnLimit(),
    Math.max(0, session.turns.length - pinnedTurns.length),
  );
  const middleEnd = Math.max(pinnedTurns.length, session.turns.length - recentCount);
  const recentTurns = session.turns.slice(middleEnd);
  const turnsToCompact = session.turns.slice(pinnedTurns.length, middleEnd);
  const retainedTurns = [...pinnedTurns, ...recentTurns];
  const toolTraceLimit = recentToolTraceLimit();
  const retainedToolTraces = toolTraceLimit > 0
    ? session.toolTraces.slice(-toolTraceLimit)
    : [];
  const toolTracesToCompact = session.toolTraces.slice(
    0,
    Math.max(0, session.toolTraces.length - retainedToolTraces.length),
  );
  const estimatedTokens = estimateTokens(renderContext({
    currentMessage,
    session,
    pinnedTurns,
    recentTurns: session.turns.filter((turn) => !pinnedTurns.includes(turn)),
    memorySummaryChars: 2400,
    latestAnalysisChars: 800,
    toolTraceLimit: Math.max(session.toolTraces.length, 5),
  }));

  return {
    shouldCompact: estimatedTokens >= triggerTokens && turnsToCompact.length >= 2,
    maxTokens,
    estimatedTokens,
    triggerTokens,
    triggerRatio,
    turnsToCompact,
    toolTracesToCompact,
    retainedTurns,
    retainedToolTraces,
  };
}

export function applyCompactionSummary(
  session: ChatSession,
  plan: SessionCompactionPlan,
  memorySummary: string,
): ChatSession {
  return {
    ...session,
    turns: plan.retainedTurns,
    toolTraces: plan.retainedToolTraces,
    memorySummary: memorySummary.trim(),
    compactedTurnCount: session.compactedTurnCount + plan.turnsToCompact.length,
    compactionCount: session.compactionCount + 1,
    lastCompactedAt: new Date().toISOString(),
  };
}

export function buildContextBundle(
  session: ChatSession,
  currentMessage: string,
): ContextBundle {
  const maxTokens = maxContextTokens();
  const triggerRatio = compactionTriggerRatio();
  const compactionTriggerTokens = Math.floor(maxTokens * triggerRatio);
  const turnLimit = recentTurnLimit();
  let { pinnedTurns, recentTurns, omittedRawTurnCount } = splitTurnsForContext(session, turnLimit);
  let memorySummaryChars = 1400;
  let latestAnalysisChars = 600;
  let toolTraceLimit = 5;
  let droppedTurnCount = session.compactedTurnCount + omittedRawTurnCount;
  let text = renderContext({
    currentMessage,
    session,
    pinnedTurns,
    recentTurns,
    memorySummaryChars,
    latestAnalysisChars,
    toolTraceLimit,
  });

  while (estimateTokens(text) > maxTokens && recentTurns.length > 0) {
    recentTurns = recentTurns.slice(1);
    droppedTurnCount += 1;
    text = renderContext({
      currentMessage,
      session,
      pinnedTurns,
      recentTurns,
      memorySummaryChars,
      latestAnalysisChars,
      toolTraceLimit,
    });
  }

  if (estimateTokens(text) > maxTokens) {
    memorySummaryChars = 700;
    latestAnalysisChars = 240;
    toolTraceLimit = 2;
    text = renderContext({
      currentMessage,
      session,
      pinnedTurns,
      recentTurns,
      memorySummaryChars,
      latestAnalysisChars,
      toolTraceLimit,
    });
  }

  if (estimateTokens(text) > maxTokens) {
    memorySummaryChars = 360;
    latestAnalysisChars = 120;
    toolTraceLimit = 0;
    text = renderContext({
      currentMessage,
      session,
      pinnedTurns,
      recentTurns: [],
      memorySummaryChars,
      latestAnalysisChars,
      toolTraceLimit,
    });
    recentTurns = [];
  }

  if (estimateTokens(text) > maxTokens && pinnedTurns.length > 0) {
    droppedTurnCount += pinnedTurns.length;
    pinnedTurns = [];
    text = renderContext({
      currentMessage,
      session,
      pinnedTurns,
      recentTurns,
      memorySummaryChars,
      latestAnalysisChars,
      toolTraceLimit,
    });
  }

  const sections = renderContextSections({
    currentMessage,
    session,
    pinnedTurns,
    recentTurns,
    memorySummaryChars,
    latestAnalysisChars,
    toolTraceLimit,
  });
  const retainedContextTokens = estimateTokens(text);
  const recentToolTraceCount = toolTraceLimit === 0
    ? 0
    : Math.min(session.toolTraces.length, toolTraceLimit);

  return {
    text,
    budget: {
      systemPromptTokens: 0,
      toolCatalogTokens: 0,
      retainedContextTokens,
      maxRetainedContextTokens: maxTokens,
      currentMessageTokens: estimateTokens(sections.currentMessage),
      currentTurnPromptTokens: 0,
      currentTurnOutputTokens: 0,
      currentTurnTotalTokens: 0,
      estimatedTokens: retainedContextTokens,
      maxTokens,
      pinnedTurnCount: pinnedTurns.length,
      recentTurnCount: recentTurns.length,
      recentToolTraceCount,
      droppedTurnCount,
      memorySummaryTokens: estimateTokens(session.memorySummary ?? ""),
      stateSummaryTokens: estimateTokens(sections.stateSummary),
      pinnedTurnTokens: estimateTokens(sections.pinnedTurns),
      recentTurnTokens: estimateTokens(sections.recentTurns),
      recentToolTraceTokens: estimateTokens(sections.toolTraces),
      compactedTurnCount: session.compactedTurnCount,
      compactionCount: session.compactionCount,
      compactionTriggerTokens,
      compactionTriggerRatio: triggerRatio,
      contextSections: [
        {
          id: "current-message",
          label: "Current message",
          tokens: estimateTokens(sections.currentMessage),
          description: "The analyst's latest prompt, injected into this turn.",
        },
        {
          id: "memory-summary",
          label: "Compacted memory",
          tokens: estimateTokens(session.memorySummary ?? ""),
          description: "Model-generated summary replacing older middle turns.",
        },
        {
          id: "state-summary",
          label: "State summary",
          tokens: estimateTokens(sections.stateSummary),
          description: "Deterministic state rendered from the harness.",
        },
        {
          id: "pinned-turns",
          label: "Pinned opening turns",
          tokens: estimateTokens(sections.pinnedTurns),
          description: "Initial turns kept verbatim because they establish scope.",
        },
        {
          id: "recent-turns",
          label: "Recent turns",
          tokens: estimateTokens(sections.recentTurns),
          description: "Latest conversation turns kept verbatim for follow-up questions.",
        },
        {
          id: "recent-tools",
          label: "Recent tool traces",
          tokens: estimateTokens(sections.toolTraces),
          description: "Recent observations kept verbatim for evidence-grounded reasoning.",
        },
      ],
      compaction: {
        checked: false,
        occurred: false,
        beforeTokens: retainedContextTokens,
        afterTokens: retainedContextTokens,
        triggerTokens: compactionTriggerTokens,
        ratio: triggerRatio,
        compactedTurns: 0,
        compactedToolTraces: 0,
        retainedTurns: pinnedTurns.length + recentTurns.length,
        retainedToolTraces: recentToolTraceCount,
        reason: "Compaction decision is made before this context bundle is built.",
      },
      strategy: "periodic compaction preserves older turns in memorySummary; retained context keeps pinned opening turns, recent turns, recent tool traces, and compacted memory",
    },
  };
}
