<script lang="ts">
  import type { PipelineState } from "../../../framework/types.js";

  // ── Tab ─────────────────────────────────────────────────
  let activeTab = $state<"agent" | "deconstructed">("agent");

  // ── Shared state ────────────────────────────────────────
  let userInput = $state("");
  let isStreaming = $state(false);
  let streamedResponse = $state("");
  let error = $state("");

  // ── Agent view ──────────────────────────────────────────
  let stateSnapshots = $state<{ label: string; state: PipelineState }[]>([]);
  let expandedIndex = $state<number | null>(null);

  // ── Deconstructed view ──────────────────────────────────
  let currentStage = $state("idle");
  let systemPromptText = $state("");
  let lastUserInput = $state("");
  let runSnapshots = $state<PipelineState[]>([]);
  let expandedDeconIndex = $state<number | null>(null);

  // Pipeline node derived states
  const STAGES = [
    "idle",
    "start",
    "input-added",
    "analyzing",
    "analysis-complete",
    "done",
  ];
  function si(s: string) {
    return STAGES.indexOf(s);
  }

  let startNode = $derived(
    currentStage === "idle"
      ? "pending"
      : currentStage === "start"
        ? "active"
        : "completed",
  );
  let stage1Node = $derived(
    si(currentStage) <= si("start")
      ? "pending"
      : currentStage === "input-added"
        ? "active"
        : "completed",
  );
  let stage2Node = $derived(
    si(currentStage) <= si("input-added")
      ? "pending"
      : currentStage === "analyzing" ||
          currentStage === "analysis-complete"
        ? "active"
        : "completed",
  );
  let endNode = $derived(currentStage === "done" ? "active" : "pending");

  let arrow1Lit = $derived(si(currentStage) > si("start"));
  let arrow2Lit = $derived(si(currentStage) > si("input-added"));
  let arrow3Lit = $derived(currentStage === "done");

  // ── Submit ──────────────────────────────────────────────
  async function handleSubmit() {
    if (!userInput.trim() || isStreaming) return;

    const text = userInput.trim();
    userInput = "";
    streamedResponse = "";
    error = "";
    isStreaming = true;

    currentStage = "idle";
    runSnapshots = [];
    expandedDeconIndex = null;
    systemPromptText = "";
    lastUserInput = "";

    try {
      const response = await fetch("/lab/01/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sessionId: `session-${Date.now()}` }),
      });

      if (!response.ok) {
        error = `Server error: ${response.status}`;
        isStreaming = false;
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === "meta") {
            systemPromptText = data.systemPrompt;
            lastUserInput = data.userPrompt;
          } else if (data.type === "stage") {
            currentStage = data.stage;
          } else if (data.type === "token") {
            streamedResponse += data.token;
          } else if (data.type === "state") {
            const snap = data.state as PipelineState;

            const label =
              snap.analyses.length > 0
                ? `state${stateSnapshots.length} (input + analysis)`
                : snap.inputs.length > 0
                  ? `state${stateSnapshots.length} (input added)`
                  : `state${stateSnapshots.length} (empty)`;
            stateSnapshots = [...stateSnapshots, { label, state: snap }];
            expandedIndex = stateSnapshots.length - 1;

            runSnapshots = [...runSnapshots, snap];
            expandedDeconIndex = runSnapshots.length - 1;
          } else if (data.type === "error") {
            error = data.message;
          }
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Connection failed";
    }

    isStreaming = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  function toggleSnapshot(index: number) {
    expandedIndex = expandedIndex === index ? null : index;
  }

  function toggleDeconSnapshot(index: number) {
    expandedDeconIndex = expandedDeconIndex === index ? null : index;
  }
</script>

