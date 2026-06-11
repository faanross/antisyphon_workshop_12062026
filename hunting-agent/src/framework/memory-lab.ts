// Lab 03 (Context Window) — a deliberately simple, teachable memory model.
//
// Unlike the tools-lab engine (session.ts), this does NOT silently window away
// old turns. It keeps the WHOLE conversation verbatim, so "retained context"
// genuinely grows each turn and the capacity bar fills. The ONLY thing that
// shrinks it is COMPACTION: when the conversation crosses the trigger, the
// oldest middle turns are summarized into memory and dropped — the bar visibly
// falls, and the agent still remembers via the summary.
//
// Its own MEMORY_* env knobs keep it independent of the tools lab's CONTEXT_*.

import {
  estimateTokens,
  type ChatSession,
  type ConversationTurn,
  type ContextBudgetReport,
  type ContextCompactionReport,
} from "./session.js";
import { CHAT_SYSTEM_PROMPT } from "./prompts/chat.js";

function envInt(name: string, def: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}
function envFloat(name: string, def: number): number {
  const n = Number.parseFloat(process.env[name] ?? "");
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : def;
}

// Allows 0 (envInt rejects 0, which silently broke MEMORY_PINNED_TURNS=0).
function envIntZeroOk(name: string, def: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

export const memMaxTokens = () => envInt("MEMORY_MAX_TOKENS", 1000);
export const memTriggerRatio = () => envFloat("MEMORY_TRIGGER_RATIO", 0.7);
export const memPinnedTurns = () => envIntZeroOk("MEMORY_PINNED_TURNS", 0);
export const memKeepRecent = () => envInt("MEMORY_KEEP_RECENT", 2);

function renderTurns(turns: readonly ConversationTurn[]): string {
  return turns.map((t) => `${t.role}: ${t.content}`).join("\n");
}

/** The full memory context actually sent to the model — grows until compaction. */
export function buildMemoryText(session: ChatSession, currentMessage: string): string {
  const parts: string[] = [];
  if (session.memorySummary?.trim()) {
    parts.push(`## Earlier conversation (compacted memory)\n${session.memorySummary.trim()}`);
  }
  if (session.turns.length > 0) {
    parts.push(`## Conversation so far\n${renderTurns(session.turns)}`);
  }
  parts.push(`## Current user message\n${currentMessage}`);
  return parts.join("\n\n");
}

export interface MemoryPlan {
  readonly shouldCompact: boolean;
  readonly retainedTokens: number;
  readonly triggerTokens: number;
  readonly maxTokens: number;
  readonly pinnedTurns: readonly ConversationTurn[];
  readonly olderTurns: readonly ConversationTurn[]; // compactable middle
  readonly recentTurns: readonly ConversationTurn[];
  readonly retainedTurns: readonly ConversationTurn[]; // pinned + recent (kept on compaction)
}

/** Decide compaction from the FULL conversation size (what we'd actually send). */
export function planMemory(session: ChatSession, currentMessage: string): MemoryPlan {
  const split = splitTurns(session);
  const maxTokens = memMaxTokens();
  const triggerTokens = Math.floor(maxTokens * memTriggerRatio());
  // Bar/trigger track CONVERSATION memory only (system prompt is fixed overhead).
  const retainedTokens = estimateTokens(buildMemoryText(session, currentMessage));
  const shouldCompact = retainedTokens >= triggerTokens && split.olderTurns.length >= 2;
  return { ...split, shouldCompact, retainedTokens, triggerTokens, maxTokens };
}

interface MemorySplit {
  pinnedTurns: readonly ConversationTurn[];
  olderTurns: readonly ConversationTurn[];
  recentTurns: readonly ConversationTurn[];
  retainedTurns: readonly ConversationTurn[];
}

function splitTurns(session: ChatSession): MemorySplit {
  const turns = session.turns;
  const pinned = turns.slice(0, memPinnedTurns());
  const keep = memKeepRecent();
  const recentStart = Math.max(pinned.length, turns.length - keep);
  const recentTurns = turns.slice(recentStart);
  const olderTurns = turns.slice(pinned.length, recentStart);
  return { pinnedTurns: pinned, olderTurns, recentTurns, retainedTurns: [...pinned, ...recentTurns] };
}

/**
 * Build the panel's budget report from the POST-TURN session — i.e. after the
 * latest user+assistant turns are saved. This makes "retained context" the size
 * of the conversation the harness is now holding (question AND answer included),
 * so the bar grows visibly each exchange and falls when compaction fires.
 */
export function buildMemoryBudget(input: {
  session: ChatSession;
  compaction: ContextCompactionReport;
}): ContextBudgetReport {
  const { session } = input;
  const split = splitTurns(session);
  const maxTokens = memMaxTokens();
  const triggerTokens = Math.floor(maxTokens * memTriggerRatio());

  const systemPromptTokens = estimateTokens(CHAT_SYSTEM_PROMPT);
  const memoryTokens = estimateTokens(session.memorySummary ?? "");
  const pinnedTokens = estimateTokens(renderTurns(split.pinnedTurns));
  const olderTokens = estimateTokens(renderTurns(split.olderTurns));
  const recentTokens = estimateTokens(renderTurns(split.recentTurns));
  // Retained = conversation memory only (summary + all kept turns). System prompt
  // is reported separately (fixed overhead) so compaction's effect is unmistakable.
  const retained = memoryTokens + pinnedTokens + olderTokens + recentTokens;

  // Harmonize the displayed compaction numbers with the bar: when no compaction
  // happened, report the SAME post-turn `retained` everywhere (bar, "below trigger"
  // message, before/after) instead of the planner's separate pre-turn estimate.
  const compaction: ContextCompactionReport = input.compaction.occurred
    ? input.compaction
    : {
        ...input.compaction,
        beforeTokens: retained,
        afterTokens: retained,
        reason:
          retained < triggerTokens
            ? `Below trigger: ${retained}/${triggerTokens} tokens — still room, no compaction.`
            : `At the ${triggerTokens} trigger, but only ${split.olderTurns.length} older turn(s) — need 2 to compact.`,
      };

  return {
    systemPromptTokens,
    toolCatalogTokens: 0,
    retainedContextTokens: retained,
    maxRetainedContextTokens: maxTokens,
    currentMessageTokens: 0,
    currentTurnPromptTokens: 0,
    currentTurnOutputTokens: 0,
    currentTurnTotalTokens: 0,
    estimatedTokens: retained,
    maxTokens,
    pinnedTurnCount: split.pinnedTurns.length,
    recentTurnCount: split.recentTurns.length,
    recentToolTraceCount: 0,
    droppedTurnCount: session.compactedTurnCount,
    memorySummaryTokens: memoryTokens,
    stateSummaryTokens: 0,
    pinnedTurnTokens: pinnedTokens,
    recentTurnTokens: recentTokens,
    recentToolTraceTokens: 0,
    compactedTurnCount: session.compactedTurnCount,
    compactionCount: session.compactionCount,
    compactionTriggerTokens: triggerTokens,
    compactionTriggerRatio: memTriggerRatio(),
    contextSections: [
      { id: "memory-summary", label: "Compacted memory", tokens: memoryTokens, description: "Older turns the harness summarized so it could drop them." },
      { id: "pinned-turns", label: "Pinned opening turns", tokens: pinnedTokens, description: "First turns kept verbatim — they set up the conversation." },
      { id: "older-turns", label: "Older turns (compactable)", tokens: olderTokens, description: "Verbatim middle turns. These are what compaction folds into memory next." },
      { id: "recent-turns", label: "Recent turns", tokens: recentTokens, description: "Latest turns kept verbatim for accurate follow-ups." },
    ],
    compaction,
    strategy: "keep the whole conversation verbatim until it crosses the trigger; then summarize the oldest turns into memory and drop them",
  };
}
