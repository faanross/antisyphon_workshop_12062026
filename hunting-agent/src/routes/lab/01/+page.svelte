<script lang="ts">
  import type { PipelineState } from "../../../framework/types.js";
  import BrowserIcon from "phosphor-svelte/lib/BrowserIcon";
  import HardDrivesIcon from "phosphor-svelte/lib/HardDrivesIcon";
  import PlugsConnectedIcon from "phosphor-svelte/lib/PlugsConnectedIcon";
  import StackIcon from "phosphor-svelte/lib/StackIcon";
  import LightningIcon from "phosphor-svelte/lib/LightningIcon";
  import CopyIcon from "phosphor-svelte/lib/CopyIcon";
  import CursorClickIcon from "phosphor-svelte/lib/CursorClickIcon";
  import ShieldCheckIcon from "phosphor-svelte/lib/ShieldCheckIcon";
  import GearIcon from "phosphor-svelte/lib/GearIcon";
  import BroadcastIcon from "phosphor-svelte/lib/BroadcastIcon";
  import LockKeyIcon from "phosphor-svelte/lib/LockKeyIcon";
  import ArrowDownIcon from "phosphor-svelte/lib/ArrowDownIcon";
  import ArrowRightIcon from "phosphor-svelte/lib/ArrowRightIcon";
  import TerminalWindowIcon from "phosphor-svelte/lib/TerminalWindowIcon";
  import ChatCircleTextIcon from "phosphor-svelte/lib/ChatCircleTextIcon";
  import ArrowsClockwiseIcon from "phosphor-svelte/lib/ArrowsClockwiseIcon";
  import MagnifyingGlassIcon from "phosphor-svelte/lib/MagnifyingGlassIcon";
  import CodeIcon from "phosphor-svelte/lib/CodeIcon";
  import QuestionIcon from "phosphor-svelte/lib/QuestionIcon";

  // ── Tab ─────────────────────────────────────────────────
  let activeTab = $state<"instructions" | "agent" | "deconstructed" | "code">("instructions");

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
      class:active={activeTab === "instructions"}
      onclick={() => (activeTab = "instructions")}
    >
      Instructions
    </button>
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
    <button
      class="tab-btn"
      class:active={activeTab === "code"}
      onclick={() => (activeTab = "code")}
    >
      Code
    </button>
  </div>

  {#if activeTab === "instructions"}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- INSTRUCTIONS VIEW  (the workshop walkthrough)        -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="code-view">
      <div class="code-inner">
        <header class="cv-hero">
          <span class="cv-eyebrow">Lab 01 · Walkthrough</span>
          <h2>Talk to your first agent</h2>
          <p>
            This first lab is the simplest possible loop: <strong>text in, text out</strong>.
            You send the agent an observation or a question, and it answers. That's it —
            no memory, no tools, no skills yet. Work through the four steps below in order;
            each one sets up something you'll build on in later labs.
          </p>
        </header>

        <ol class="flow">
          <!-- Step 1 -->
          <li class="flow-step" style="--d: 0ms">
            <span class="flow-rail"><ChatCircleTextIcon size={22} weight="duotone" /></span>
            <div class="flow-body">
              <div class="flow-top">
                <span class="flow-title">1 · Ask it anything</span>
                <span class="flow-where">Agent tab</span>
              </div>
              <p>
                Switch to the <strong>Agent</strong> tab, type something into the box, and
                press <strong>Send</strong>. Watch the answer stream back word-by-word.
                Treat it like any chatbot — ask a question or paste an observation:
              </p>
              <div class="gd-egs">
                <span class="gd-eg">What is beaconing in a network?</span>
                <span class="gd-eg">A host pings the same IP every 60 seconds. Suspicious?</span>
              </div>
            </div>
          </li>

          <!-- Step 2 -->
          <li class="flow-step" style="--d: 110ms">
            <span class="flow-rail"><ArrowsClockwiseIcon size={22} weight="duotone" /></span>
            <div class="flow-body">
              <div class="flow-top">
                <span class="flow-title">2 · Now ask a follow-up</span>
                <span class="flow-where">watch it forget</span>
              </div>
              <p>
                Send a second message that depends on the first — for example
                <em>"what did I just ask you?"</em> Notice it has <strong>no idea</strong>.
                Each message is answered from a blank slate: there's no context window and
                nothing is saved between turns yet.
              </p>
              <div class="gd-note">
                <QuestionIcon size={18} weight="duotone" />
                <span>
                  This isn't a bug — it's the starting point. Giving the agent a
                  <strong>memory</strong> is exactly what Lab 03 (Context Window) adds.
                </span>
              </div>
            </div>
          </li>

          <!-- Step 3 -->
          <li class="flow-step" style="--d: 220ms">
            <span class="flow-rail"><MagnifyingGlassIcon size={22} weight="duotone" /></span>
            <div class="flow-body">
              <div class="flow-top">
                <span class="flow-title">3 · Open the Deconstructed tab</span>
                <span class="flow-where">Deconstructed tab</span>
              </div>
              <p>
                Run the same thing again, but this time on the <strong>Deconstructed</strong>
                tab. Watch it move <strong>stage by stage</strong> —
                <code>STAGE 1 · addInput()</code> records your text, then
                <code>STAGE 2 · addAnalysis()</code> calls the model and records the answer.
                Then look closely at the <strong>API Call</strong> panel: every request is
                built from <em>two</em> separate prompts. Make sure you understand the
                difference:
              </p>

              <div class="gd-prompts">
                <div class="gd-prompt">
                  <div class="gd-prompt-head">
                    <GearIcon size={18} weight="duotone" />
                    <span class="gd-tag gd-tag-sys">systemPrompt</span>
                  </div>
                  <p>
                    The agent's <strong>standing instructions</strong> — who it is and how
                    it should behave. Set once by the developer and sent <em>unchanged</em>
                    on every turn. You never type this.
                  </p>
                </div>
                <div class="gd-prompt">
                  <div class="gd-prompt-head">
                    <ChatCircleTextIcon size={18} weight="duotone" />
                    <span class="gd-tag gd-tag-usr">userPrompt</span>
                  </div>
                  <p>
                    <strong>Your message</strong> — the observation or question you just
                    typed. This is the part that changes every single turn.
                  </p>
                </div>
              </div>
            </div>
          </li>

          <!-- Step 4 -->
          <li class="flow-step" style="--d: 330ms">
            <span class="flow-rail"><CodeIcon size={22} weight="duotone" /></span>
            <div class="flow-body">
              <div class="flow-top">
                <span class="flow-title">4 · Curious how it's built?</span>
                <span class="flow-where">Code tab · optional</span>
              </div>
              <p>
                If you want to see what actually happens between pressing Send and the
                answer streaming back, the <strong>Code</strong> tab is an optional,
                visual walk through the architecture — the browser-to-server wall, immutable
                state, the provider interface, and streaming. Skip it freely if you just
                want to play.
              </p>
            </div>
          </li>
        </ol>

        <aside class="cv-callout">
          <TerminalWindowIcon size={22} weight="duotone" />
          <p>
            <strong>The whole point of Lab 01:</strong> get one clean request/response loop
            working end to end. Everything else in the workshop — memory, tools, MCP,
            skills — is a layer added on top of this exact loop.
          </p>
        </aside>
      </div>
    </div>
  {:else if activeTab === "agent"}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- AGENT VIEW                                          -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="lab-container">
      <div class="chat-panel">
        <div class="panel-header">
          <h2>Lab 01 — Our First Agent</h2>
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
  {:else if activeTab === "deconstructed"}
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
  {:else}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- CODE VIEW  (architectural reference, non-interactive)-->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="code-view">
      <div class="code-inner">
        <!-- Intro -->
        <header class="cv-hero">
          <span class="cv-eyebrow">Under the Hood</span>
          <h2>How this lab actually works</h2>
          <p>
            This is optional reading for the curious. You don't need any of it to
            run the lab — but if you want to know what happens between pressing
            <strong>Send</strong> and seeing the answer stream back, here is the
            whole machine, from a high level. Every box maps to a real file you
            can open afterwards.
          </p>
          <div class="cv-mental-model">
            <BrowserIcon size={20} weight="duotone" />
            <span>Your browser</span>
            <span class="cv-mm-sep">⇄</span>
            <HardDrivesIcon size={20} weight="duotone" />
            <span>A small server</span>
            <span class="cv-mm-sep">⇄</span>
            <PlugsConnectedIcon size={20} weight="duotone" />
            <span>The model</span>
          </div>
        </header>

        <!-- ── The journey: vertical execution flow ── -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">A</span> The journey of one observation<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            Follow a single message from the moment you hit Send. Each step is one
            function call, in order, top to bottom.
          </p>

          <ol class="flow">
            <li class="flow-step" style="--d: 0ms">
              <span class="flow-rail"><CursorClickIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">You press Send</span>
                  <span class="flow-where">browser</span>
                </div>
                <p>
                  Your typed observation is bundled into a request. The browser never
                  talks to the model directly — it asks the server to.
                </p>
              </div>
            </li>

            <li class="flow-step" style="--d: 90ms">
              <span class="flow-rail"><ArrowDownIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">The browser asks the server</span>
                  <span class="flow-where">network · POST</span>
                </div>
                <p>
                  <code>fetch("/lab/01/api/analyze")</code> sends your observation to
                  a tiny server that runs alongside the app. The browser never talks
                  to the AI directly — and that is on purpose (see <em>The wall</em> below).
                </p>
              </div>
            </li>

            <li class="flow-step" style="--d: 180ms">
              <span class="flow-rail"><GearIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">The server chooses a model</span>
                  <span class="flow-where">server · provider.ts</span>
                </div>
                <p>
                  <code>selectProvider()</code> reads <code>LLM_PROVIDER</code> from your
                  <code>.env</code> file and hands back the matching client — Gemini,
                  OpenAI, Anthropic, Claude Code, or Codex. The rest of the code
                  doesn't care which one you picked.
                </p>
              </div>
            </li>

            <li class="flow-step" style="--d: 270ms">
              <span class="flow-rail"><StackIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">It builds state, one step at a time</span>
                  <span class="flow-where">server · state.ts</span>
                </div>
                <p>
                  <code>createPipelineState()</code> makes an empty record, then
                  <code>addInput()</code> records your observation. Each step returns a
                  <strong>brand-new snapshot</strong> rather than editing the old one —
                  which is why the State Inspector can show STATE₀, STATE₁, STATE₂ side
                  by side.
                </p>
              </div>
            </li>

            <li class="flow-step" style="--d: 360ms">
              <span class="flow-rail"><LightningIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">It calls the model and streams tokens</span>
                  <span class="flow-where">server · gemini.ts (or any provider)</span>
                </div>
                <p>
                  <code>provider.streamInvoke(&#123; systemPrompt, userPrompt &#125;)</code>
                  sends both prompts to the model and yields the answer
                  <strong>word-by-word</strong> as it is generated, instead of waiting
                  for the whole thing.
                </p>
              </div>
            </li>

            <li class="flow-step" style="--d: 450ms">
              <span class="flow-rail"><CopyIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">It records the result</span>
                  <span class="flow-where">server · state.ts</span>
                </div>
                <p>
                  Once the full answer is collected, <code>addAnalysis()</code> produces
                  <em>another</em> new snapshot (STATE₂) that now carries both your input
                  and the model's analysis, tagged with which input it was based on.
                </p>
              </div>
            </li>

            <li class="flow-step" style="--d: 540ms">
              <span class="flow-rail"><BroadcastIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">Everything streams back to the page</span>
                  <span class="flow-where">server → browser · SSE</span>
                </div>
                <p>
                  Throughout, the server emits a live feed of small events
                  (<code>meta</code>, <code>stage</code>, <code>token</code>, <code>state</code>).
                  The page reads them as they arrive and re-renders — the typing effect,
                  the pipeline lights, and the growing list of snapshots are all just
                  the UI reacting to that feed.
                </p>
              </div>
            </li>
          </ol>
        </details>

        <!-- ── Concept deep-dives ── -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">B</span> Four ideas worth understanding<span class="cv-chev" aria-hidden="true">▸</span></summary>

          <div class="cv-cards">
            <!-- Wall -->
            <article class="cv-card">
              <div class="cv-card-head">
                <LockKeyIcon size={26} weight="duotone" />
                <h4>The wall: browser vs server</h4>
              </div>
              <p>
                Your API key lives in <code>.env</code> on the <strong>server</strong>,
                and never touches the browser. That's the whole reason the lab has a
                little server at all: the browser asks, the server holds the secret and
                does the privileged call.
              </p>
              <div class="cv-wall">
                <div class="cv-wall-side">
                  <BrowserIcon size={22} weight="duotone" />
                  <span>Browser</span>
                  <small>your text only</small>
                </div>
                <div class="cv-wall-bar"><ShieldCheckIcon size={18} weight="fill" /></div>
                <div class="cv-wall-side cv-wall-secure">
                  <HardDrivesIcon size={22} weight="duotone" />
                  <span>Server</span>
                  <small>holds the API key 🔑</small>
                </div>
              </div>
            </article>

            <!-- Immutability -->
            <article class="cv-card">
              <div class="cv-card-head">
                <CopyIcon size={26} weight="duotone" />
                <h4>Copy, don't mutate</h4>
              </div>
              <p>
                State transitions never overwrite. They spread the old state into a new
                object and add to it, so previous snapshots stay frozen forever — easy
                to inspect, impossible to corrupt by accident.
              </p>
              <pre class="cv-code"><code><span class="c-key">function</span> <span class="c-fn">addInput</span>(state, entry) &#123;
  <span class="c-key">return</span> &#123;
    ...state,            <span class="c-cm">// copy everything</span>
    inputs: [...state.inputs, entry],
  &#125;;                   <span class="c-cm">// a NEW state object</span>
&#125;</code></pre>
              <div class="cv-chain">
                <span class="cv-chip">STATE₀</span>
                <ArrowRightIcon size={14} weight="bold" />
                <span class="cv-chip">STATE₁</span>
                <ArrowRightIcon size={14} weight="bold" />
                <span class="cv-chip cv-chip-live">STATE₂</span>
              </div>
            </article>

            <!-- Provider abstraction -->
            <article class="cv-card">
              <div class="cv-card-head">
                <PlugsConnectedIcon size={26} weight="duotone" />
                <h4>One interface, any model</h4>
              </div>
              <p>
                All the pipeline code knows is a single contract — <code>streamInvoke()</code>
                and <code>invoke()</code>. Every vendor is wrapped to fit it, so switching
                models is a one-line change in <code>.env</code>, not a rewrite.
              </p>
              <div class="cv-fanout">
                <span class="cv-chip cv-chip-iface">LLMProvider</span>
                <div class="cv-fan-arrows">
                  <ArrowDownIcon size={14} weight="bold" />
                </div>
                <div class="cv-fan-list">
                  <span class="cv-chip cv-sm">Gemini</span>
                  <span class="cv-chip cv-sm">OpenAI</span>
                  <span class="cv-chip cv-sm">Anthropic</span>
                  <span class="cv-chip cv-sm">Claude&nbsp;Code</span>
                  <span class="cv-chip cv-sm">Codex</span>
                </div>
              </div>
            </article>

            <!-- Streaming -->
            <article class="cv-card">
              <div class="cv-card-head">
                <LightningIcon size={26} weight="duotone" />
                <h4>Streaming, not waiting</h4>
              </div>
              <p>
                The provider is a generator that <code>yield</code>s each token the moment
                it arrives. The server relays those over a live connection, and the page
                appends them — that's the typewriter effect you see.
              </p>
              <p class="cv-card-note">
                True for the Gemini, OpenAI, Anthropic and Claude&nbsp;Code providers. The
                <code>codex-cli</code> provider is the one exception: the Codex CLI hands back the
                finished answer in one piece (no token deltas), so the harness re-chunks that text
                to keep the same effect — simulated, not live.
              </p>
              <div class="cv-stream">
                <span class="cv-tok">The</span>
                <span class="cv-tok">host</span>
                <span class="cv-tok">shows</span>
                <span class="cv-tok">beacon</span>
                <span class="cv-tok">like</span>
                <span class="cv-cursor">▌</span>
              </div>
            </article>
          </div>
        </details>

        <!-- ── File map ── -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">C</span> Where each piece lives<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            The whole lab is just a handful of small files. Here's the shape of it —
            open any of these afterwards to see the full detail.
          </p>

          <pre class="cv-tree"><code><span class="tr-dir">hunting-agent/src/</span>
│
├─ <span class="tr-dir">routes/lab/01/api/analyze/</span>
│  └─ <span class="tr-file">+server.ts</span>              <span class="tr-cm">← the endpoint that runs the agent: prompt, pipeline, event feed</span>
│
├─ <span class="tr-dir">lib/server/</span>
│  └─ <span class="tr-file">provider.ts</span>             <span class="tr-cm">← reads .env, picks the model</span>
│
└─ <span class="tr-dir">framework/</span>                  <span class="tr-cm">← the reusable engine (shared by every lab)</span>
   ├─ <span class="tr-file">state.ts</span>                <span class="tr-cm">← immutable state: addInput / addAnalysis</span>
   ├─ <span class="tr-file">types.ts</span>                <span class="tr-cm">← the data shapes (all readonly)</span>
   └─ <span class="tr-dir">providers/</span>
      ├─ <span class="tr-file">types.ts</span>             <span class="tr-cm">← the LLMProvider contract</span>
      └─ <span class="tr-file">gemini.ts</span> <span class="tr-cm">· openai · anthropic · claude-code · codex · mock</span></code></pre>
        </details>

        <!-- System prompt callout -->
        <aside class="cv-callout">
          <TerminalWindowIcon size={22} weight="duotone" />
          <p>
            <strong>Where is the system prompt?</strong> It's a single constant near the
            top of <code>+server.ts</code>, passed into <code>streamInvoke()</code> alongside
            your text. In Lab 01 it's deliberately one sentence — the plumbing is the lesson,
            not the prompt. Later labs are where prompts get rich.
          </p>
        </aside>
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

  /* ═══ CODE VIEW (architectural reference) ══════════════ */
  .code-view {
    flex: 1;
    overflow-y: auto;
    background:
      radial-gradient(1200px 400px at 50% -120px, rgba(189, 147, 249, 0.08), transparent),
      #0a0a0f;
  }

  .code-inner {
    max-width: 940px;
    margin: 0 auto;
    padding: 2.2rem 1.75rem 4rem;
    font-family: "JetBrains Mono", monospace;
  }

  .code-view code {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.86em;
    color: #f1fa8c;
    background: rgba(241, 250, 140, 0.07);
    border: 1px solid rgba(241, 250, 140, 0.12);
    border-radius: 3px;
    padding: 0.05em 0.35em;
    word-break: break-word;
  }

  .code-view strong { color: #e8e8f0; font-weight: 700; }
  .code-view em { color: #bd93f9; font-style: normal; }

  /* Hero */
  .cv-hero { animation: cvRise 0.5s ease both; }

  .cv-eyebrow {
    display: inline-block;
    color: #bd93f9;
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 0.6rem;
  }

  .cv-hero h2 {
    margin: 0;
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    line-height: 1.05;
    color: #f5f5fa;
    font-weight: 700;
  }

  .cv-hero p {
    max-width: 64ch;
    margin: 1rem 0 0;
    color: #b6b6c6;
    font-size: 0.98rem;
    line-height: 1.75;
  }

  .cv-mental-model {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.4rem;
    padding: 0.7rem 1rem;
    border: 1px solid #1f1f33;
    border-radius: 8px;
    background: rgba(18, 18, 26, 0.7);
    color: #cfcfe0;
    font-size: 0.92rem;
  }
  .cv-mental-model :global(svg) { color: #8be9fd; flex-shrink: 0; }
  .cv-mm-sep { color: #50fa7b; font-size: 1.05rem; margin: 0 0.15rem; }

  /* Sections */
  .cv-section { margin-top: 2.6rem; }

  .cv-h3 {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    color: #f5f5fa;
    font-weight: 700;
  }
  summary.cv-h3 {
    cursor: pointer;
    list-style: none;
    user-select: none;
    padding: 0.2rem 0;
  }
  summary.cv-h3::-webkit-details-marker { display: none; }
  .cv-chev {
    margin-left: auto;
    color: #6f6f86;
    font-size: 0.85rem;
    transition: transform 0.2s ease, color 0.2s ease;
  }
  summary.cv-h3:hover .cv-chev { color: #bd93f9; }
  details[open] > summary .cv-chev { transform: rotate(90deg); }
  details.cv-section:not([open]) > summary.cv-h3 { margin-bottom: 0; }

  .cv-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 6px;
    background: rgba(189, 147, 249, 0.14);
    border: 1px solid rgba(189, 147, 249, 0.4);
    color: #bd93f9;
    font-size: 0.9rem;
    font-weight: 800;
  }

  .cv-lead {
    max-width: 64ch;
    margin: 0 0 1.4rem;
    color: #9a9aaa;
    font-size: 0.94rem;
    line-height: 1.7;
  }

  /* ── Vertical flow ── */
  .flow { list-style: none; margin: 0; padding: 0.4rem 0 0; }

  .flow-step {
    position: relative;
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 1.1rem;
    padding-bottom: 1.5rem;
    opacity: 0;
    animation: cvRise 0.55s ease forwards;
    animation-delay: var(--d, 0ms);
  }
  .flow-step:last-child { padding-bottom: 0; }

  .flow-step::before {
    content: "";
    position: absolute;
    left: 21px;
    top: 48px;
    bottom: -2px;
    width: 2px;
    background: linear-gradient(180deg, #bd93f9, #50fa7b, #bd93f9);
    background-size: 100% 140px;
    opacity: 0.45;
    animation: cvFlow 2.4s linear infinite;
  }
  .flow-step:last-child::before { display: none; }

  .flow-rail {
    position: relative;
    z-index: 1;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #12121a;
    border: 1px solid rgba(189, 147, 249, 0.45);
    color: #bd93f9;
    box-shadow: 0 0 0 4px #0a0a0f;
  }

  .flow-body {
    border: 1px solid #1c1c30;
    border-radius: 8px;
    background: rgba(18, 18, 26, 0.6);
    padding: 0.85rem 1.05rem;
    transition: border-color 0.2s, transform 0.2s;
  }
  .flow-body:hover { border-color: #2e2e4e; transform: translateX(2px); }

  .flow-top {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.4rem 1rem;
    margin-bottom: 0.35rem;
  }

  .flow-title { color: #e8e8f0; font-weight: 700; font-size: 1rem; }

  .flow-where {
    color: #6f6f86;
    font-size: 0.76rem;
    letter-spacing: 0.03em;
  }

  .flow-body p {
    margin: 0;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.65;
  }

  /* ── Concept cards ── */
  .cv-cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cv-card {
    border: 1px solid #1c1c30;
    border-radius: 10px;
    background: rgba(18, 18, 26, 0.6);
    padding: 1.1rem 1.2rem 1.25rem;
    transition: border-color 0.2s, transform 0.2s;
  }
  .cv-card:hover { border-color: #33335a; transform: translateY(-2px); }

  .cv-card-head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.6rem;
    color: #bd93f9;
  }
  .cv-card-head h4 {
    margin: 0;
    font-size: 1.02rem;
    color: #f0f0f6;
    font-weight: 700;
  }
  .cv-card p {
    margin: 0 0 0.9rem;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.65;
  }
  .cv-card-note {
    margin: -0.4rem 0 0.9rem;
    padding: 0.5rem 0.65rem;
    border-left: 2px solid rgba(245, 230, 99, 0.4);
    background: rgba(245, 230, 99, 0.04);
    border-radius: 4px;
    color: #9a9aaa;
    font-size: 0.82rem;
    line-height: 1.55;
  }

  /* Wall diagram */
  .cv-wall {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: stretch;
    gap: 0.5rem;
  }
  .cv-wall-side {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.7rem 0.5rem;
    border: 1px solid #2a2a40;
    border-radius: 6px;
    background: #0d0d14;
    color: #cfcfe0;
    font-size: 0.84rem;
    text-align: center;
  }
  .cv-wall-side :global(svg) { color: #8be9fd; }
  .cv-wall-side small { color: #7d7d92; font-size: 0.72rem; }
  .cv-wall-secure { border-color: rgba(80, 250, 123, 0.4); }
  .cv-wall-secure :global(svg) { color: #50fa7b; }
  .cv-wall-secure small { color: #50fa7b; }
  .cv-wall-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    color: #f5e663;
    background:
      repeating-linear-gradient(45deg, rgba(245, 230, 99, 0.12) 0 6px, transparent 6px 12px);
    border-radius: 4px;
  }

  /* Code snippet inside cards */
  .cv-code {
    margin: 0 0 0.85rem;
    padding: 0.75rem 0.9rem;
    background: #0d0d14;
    border: 1px solid #1a1a2e;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 0.82rem;
    line-height: 1.6;
  }
  .cv-code code {
    background: none;
    border: none;
    padding: 0;
    color: #d6d6e2;
    font-size: 0.82rem;
  }
  .cv-code .c-key { color: #ff79c6; }
  .cv-code .c-fn { color: #50fa7b; }
  .cv-code .c-cm { color: #6272a4; }

  /* Chain of states */
  .cv-chain,
  .cv-fanout,
  .cv-fan-arrows,
  .cv-fan-list {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .cv-fanout { flex-direction: column; gap: 0.5rem; }
  .cv-chain :global(svg),
  .cv-fanout :global(svg) { color: #50fa7b; }

  .cv-chip {
    font-size: 0.8rem;
    color: #cfcfe0;
    background: #0d0d14;
    border: 1px solid #2a2a40;
    border-radius: 5px;
    padding: 0.3rem 0.6rem;
    white-space: nowrap;
  }
  .cv-chip-live {
    color: #f5e663;
    border-color: rgba(245, 230, 99, 0.5);
    box-shadow: 0 0 10px rgba(245, 230, 99, 0.15);
  }
  .cv-chip-iface {
    color: #bd93f9;
    border-color: rgba(189, 147, 249, 0.5);
    font-weight: 700;
  }
  .cv-chip.cv-sm { font-size: 0.74rem; padding: 0.22rem 0.5rem; }
  .cv-fan-list { gap: 0.35rem; }

  /* Streaming tokens */
  .cv-stream {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    padding: 0.6rem 0.2rem 0;
  }
  .cv-tok {
    font-size: 0.84rem;
    color: #d0d0da;
    background: rgba(80, 250, 123, 0.08);
    border-radius: 4px;
    padding: 0.15rem 0.45rem;
    opacity: 0;
    animation: cvTok 0.4s ease forwards;
  }
  .cv-tok:nth-child(1) { animation-delay: 0.1s; }
  .cv-tok:nth-child(2) { animation-delay: 0.4s; }
  .cv-tok:nth-child(3) { animation-delay: 0.7s; }
  .cv-tok:nth-child(4) { animation-delay: 1s; }
  .cv-tok:nth-child(5) { animation-delay: 1.3s; }
  .cv-cursor { color: #50fa7b; animation: blink 0.8s step-end infinite; }

  /* ── File tree ── */
  .cv-tree {
    margin: 0;
    padding: 1rem 1.15rem;
    background: #0d0d14;
    border: 1px solid #1a1a2e;
    border-radius: 9px;
    overflow-x: auto;
    color: #5f6075;
    font-size: 0.82rem;
    line-height: 1.7;
  }
  .cv-tree code {
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }
  .cv-tree .tr-dir { color: #8be9fd; }
  .cv-tree .tr-file { color: #f1fa8c; }
  .cv-tree .tr-cm { color: #6f6f86; }

  /* Callout */
  .cv-callout {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    margin-top: 2.4rem;
    padding: 1rem 1.15rem;
    border: 1px solid rgba(189, 147, 249, 0.28);
    border-left: 3px solid #bd93f9;
    border-radius: 8px;
    background: rgba(189, 147, 249, 0.06);
  }
  .cv-callout :global(svg) { color: #bd93f9; flex-shrink: 0; margin-top: 2px; }
  .cv-callout p {
    margin: 0;
    color: #c2c2d2;
    font-size: 0.92rem;
    line-height: 1.7;
  }

  /* ── Instructions-specific bits ── */
  .gd-egs {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-top: 0.8rem;
  }
  .gd-eg {
    align-self: flex-start;
    font-size: 0.84rem;
    color: #d0d0da;
    background: rgba(80, 250, 123, 0.07);
    border: 1px solid rgba(80, 250, 123, 0.22);
    border-radius: 999px;
    padding: 0.3rem 0.75rem;
  }

  .gd-note {
    display: flex;
    gap: 0.55rem;
    align-items: flex-start;
    margin-top: 0.85rem;
    padding: 0.65rem 0.85rem;
    border: 1px solid rgba(245, 230, 99, 0.28);
    border-left: 3px solid #f5e663;
    border-radius: 6px;
    background: rgba(245, 230, 99, 0.05);
  }
  .gd-note :global(svg) { color: #f5e663; flex-shrink: 0; margin-top: 1px; }
  .gd-note span { color: #c2c2d2; font-size: 0.86rem; line-height: 1.6; }

  .gd-prompts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.7rem;
    margin-top: 0.95rem;
  }
  .gd-prompt {
    border: 1px solid #1c1c30;
    border-radius: 8px;
    background: #0d0d14;
    padding: 0.8rem 0.9rem;
  }
  .gd-prompt-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .gd-prompt-head :global(svg) { color: #8be9fd; }
  .gd-prompt p { margin: 0; color: #aeaebe; font-size: 0.85rem; line-height: 1.6; }
  .gd-tag {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
  }
  .gd-tag-sys { color: #bd93f9; background: rgba(189, 147, 249, 0.12); border: 1px solid rgba(189, 147, 249, 0.35); }
  .gd-tag-usr { color: #50fa7b; background: rgba(80, 250, 123, 0.1); border: 1px solid rgba(80, 250, 123, 0.32); }

  @media (max-width: 640px) {
    .gd-prompts { grid-template-columns: 1fr; }
  }

  /* Animations */
  @keyframes cvRise {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes cvFlow {
    from { background-position: 0 0; }
    to { background-position: 0 140px; }
  }
  @keyframes cvTok {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .flow-step,
    .cv-hero,
    .cv-tok { animation: none; opacity: 1; }
    .flow-step::before { animation: none; }
  }
</style>