<div class="page-wrapper">
  <!-- ─── Tab Bar ─────────────────────────────────────── -->
  <div class="tab-bar">
    <button
      class="tab-btn"
      class:active={activeTab === "agent"}
      onclick={() => (activeTab = "agent")}
    >
      Agent
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === "deconstructed"}
      onclick={() => (activeTab = "deconstructed")}
    >
      Deconstructed
    </button>
  </div>

  {#if activeTab === "agent"}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- AGENT VIEW                                          -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="lab-container">
      <div class="chat-panel">
        <div class="panel-header">
          <h2>Lab 01 — Your First Hunting Agent</h2>
          <p class="subtitle">
            Type an observation. The agent will analyze it.
          </p>
        </div>

        <div class="chat-history">
          {#if streamedResponse || isStreaming}
            <div class="message agent-message">
              <div class="message-label">Agent</div>
              <div class="message-body">
                {streamedResponse}
                {#if isStreaming}<span class="cursor">|</span>{/if}
              </div>
            </div>
          {/if}
          {#if error}
            <div class="message error-message">
              <div class="message-body">{error}</div>
            </div>
          {/if}
        </div>

        <div class="input-area">
          <textarea
            bind:value={userInput}
            onkeydown={handleKeydown}
            placeholder="Type your observation here... (Enter to send)"
            disabled={isStreaming}
            rows="3"
          ></textarea>
          <button
            onclick={handleSubmit}
            disabled={isStreaming || !userInput.trim()}
          >
            {isStreaming ? "Streaming..." : "Send"}
          </button>
        </div>
      </div>

      <div class="state-panel">
        <div class="panel-header">
          <h2>State Inspector</h2>
          <p class="subtitle">Each transition creates a new snapshot</p>
        </div>

        <div class="snapshots">
          {#if stateSnapshots.length === 0}
            <div class="empty-state">
              Submit an observation to see state transitions appear here.
            </div>
          {/if}

          {#each stateSnapshots as { label, state }, i}
            <div class="snapshot" class:expanded={expandedIndex === i}>
              <button
                class="snapshot-header"
                onclick={() => toggleSnapshot(i)}
              >
                <span class="snapshot-label">{label}</span>
                <span class="snapshot-counts">
                  inputs: {state.inputs.length} | analyses: {state.analyses
                    .length}
                </span>
                <span class="snapshot-toggle">
                  {expandedIndex === i ? "−" : "+"}
                </span>
              </button>

              {#if expandedIndex === i}
                <div class="snapshot-detail">
                  <div class="detail-section">
                    <div class="detail-key">sessionId</div>
                    <div class="detail-value">{state.sessionId}</div>
                  </div>
                  {#if state.inputs.length > 0}
                    <div class="detail-section">
                      <div class="detail-key">inputs</div>
                      {#each state.inputs as inp}
                        <div class="detail-entry">
                          <span class="entry-id">{inp.id}</span>
                          <span class="entry-value">"{inp.value}"</span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                  {#if state.analyses.length > 0}
                    <div class="detail-section">
                      <div class="detail-key">analyses</div>
                      {#each state.analyses as an}
                        <div class="detail-entry">
                          <span class="entry-id">{an.id}</span>
                          <span class="entry-meta">
                            model: {an.model} | basedOn: {an.basedOnId}
                          </span>
                          <span class="entry-value"
                            >"{an.insight.slice(0, 200)}{an.insight.length > 200
                              ? "..."
                              : ""}"</span
                          >
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- DECONSTRUCTED VIEW                                  -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="decon-container">
      <!-- Pipeline Flow -->
      <div class="pipeline-section">
        <h3 class="section-title">Pipeline Flow</h3>
        <div class="pipeline-flow">
          <div class="pnode pnode-label" class:pn-active={startNode === "active"} class:pn-completed={startNode === "completed"}>
            START
          </div>
          <div class="parrow" class:lit={arrow1Lit}>→</div>
          <div class="pstage" class:pn-active={stage1Node === "active"} class:pn-completed={stage1Node === "completed"}>
            <span class="pstage-label">STAGE 1</span>
            <span class="pstage-fn">addInput()</span>
          </div>
          <div class="parrow" class:lit={arrow2Lit}>→</div>
          <div class="pstage" class:pn-active={stage2Node === "active"} class:pn-completed={stage2Node === "completed"}>
            <span class="pstage-label">STAGE 2</span>
            <span class="pstage-fn">addAnalysis()</span>
          </div>
          <div class="parrow" class:lit={arrow3Lit}>→</div>
          <div class="pnode pnode-label" class:pn-active={endNode === "active"}>
            END
          </div>
        </div>
      </div>

      <!-- Main: State Snapshots + API Call -->
      <div class="decon-main">
        <!-- State Snapshots -->
        <div class="decon-states">
          <h3 class="section-title">State Snapshots</h3>
          {#if runSnapshots.length === 0}
            <div class="empty-hint">
              Submit an observation to see state transitions.
            </div>
          {:else}
            <div class="state-boxes">
              {#each runSnapshots as snap, i}
                <button
                  class="state-box"
                  class:frozen={i < runSnapshots.length - 1 &&
                    currentStage !== "idle"}
                  class:current={i === runSnapshots.length - 1}
                  onclick={() => toggleDeconSnapshot(i)}
                >
                  <div class="sb-header">
                    <span class="sb-name"
                      >STATE<sub>{i}</sub></span
                    >
                    {#if i < runSnapshots.length - 1 && currentStage !== "idle"}
                      <span class="sb-frozen">frozen</span>
                    {/if}
                  </div>
                  <div class="sb-row">
                    <span class="sb-label">Inputs</span>
                    <span
                      class="sb-count"
                      class:highlighted={snap.inputs.length > 0}
                      >{snap.inputs.length}</span
                    >
                  </div>
                  <div class="sb-row">
                    <span class="sb-label">Analyses</span>
                    <span
                      class="sb-count"
                      class:highlighted={snap.analyses.length > 0}
                      >{snap.analyses.length}</span
                    >
                  </div>

                  {#if expandedDeconIndex === i}
                    <div class="sb-detail">
                      <div class="sbd-group">
                        <span class="sbd-key">inputs:</span>
                        {#if snap.inputs.length === 0}
                          <span class="sbd-empty">[]</span>
                        {:else}
                          {#each snap.inputs as inp}
                            <div class="sbd-entry">
                              <div>
                                <span class="sbd-field">id:</span>
                                <span class="sbd-val">{inp.id}</span>
                              </div>
                              <div>
                                <span class="sbd-field">value:</span>
                                <span class="sbd-val sbd-str"
                                  >"{inp.value.length > 60
                                    ? inp.value.slice(0, 60) + "..."
                                    : inp.value}"</span
                                >
                              </div>
                            </div>
                          {/each}
                        {/if}
                      </div>
                      <div class="sbd-group">
                        <span class="sbd-key">analyses:</span>
                        {#if snap.analyses.length === 0}
                          <span class="sbd-empty">[]</span>
                        {:else}
                          {#each snap.analyses as an}
                            <div class="sbd-entry">
                              <div>
                                <span class="sbd-field">id:</span>
                                <span class="sbd-val">{an.id}</span>
                              </div>
                              <div>
                                <span class="sbd-field">model:</span>
                                <span class="sbd-val">{an.model}</span>
                              </div>
                              <div>
                                <span class="sbd-field">basedOn:</span>
                                <span class="sbd-val">{an.basedOnId}</span>
                              </div>
                              <div>
                                <span class="sbd-field">insight:</span>
                                <span class="sbd-val sbd-str"
                                  >"{an.insight.length > 80
                                    ? an.insight.slice(0, 80) + "..."
                                    : an.insight}"</span
                                >
                              </div>
                            </div>
                          {/each}
                        {/if}
                      </div>
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- API Call Inspector -->
        <div class="decon-api">
          <h3 class="section-title">API Call (Stage 2)</h3>
          {#if !systemPromptText && !lastUserInput}
            <div class="empty-hint">
              API call details will appear when the model is invoked.
            </div>
          {:else}
            <div class="api-code-block">
              <div class="code-line">
                <span class="c-fn">provider</span><span class="c-p">.</span
                ><span class="c-fn">streamInvoke</span><span class="c-p"
                  >({"{"}</span
                >
              </div>
              <div class="code-line indent">
                <span class="c-key">systemPrompt</span><span class="c-p"
                  >: </span
                ><span class="c-str">"{systemPromptText}"</span><span
                  class="c-p">,</span
                >
              </div>
              <div class="code-line indent">
                <span class="c-key">userPrompt</span><span class="c-p"
                  >: </span
                ><span class="c-str">"{lastUserInput}"</span>
              </div>
              <div class="code-line">
                <span class="c-p">{"}"})</span>
              </div>
            </div>

            {#if streamedResponse || isStreaming}
              <div class="api-response">
                <div class="response-label">Response:</div>
                <div class="response-body">
                  {streamedResponse}
                  {#if isStreaming}<span class="cursor">|</span>{/if}
                </div>
              </div>
            {/if}
          {/if}
        </div>
      </div>

      <!-- Input -->
      <div class="decon-input">
        <textarea
          bind:value={userInput}
          onkeydown={handleKeydown}
          placeholder="Type your observation here... (Enter to send)"
          disabled={isStreaming}
          rows="2"
        ></textarea>
        <button
          onclick={handleSubmit}
          disabled={isStreaming || !userInput.trim()}
        >
          {isStreaming ? "Streaming..." : "Send"}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  /* ═══ Page wrapper & tabs ═══════════════════════════════ */
  .page-wrapper {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #0a0a0f;
  }

  .tab-bar {
    display: flex;
    gap: 0;
    background: #0a0a0f;
    border-bottom: 1px solid #1a1a2e;
    padding: 0 1rem;
    flex-shrink: 0;
  }

  .tab-btn {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0.85rem 1.5rem;
    font-family: "JetBrains Mono", monospace;
    font-size: 1rem;
    color: #8a8a9a;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    color: #c0c0d0;
  }

  .tab-btn.active {
    color: #f5e663;
    border-bottom-color: #f5e663;
  }

  /* ═══ AGENT VIEW ═══════════════════════════════════════ */
  .lab-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex: 1;
    gap: 1px;
    background: #1a1a2e;
    overflow: hidden;
  }

  .chat-panel,
  .state-panel {
    display: flex;
    flex-direction: column;
    background: #0a0a0f;
    overflow: hidden;
  }

  .panel-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #1a1a2e;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 1.15rem;
    color: #e8e8f0;
    font-weight: 600;
  }

  .subtitle {
    margin: 0.25rem 0 0;
    font-size: 0.95rem;
    color: #9a9aaa;
  }

  .chat-history {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .message {
    margin-bottom: 1rem;
  }

  .message-label {
    font-size: 0.9rem;
    color: #4a9eff;
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .message-body {
    font-size: 1.05rem;
    line-height: 1.6;
    white-space: pre-wrap;
    color: #d0d0da;
  }

  .error-message .message-body {
    color: #ff6b6b;
  }

  .cursor {
    animation: blink 0.8s step-end infinite;
    color: #4a9eff;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

  .input-area {
    padding: 1rem 1.5rem;
    border-top: 1px solid #1a1a2e;
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
  }

  textarea {
    flex: 1;
    background: #12121a;
    border: 1px solid #2a2a3e;
    color: #e0e0ea;
    padding: 0.85rem;
    font-family: inherit;
    font-size: 1.05rem;
    border-radius: 4px;
    resize: none;
    line-height: 1.4;
  }

  textarea:focus {
    outline: none;
    border-color: #4a9eff;
  }

  textarea:disabled {
    opacity: 0.5;
  }

  button {
    background: #4a9eff;
    color: #0a0a0f;
    border: none;
    padding: 0.85rem 1.75rem;
    font-family: inherit;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 4px;
    cursor: pointer;
  }

  button:disabled {
    background: #2a2a3e;
    color: #5a5a6a;
    cursor: not-allowed;
  }

  /* State inspector */
  .snapshots {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .empty-state {
    color: #8a8a9a;
    font-size: 1rem;
    padding: 2rem 1rem;
    text-align: center;
  }

  .snapshot {
    border: 1px solid #1a1a2e;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    overflow: hidden;
  }

  .snapshot.expanded {
    border-color: #2a3a5e;
  }

  .snapshot-header {
    width: 100%;
    background: #12121a;
    border: none;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #c8c8d0;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.98rem;
    text-align: left;
    border-radius: 0;
  }

  .snapshot-header:hover {
    background: #16162a;
  }

  .snapshot-label {
    color: #4a9eff;
    font-weight: 600;
    white-space: nowrap;
  }

  .snapshot-counts {
    color: #8a8a9a;
    font-size: 0.9rem;
    flex: 1;
  }

  .snapshot-toggle {
    color: #4a4a5a;
    font-size: 1rem;
    width: 1.2rem;
    text-align: center;
  }

  .snapshot-detail {
    padding: 0.6rem 0.8rem;
    border-top: 1px solid #1a1a2e;
    background: #0d0d14;
  }

  .detail-section {
    margin-bottom: 0.75rem;
  }

  .detail-section:last-child {
    margin-bottom: 0;
  }

  .detail-key {
    font-size: 0.88rem;
    color: #6aaa6a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .detail-value {
    font-size: 0.95rem;
    color: #b0b0c0;
  }

  .detail-entry {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid #1a1a22;
  }

  .detail-entry:last-child {
    border-bottom: none;
  }

  .entry-id {
    font-size: 0.88rem;
    color: #4a9eff;
  }

  .entry-meta {
    font-size: 0.85rem;
    color: #8a8a9a;
  }

  .entry-value {
    font-size: 0.92rem;
    color: #b0b0c0;
    word-break: break-word;
  }

  /* ═══ DECONSTRUCTED VIEW ═══════════════════════════════ */
  .decon-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    background: #0a0a0f;
    overflow: hidden;
  }

  .section-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.92rem;
    color: #9a9aaa;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0 0 0.75rem;
  }

  /* ─── Pipeline flow ─────────────────────────────────── */
  .pipeline-section {
    padding: 1.25rem 2rem;
    border-bottom: 1px solid #1a1a2e;
    flex-shrink: 0;
  }

  .pipeline-flow {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    justify-content: center;
  }

  .pnode {
    font-family: "JetBrains Mono", monospace;
    font-size: 1.15rem;
    font-weight: 700;
    padding: 0.4rem 0.6rem;
    transition: all 0.3s ease;
  }

  .pnode-label {
    color: #5a5a6a;
  }

  .pnode-label.pn-active {
    color: #50fa7b;
    text-shadow: 0 0 12px rgba(80, 250, 123, 0.5);
  }

  .pnode-label.pn-completed {
    color: #50fa7b;
  }

  .pstage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.7rem 2rem;
    border: 1px solid #3a3a4e;
    border-radius: 4px;
    background: #12121a;
    transition: all 0.3s ease;
  }

  .pstage.pn-active {
    border-color: #bd93f9;
    box-shadow: 0 0 14px rgba(189, 147, 249, 0.3);
    animation: pulseGlow 2s ease-in-out infinite;
  }

  .pstage.pn-completed {
    border-color: #50fa7b;
    box-shadow: 0 0 8px rgba(80, 250, 123, 0.15);
  }

  .pstage-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.82rem;
    color: #9a9aaa;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .pstage-fn {
    font-family: "JetBrains Mono", monospace;
    font-size: 1.15rem;
    color: #50fa7b;
    font-weight: 500;
  }

  .parrow {
    font-family: "JetBrains Mono", monospace;
    font-size: 1.8rem;
    color: #5a5a6a;
    transition: color 0.3s ease;
    user-select: none;
  }

  .parrow.lit {
    color: #50fa7b;
  }

  @keyframes pulseGlow {
    0%,
    100% {
      box-shadow: 0 0 8px rgba(189, 147, 249, 0.2);
    }
    50% {
      box-shadow: 0 0 18px rgba(189, 147, 249, 0.5);
    }
  }

  /* ─── Main area (states + api) ──────────────────────── */
  .decon-main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex: 1;
    overflow: hidden;
    gap: 1px;
    background: #1a1a2e;
  }

  .decon-states,
  .decon-api {
    padding: 1.25rem 1.5rem;
    background: #0a0a0f;
    overflow-y: auto;
  }

  .empty-hint {
    color: #7a7a8a;
    font-size: 1rem;
    padding: 1.5rem 0;
  }

  /* ─── State boxes ───────────────────────────────────── */
  .state-boxes {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .state-box {
    border: 1px solid #f5e663;
    border-radius: 4px;
    padding: 0.6rem 0.75rem;
    background: #12121a;
    cursor: pointer;
    transition: all 0.3s ease;
    animation: fadeSlideIn 0.4s ease;
    text-align: left;
    width: 100%;
    font-family: inherit;
    color: inherit;
  }

  .state-box:hover {
    background: #16162a;
  }

  .state-box.frozen {
    border-color: #4a4a2a;
    opacity: 0.7;
  }

  .state-box.current {
    border-color: #f5e663;
    box-shadow: 0 0 10px rgba(245, 230, 99, 0.15);
  }

  .sb-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4rem;
  }

  .sb-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 1.05rem;
    color: #bd93f9;
    font-weight: 600;
  }

  .sb-name sub {
    font-size: 0.65em;
  }

  .sb-frozen {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.72rem;
    color: #6a6a4a;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border: 1px solid #5a5a3a;
    padding: 0.15rem 0.4rem;
    border-radius: 2px;
  }

  .sb-row {
    display: flex;
    justify-content: space-between;
    padding: 0.2rem 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.98rem;
  }

  .sb-label {
    color: #c0c0ca;
  }

  .sb-count {
    color: #8a8a9a;
    font-weight: 600;
  }

  .sb-count.highlighted {
    color: #f5e663;
  }

  /* State box detail (expanded) */
  .sb-detail {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #1a1a2e;
  }

  .sbd-group {
    margin-bottom: 0.4rem;
  }

  .sbd-group:last-child {
    margin-bottom: 0;
  }

  .sbd-key {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.85rem;
    color: #6aaa6a;
  }

  .sbd-empty {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.88rem;
    color: #6a6a7a;
    margin-left: 0.5rem;
  }

  .sbd-entry {
    background: #0d0d14;
    padding: 0.4rem 0.6rem;
    border-radius: 3px;
    margin: 0.25rem 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .sbd-field {
    color: #bd93f9;
  }

  .sbd-val {
    color: #a0a0b0;
  }

  .sbd-str {
    color: #f1fa8c;
  }

  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ─── API Call Inspector ────────────────────────────── */
  .decon-api {
    display: flex;
    flex-direction: column;
  }

  .api-code-block {
    background: #0d0d14;
    border: 1px solid #1a1a2e;
    border-radius: 4px;
    padding: 0.85rem 1.1rem;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.95rem;
    line-height: 1.7;
    flex-shrink: 0;
  }

  .code-line {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .code-line.indent {
    padding-left: 1.5rem;
  }

  .c-fn {
    color: #50fa7b;
  }

  .c-key {
    color: #bd93f9;
  }

  .c-str {
    color: #f1fa8c;
  }

  .c-p {
    color: #6a6a7a;
  }

  .api-response {
    margin-top: 0.75rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .response-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.85rem;
    color: #4a9eff;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.4rem;
  }

  .response-body {
    font-size: 1rem;
    line-height: 1.6;
    color: #d0d0da;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* ─── Deconstructed input area ──────────────────────── */
  .decon-input {
    padding: 0.75rem 1.5rem;
    border-top: 1px solid #1a1a2e;
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
    flex-shrink: 0;
    background: #0a0a0f;
  }
</style>
