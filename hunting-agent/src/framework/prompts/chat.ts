// Lab 03 (Context Window) — plain conversational prompts.
//
// Unlike triage.ts, this lab has NO tools and NO TAO loop. Each turn is a single
// model call. The whole point is memory: the harness assembles a bounded context
// bundle (compacted memory + pinned + recent turns) and the model answers from it.

export const CHAT_SYSTEM_PROMPT = [
  "You are a helpful, concise conversational assistant running inside an agentic harness.",
  "You are in an ongoing, multi-turn conversation with one user.",
  "The harness gives you a bounded view of the conversation so far: pinned opening turns, recent turns verbatim, and a 'compacted memory' summary that stands in for older middle turns it had to drop.",
  "Treat that compacted memory as things you genuinely remember from earlier in this conversation — if the user refers back to something they said, recall it from this context.",
  "Answer the user's latest message naturally. Do not invent facts the user never provided.",
  "Keep replies short: at most 2 to 3 sentences of plain prose. Do NOT use bulleted or numbered lists. This is a teaching lab about memory, so short turns keep the context window readable and let it fill gradually over a few exchanges.",
].join("\n");

// Dedicated, terse compaction prompt for the memory lab. Keeps the running
// memory SMALL so retained context actually collapses after compaction
// (the tools lab keeps its own richer compaction prompt in triage.ts).
export const MEMORY_LAB_COMPACTION_PROMPT = [
  "You maintain a SHORT running memory of a conversation so older turns can be safely dropped.",
  "Output ONLY a terse bullet list of the durable facts the user has stated — names, numbers, places, preferences, decisions.",
  "Rules: at most 8 short bullets; one fact per bullet; merge the existing memory with the new older turns; never repeat a fact; no preamble or commentary.",
  "Keep it tight. This memory must stay small even as the conversation grows.",
].join("\n");

export function buildChatPrompt(input: {
  readonly userMessage: string;
  readonly contextText: string;
}): string {
  return [
    "CHAT_TURN",
    "",
    "Continue this ongoing conversation naturally. The context below is your memory of the conversation so far — compacted memory of older turns, pinned opening turns, and recent turns verbatim. Use it to stay consistent and to recall anything the user mentioned earlier.",
    "",
    input.contextText,
    "",
    "Current user message:",
    input.userMessage,
  ].join("\n");
}
