<script lang="ts">
  type Trace = {
    id?: string;
    step: number;
    thought: string;
    tool: string;
    args: Record<string, unknown>;
    status: "ok" | "error";
    resultCount: number;
    elapsedMs: number;
    observation: string;
  };
  type ContextBudget = {
    systemPromptTokens: number;
    toolCatalogTokens: number;
    retainedContextTokens: number;
    maxRetainedContextTokens: number;
    currentMessageTokens: number;
    currentTurnPromptTokens: number;
    currentTurnOutputTokens: number;
    currentTurnTotalTokens: number;
    estimatedTokens: number;
    maxTokens: number;
    pinnedTurnCount: number;
    recentTurnCount: number;
    recentToolTraceCount: number;
    droppedTurnCount: number;
    memorySummaryTokens: number;
    stateSummaryTokens: number;
    pinnedTurnTokens: number;
    recentTurnTokens: number;
    recentToolTraceTokens: number;
    compactedTurnCount: number;
    compactionCount: number;
    compactionTriggerTokens: number;
    compactionTriggerRatio: number;
    contextSections: {
      id: string;
      label: string;
      tokens: number;
      description: string;
    }[];
    compaction: {
      checked: boolean;
      occurred: boolean;
      beforeTokens: number;
      afterTokens: number;
      triggerTokens: number;
      ratio: number;
      compactedTurns: number;
      compactedToolTraces: number;
      retainedTurns: number;
      retainedToolTraces: number;
      reason: string;
    };
    strategy: string;
  };
  type ToolDefinition = {
    name: string;
    purpose: string;
    args: readonly string[];
    returns: string;
  };
  type Turn = {
    id: string;
    prompt: string;
    response: string;
    traces: Trace[];
    contextBudget: ContextBudget | null;
    status: "streaming" | "complete" | "error";
  };
  type StreamEvent =
    | { type: "status"; message: string }
    | {
        type: "metadata";
        toolTraces: Trace[];
        contextBudget: ContextBudget;
        availableTools: ToolDefinition[];
      }
    | { type: "token"; token: string }
    | {
        type: "done";
        result: {
          message: string;
          toolTraces: Trace[];
          contextBudget: ContextBudget;
          availableTools: ToolDefinition[];
        };
      }
    | { type: "error"; message: string };

  const initialTools: ToolDefinition[] = [
    {
      name: "query_candidates",
      purpose: "Find candidates by type, score, host, destination, process, or id.",
      args: ["type?", "minBeaconScore?", "host?", "destIp?", "candidateIds?"],
      returns: "Compact candidate rows sorted by score.",
    },
    {
      name: "get_candidate_detail",
      purpose: "Open one candidate for attribution, enrichment, and evidence ids.",
      args: ["candidateId"],
      returns: "Detailed candidate record.",
    },
    {
      name: "get_related_events",
      purpose: "Retrieve raw supporting events for a selected candidate.",
      args: ["candidateId", "eventTypes?", "limit?"],
      returns: "Sysmon and connection evidence.",
    },
    {
      name: "lookup_asset",
      purpose: "Look up host context when user or process role matters.",
      args: ["host?", "srcIp?"],
      returns: "Observed users, processes, and inferred asset role.",
    },
    {
      name: "lookup_threat_intel",
      purpose: "Check whether a destination has threat-intel context.",
      args: ["destIp"],
      returns: "Intel source, tags, and related candidates.",
    },
    {
      name: "explain_score",
      purpose: "Inspect why a candidate scored high or low.",
      args: ["candidateId"],
      returns: "Score dimensions and interpretation.",
    },
  ];


  let sessionId = $state(`lab03-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  let activeTab = $state<"chat" | "trace">("chat");
  let message = $state("");
  let turns = $state<Turn[]>([]);
  let availableTools = $state<ToolDefinition[]>(initialTools);
  let statusText = $state("");
  let busy = $state(false);
  let toolsOpen = $state(false);

  function createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function updateTurn(id: string, patch: Partial<Turn>) {
    turns = turns.map((turn) =>
      turn.id === id ? { ...turn, ...patch } : turn
    );
  }

  function resetConversation() {
    if (busy) return;
    sessionId = createId("lab03");
    message = "";
    turns = [];
    availableTools = initialTools;
    statusText = "";
  }

  function applyMetadata(turnId: string, event: {
    toolTraces: Trace[];
    contextBudget: ContextBudget;
    availableTools: ToolDefinition[];
  }) {
    updateTurn(turnId, {
      traces: event.toolTraces,
      contextBudget: event.contextBudget,
    });
    availableTools = event.availableTools ?? availableTools;
  }

  function handleStreamEvent(event: StreamEvent, turnId: string, streamedText: string): string {
    if (event.type === "status") {
      statusText = event.message;
      return streamedText;
    }

    if (event.type === "metadata") {
      applyMetadata(turnId, event);
      return streamedText;
    }

    if (event.type === "token") {
      const nextText = streamedText + event.token;
      updateTurn(turnId, { response: nextText });
      return nextText;
    }

    if (event.type === "done") {
      applyMetadata(turnId, event.result);
      if (!streamedText || streamedText !== event.result.message) {
        updateTurn(turnId, { response: event.result.message, status: "complete" });
        return event.result.message;
      }
      updateTurn(turnId, { status: "complete" });
      return streamedText;
    }

    updateTurn(turnId, { response: `Error: ${event.message}`, status: "error" });
    return streamedText;
  }

  async function send() {
    if (!message.trim() || busy) return;
    const prompt = message;
    const turnId = createId("turn");
    turns = [
      ...turns,
      {
        id: turnId,
        prompt,
        response: "",
        traces: [],
        contextBudget: null,
        status: "streaming",
      },
    ];
    message = "";
    busy = true;
    statusText = "Working";

    try {
      const response = await fetch("/lab/04/api/chat", {
        method: "POST",
        headers: {
          "accept": "application/x-ndjson",
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: prompt, sessionId, stream: true }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed with HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          streamedText = handleStreamEvent(JSON.parse(line) as StreamEvent, turnId, streamedText);
        }
      }

      const remainder = buffer.trim();
      if (remainder) {
        streamedText = handleStreamEvent(JSON.parse(remainder) as StreamEvent, turnId, streamedText);
      }
    } catch (error) {
      updateTurn(turnId, {
        response: error instanceof Error ? `Error: ${error.message}` : "Error: request failed",
        status: "error",
      });
    } finally {
      statusText = "";
      busy = false;
    }
  }

  function traceTitle(trace: Trace): string {
    return `Step ${trace.step}: ${trace.tool}`;
  }

  function toolActionCount(): number {
    return turns.reduce((count, turn) => count + turn.traces.length, 0);
  }

  function plural(count: number, singular: string, pluralLabel = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : pluralLabel}`;
  }

  function formatArgs(args: Record<string, unknown>): string {
    return JSON.stringify(args, null, 2);
  }

  function latestContextBudget(): ContextBudget | null {
    return [...turns].reverse().find((turn) => turn.contextBudget)?.contextBudget ?? null;
  }

  function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  function tokenPercent(tokens: number, maxTokens: number): number {
    if (maxTokens <= 0) return 0;
    return clampPercent((tokens / maxTokens) * 100);
  }

  function formatTokenCount(tokens: number): string {
    return `${Math.round(tokens).toLocaleString()} tok`;
  }

  function messageSlots(budget: ContextBudget | null): {
    id: string;
    label: string;
    role: "user" | "assistant";
    status: "pinned" | "compacted" | "middle" | "recent";
  }[] {
    const slots = turns.flatMap((turn, index) => [
      {
        id: `${turn.id}-user`,
        label: `U${index + 1}`,
        role: "user" as const,
      },
      {
        id: `${turn.id}-assistant`,
        label: `A${index + 1}`,
        role: "assistant" as const,
      },
    ]);
    if (!budget || slots.length === 0) {
      return slots.map((slot) => ({ ...slot, status: "recent" as const }));
    }

    const pinnedCount = Math.min(budget.pinnedTurnCount, slots.length);
    const recentCount = Math.min(budget.recentTurnCount, Math.max(0, slots.length - pinnedCount));
    const recentStart = Math.max(pinnedCount, slots.length - recentCount);
    return slots.map((slot, index) => {
      if (index < pinnedCount) return { ...slot, status: "pinned" as const };
      if (index >= recentStart) return { ...slot, status: "recent" as const };
      return {
        ...slot,
        status: budget.compactionCount > 0 ? "compacted" as const : "middle" as const,
      };
    });
  }

  function maxSectionTokens(budget: ContextBudget): number {
    return Math.max(1, ...retainedContextSections(budget).map((section) => section.tokens));
  }

  function retainedContextSections(budget: ContextBudget): ContextBudget["contextSections"] {
    return budget.contextSections.filter((section) =>
      section.id !== "system-prompt" && section.id !== "tool-catalog"
    );
  }
</script>

<svelte:head><title>Lab 04 | TAO Triage</title></svelte:head>

<main>
  <header>
    <div>
      <p class="eyebrow">Lab 04</p>
      <h1>Interactive TAO Triage</h1>
    </div>
  </header>

  <section class="workspace">
    <section class="console panel">
      <div class="panel-title">
        <h2>Agent Console</h2>
        <div class="panel-actions">
          <span>{plural(turns.length, "turn")}</span>
          <button type="button" class="reset-button" onclick={resetConversation} disabled={busy}>Reset</button>
        </div>
      </div>
      <div class="tabs" role="tablist" aria-label="Lab 04 view">
        <button
          type="button"
          role="tab"
          class:active={activeTab === "chat"}
          aria-selected={activeTab === "chat"}
          onclick={() => activeTab = "chat"}
        >
          Chat
        </button>
        <button
          type="button"
          role="tab"
          class:active={activeTab === "trace"}
          aria-selected={activeTab === "trace"}
          onclick={() => activeTab = "trace"}
        >
          Execution Trace ({toolActionCount()})
        </button>
      </div>

      {#if activeTab === "chat"}
        <div class="messages">
          {#if turns.length === 0}
            <article class="agent placeholder">
              No investigation messages yet.
            </article>
          {/if}
          {#each turns as turn (turn.id)}
            <article class="user">{turn.prompt}</article>
            <article class="agent" class:streaming={turn.status === "streaming"} class:error={turn.status === "error"}>
              {#if turn.response}
                {turn.response}
              {:else if turn.status === "streaming"}
                {statusText || "Working"}
              {:else}
                No response recorded.
              {/if}
              <footer class="message-meta">
                {#if turn.traces.length > 0}
                  <span>{plural(turn.traces.length, "tool action")}</span>
                {/if}
                {#if turn.status === "streaming"}
                  <span>streaming</span>
                {:else if turn.status === "error"}
                  <span>error</span>
                {/if}
              </footer>
            </article>
          {/each}
        </div>
      {:else}
        <div class="trace-turns">
          {#if turns.length === 0}
            <article class="turn-trace placeholder">
              Send a prompt to record the exact prompt, tool calls, observations, and final answer for that turn.
            </article>
          {/if}
          {#each turns as turn, index (turn.id)}
            <article class="turn-trace" class:error={turn.status === "error"}>
              <div class="turn-head">
                <strong>Turn {index + 1}</strong>
                <span>{plural(turn.traces.length, "tool action")}</span>
              </div>

              <section class="turn-section">
                <span class="label">Prompt</span>
                <blockquote>{turn.prompt}</blockquote>
              </section>

              <section class="turn-section">
                <span class="label">Tool Actions</span>
                {#if turn.traces.length === 0}
                  <p class="empty">{turn.status === "streaming" ? "Waiting for tool selection." : "No tool action recorded for this turn."}</p>
                {:else}
                  <div class="trace-list">
                    {#each turn.traces as trace}
                      <article class="trace-card" class:error={trace.status === "error"}>
                        <div class="trace-head">
                          <strong>{traceTitle(trace)}</strong>
                          <span>{trace.status} | {trace.resultCount} result{trace.resultCount === 1 ? "" : "s"} | {trace.elapsedMs}ms</span>
                        </div>
                        <div class="tao-row">
                          <div>
                            <span class="label">Selection Note</span>
                            <p>{trace.thought}</p>
                          </div>
                          <div>
                            <span class="label">Action</span>
                            <code>{trace.tool}({formatArgs(trace.args)})</code>
                          </div>
                          <div>
                            <span class="label">Observation</span>
                            <p>{trace.observation}</p>
                          </div>
                        </div>
                      </article>
                    {/each}
                  </div>
                {/if}
              </section>

              <section class="turn-section">
                <span class="label">Output</span>
                <div class="turn-output">
                  {#if turn.response}
                    {turn.response}
                  {:else if turn.status === "streaming"}
                    {statusText || "Working"}
                  {:else}
                    No output recorded.
                  {/if}
                </div>
              </section>
            </article>
          {/each}
        </div>
      {/if}

      <form onsubmit={(event) => { event.preventDefault(); send(); }}>
        <input bind:value={message} aria-label="Message" disabled={busy} />
        <button disabled={busy || !message.trim()}>{busy ? statusText || "Working" : "Send"}</button>
      </form>
    </section>

    <details class="panel tools-panel" bind:open={toolsOpen}>
      <summary>
        <div class="panel-title">
          <h2>Available Tools</h2>
          <span>{availableTools.length} exposed | {toolsOpen ? "collapse" : "expand"}</span>
        </div>
      </summary>
      {#if toolsOpen}
        <div class="tool-grid">
          {#each availableTools as tool}
            <article class="tool-card">
              <strong>{tool.name}</strong>
              <p>{tool.purpose}</p>
              <small>{tool.args.join(", ")}</small>
            </article>
          {/each}
        </div>
      {/if}
    </details>
  </section>
</main>

<style>
  main {
    width: min(1440px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 3rem;
    min-height: 100vh;
  }

  header {
    margin-bottom: 1rem;
    padding: 1rem;
    border: 1px solid rgba(98, 114, 164, 0.5);
    border-radius: 8px;
    background: rgba(33, 34, 44, 0.82);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.28);
  }

  .eyebrow {
    margin: 0 0 .35rem;
    color: var(--dracula-purple);
    font-family: var(--font-heading);
    font-size: .78rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  h1,
  h2 {
    margin: 0;
  }

  h1 {
    color: var(--dracula-cyan);
    font-size: clamp(1.7rem, 3vw, 2.45rem);
    line-height: 1.05;
  }

  .workspace {
    display: grid;
    gap: 1rem;
    align-items: start;
  }

  .panel {
    min-width: 0;
    border: 1px solid rgba(98, 114, 164, 0.55);
    border-radius: 8px;
    padding: 1rem;
    background: rgba(33, 34, 44, 0.9);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
  }

  .panel-title {
    display: flex;
    gap: .75rem;
    align-items: center;
    justify-content: space-between;
    margin-bottom: .85rem;
  }

  summary {
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  .tools-panel .panel-title {
    margin-bottom: 0;
  }

  .tools-panel[open] .panel-title {
    margin-bottom: .85rem;
  }

  .panel-title h2 {
    color: var(--dracula-pink);
    font-size: 1rem;
  }

  .panel-title span {
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .72rem;
  }

  .panel-actions {
    display: flex;
    gap: .5rem;
    align-items: center;
  }

  .reset-button {
    min-height: 0;
    padding: .28rem .55rem;
    border-color: rgba(98, 114, 164, 0.72);
    background: rgba(68, 71, 90, 0.5);
    color: var(--dracula-muted);
    font-size: .78rem;
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: .5rem;
    margin-bottom: .85rem;
    border-bottom: 1px solid rgba(98, 114, 164, 0.38);
    padding-bottom: .65rem;
  }

  .tabs button {
    min-height: 0;
    padding: .45rem .72rem;
    border-color: rgba(98, 114, 164, 0.7);
    background: rgba(25, 26, 33, 0.58);
    color: var(--dracula-muted);
    font-family: var(--font-heading);
    font-size: .78rem;
  }

  .tabs button.active {
    border-color: rgba(245, 230, 99, 0.68);
    background: rgba(245, 230, 99, 0.12);
    color: var(--dracula-cyan);
  }

  .messages {
    display: grid;
    align-content: start;
    gap: .75rem;
    min-height: 33rem;
    max-height: 54rem;
    overflow: auto;
    padding: .25rem;
    white-space: pre-wrap;
  }

  article {
    border-radius: 8px;
  }

  article.user,
  article.agent {
    padding: .85rem;
    line-height: 1.55;
  }

  article.user {
    justify-self: end;
    max-width: 82%;
    border: 1px solid rgba(189, 147, 249, 0.42);
    background: rgba(189, 147, 249, 0.12);
  }

  article.agent {
    border: 1px solid rgba(68, 71, 90, 0.8);
    background: rgba(25, 26, 33, 0.68);
  }

  article.agent.streaming {
    border-color: rgba(189, 147, 249, 0.46);
  }

  article.agent.error {
    border-color: rgba(255, 85, 85, 0.5);
    background: rgba(255, 85, 85, 0.08);
  }

  .message-meta {
    display: flex;
    flex-wrap: wrap;
    gap: .4rem;
    margin-top: .65rem;
  }

  .message-meta span {
    padding: .22rem .42rem;
    border: 1px solid rgba(98, 114, 164, 0.62);
    border-radius: 8px;
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .68rem;
  }

  .placeholder {
    color: var(--dracula-muted);
  }

  form {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: .5rem;
    margin-top: 1rem;
  }

  input,
  button {
    min-height: 2.65rem;
    padding: .65rem .8rem;
  }

  .tool-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: .65rem;
  }

  .tool-card {
    display: grid;
    gap: .35rem;
    padding: .75rem;
    border: 1px solid rgba(68, 71, 90, 0.8);
    background: rgba(25, 26, 33, 0.56);
  }

  .tool-card strong {
    color: var(--dracula-cyan);
    font-family: var(--font-heading);
    font-size: .82rem;
  }

  .tool-card p {
    margin: 0;
    color: var(--dracula-muted);
    font-size: .86rem;
    line-height: 1.4;
  }

  .tool-card small {
    color: var(--dracula-comment);
  }

  .trace-turns {
    display: grid;
    align-content: start;
    gap: .85rem;
    min-height: 33rem;
    max-height: 54rem;
    overflow: auto;
    padding: .25rem;
  }

  .turn-trace {
    display: grid;
    gap: .8rem;
    padding: .9rem;
    border: 1px solid rgba(68, 71, 90, 0.84);
    background: rgba(25, 26, 33, 0.62);
  }

  .turn-trace.error {
    border-color: rgba(255, 85, 85, 0.5);
    background: rgba(255, 85, 85, 0.08);
  }

  .turn-head,
  .trace-head {
    display: flex;
    gap: .75rem;
    justify-content: space-between;
  }

  .turn-head strong {
    color: var(--dracula-cyan);
    font-family: var(--font-heading);
  }

  .turn-head span {
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .72rem;
  }

  .turn-section {
    display: grid;
    gap: .45rem;
  }

  blockquote,
  .turn-output {
    margin: 0;
    padding: .75rem;
    border: 1px solid rgba(68, 71, 90, 0.72);
    border-radius: 8px;
    background: rgba(33, 34, 44, 0.62);
    color: var(--dracula-muted);
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .trace-list {
    display: grid;
    gap: .75rem;
  }

  .trace-card {
    padding: .85rem;
    border: 1px solid rgba(68, 71, 90, 0.9);
    background: rgba(25, 26, 33, 0.62);
  }

  .trace-card.error {
    border-color: rgba(255, 85, 85, 0.5);
    background: rgba(255, 85, 85, 0.08);
  }

  .trace-head {
    margin-bottom: .75rem;
  }

  .trace-head strong {
    color: var(--dracula-green);
    font-family: var(--font-heading);
  }

  .trace-head span {
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .72rem;
  }

  .tao-row {
    display: grid;
    grid-template-columns: minmax(0, .9fr) minmax(0, .95fr) minmax(0, 1.15fr);
    gap: .75rem;
  }

  .tao-row > div {
    min-width: 0;
    padding: .7rem;
    border: 1px solid rgba(68, 71, 90, 0.72);
    border-radius: 8px;
    background: rgba(33, 34, 44, 0.7);
  }

  .label {
    display: block;
    margin-bottom: .35rem;
    color: var(--dracula-purple);
    font-family: var(--font-heading);
    font-size: .7rem;
    text-transform: uppercase;
  }

  .tao-row p,
  .empty,
  .turn-output {
    margin: 0;
    color: var(--dracula-muted);
    line-height: 1.45;
  }

  code {
    display: block;
    overflow: auto;
    color: var(--dracula-yellow);
    font-size: .78rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  @media (max-width: 1100px) {
    .tao-row {
      grid-template-columns: 1fr;
    }

    .tool-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .tool-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
