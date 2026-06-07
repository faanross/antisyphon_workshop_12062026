<script lang="ts">
  import BrainIcon from "phosphor-svelte/lib/BrainIcon";
  import WrenchIcon from "phosphor-svelte/lib/WrenchIcon";
  import EyeIcon from "phosphor-svelte/lib/EyeIcon";
  import ToolboxIcon from "phosphor-svelte/lib/ToolboxIcon";
  import ArrowsClockwiseIcon from "phosphor-svelte/lib/ArrowsClockwiseIcon";
  import BracketsCurlyIcon from "phosphor-svelte/lib/BracketsCurlyIcon";
  import ShieldCheckIcon from "phosphor-svelte/lib/ShieldCheckIcon";
  import StackIcon from "phosphor-svelte/lib/StackIcon";
  import RobotIcon from "phosphor-svelte/lib/RobotIcon";
  import CursorClickIcon from "phosphor-svelte/lib/CursorClickIcon";
  import HardDrivesIcon from "phosphor-svelte/lib/HardDrivesIcon";
  import FloppyDiskIcon from "phosphor-svelte/lib/FloppyDiskIcon";
  import ArrowRightIcon from "phosphor-svelte/lib/ArrowRightIcon";
  import ChatCircleTextIcon from "phosphor-svelte/lib/ChatCircleTextIcon";
  import MagnifyingGlassIcon from "phosphor-svelte/lib/MagnifyingGlassIcon";
  import CodeIcon from "phosphor-svelte/lib/CodeIcon";

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
  let activeTab = $state<"instructions" | "chat" | "trace" | "code">("instructions");
  let message = $state("");
  let turns = $state<Turn[]>([]);
  let availableTools = $state<ToolDefinition[]>(initialTools);
  let statusText = $state("");
  let busy = $state(false);
  let toolsOpen = $state(false);
  let wiringOpen = $state(true);

  // Faithful (lightly trimmed) view of the two prompts the TAO loop sends the model
  // each decision step. The tool catalog is part of the USER prompt — see WIRE_CATALOG.
  const WIRE_SYS = `You are a threat-hunting triage analyst inside an agentic hunting harness.
You operate in a bounded TAO loop: Thought, Action, Observation.
The harness exposes read-only tools. Choose one useful tool action at a time.
The harness validates and executes the selected tool; you reason over the observation.
… triage method, LOTS guidance, verdict vocabulary …`;

  const WIRE_U1 = `TOOL_SELECTION_REQUEST

Choose the next best action for this investigation.

`;
  const WIRE_CATALOG = `Available tools:
- query_candidates
  purpose: Find candidates by type, score, host, destination, process, or id.
  args: type?, minBeaconScore?, host?, destIp?, candidateIds?
  returns: Compact candidate rows sorted by score.
- get_candidate_detail
  purpose: Open one candidate for attribution, enrichment, and evidence ids.
  args: candidateId
  returns: Detailed candidate record.
  … all six tools, in the same format, exactly as listed in Available Tools above …`;
  const WIRE_U2 = `

Return ONLY one JSON object. Do not wrap it in markdown.

`;
  const WIRE_EXAMPLES = `To call a tool:
{"thought":"…","action":"call_tool","tool":"query_candidates","args":{"type":"beacon","minBeaconScore":0.7}}

To stop when you have enough evidence:
{"thought":"…","action":"finish","finalAnswer":"…"}`;
  const WIRE_U3 = `

Current user message:
`;
  const WIRE_PH = `{ the analyst's message goes here }`;
  const WIRE_U4 = `

Observations already returned this turn:
None yet.`;

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
    <section class="console panel" class:bare={activeTab === "code" || activeTab === "instructions"}>
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
          class:active={activeTab === "instructions"}
          aria-selected={activeTab === "instructions"}
          onclick={() => activeTab = "instructions"}
        >
          Instructions
        </button>
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
        <button
          type="button"
          role="tab"
          class:active={activeTab === "code"}
          aria-selected={activeTab === "code"}
          onclick={() => activeTab = "code"}
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
              <span class="cv-eyebrow">Lab 04 · Walkthrough</span>
              <h2>Run a real triage — and watch how the agent works</h2>
              <p>
                This is a genuine triage: you investigate the distilled candidates, follow the
                evidence, and reach conclusions about what's actually going on. <strong>The hunt
                and your findings are the job.</strong> But there's a second thing worth watching
                while you do it — we hand the agent a <strong>toolbox</strong> (six tools, each
                described) and give it a goal <em>without</em> saying which tool to use. So as you
                work, also notice whether it <strong>reaches for the right tool</strong> for each
                question.
              </p>
            </header>

            <ol class="flow">
              <!-- Step 1 -->
              <li class="flow-step" style="--d: 0ms">
                <span class="flow-rail"><ToolboxIcon size={22} weight="duotone" /></span>
                <div class="flow-body">
                  <div class="flow-top">
                    <span class="flow-title">1 · See what's in the toolbox</span>
                    <span class="flow-where">Available Tools panel</span>
                  </div>
                  <p>
                    First, expand <strong>Available Tools</strong> below the console. These six are
                    what the agent can reach, each with a one-line purpose. Read them so you know
                    what a <em>correct</em> choice looks like before you start asking.
                  </p>
                </div>
              </li>

              <!-- Step 2 -->
              <li class="flow-step" style="--d: 110ms">
                <span class="flow-rail"><ChatCircleTextIcon size={22} weight="duotone" /></span>
                <div class="flow-body">
                  <div class="flow-top">
                    <span class="flow-title">2 · Start investigating</span>
                    <span class="flow-where">Chat tab</span>
                  </div>
                  <p>
                    Ask real questions about the candidates and read the answers — this is the
                    actual hunt. Phrase requests as <strong>outcomes</strong>, the way you'd brief
                    a junior analyst, rather than naming a tool. The prompts below are just
                    <strong>suggestions</strong> to get you started — and each happens to call for a
                    <em>different</em> tool, so you can also predict which one the agent should
                    reach for:
                  </p>
                  <div class="gd-match">
                    <div class="gd-match-row"><span class="gd-q">"Which beacons scored above 0.8?"</span><span class="gd-tool">query_candidates</span></div>
                    <div class="gd-match-row"><span class="gd-q">"Open up the top candidate — give me the full record."</span><span class="gd-tool">get_candidate_detail</span></div>
                    <div class="gd-match-row"><span class="gd-q">"Show me the raw events behind it."</span><span class="gd-tool">get_related_events</span></div>
                    <div class="gd-match-row"><span class="gd-q">"Whose machine is this, and what runs on it?"</span><span class="gd-tool">lookup_asset</span></div>
                    <div class="gd-match-row"><span class="gd-q">"Is that destination IP known-bad?"</span><span class="gd-tool">lookup_threat_intel</span></div>
                    <div class="gd-match-row"><span class="gd-q">"Why did it score so high?"</span><span class="gd-tool">explain_score</span></div>
                  </div>
                </div>
              </li>

              <!-- Step 3 -->
              <li class="flow-step" style="--d: 220ms">
                <span class="flow-rail"><MagnifyingGlassIcon size={22} weight="duotone" /></span>
                <div class="flow-body">
                  <div class="flow-top">
                    <span class="flow-title">3 · Read the trace behind the answer</span>
                    <span class="flow-where">Execution Trace tab</span>
                  </div>
                  <p>
                    Open <strong>Execution Trace</strong> to see how each answer was built. For
                    every turn you get the <strong>Tool Action</strong>: the <em>Selection Note</em>
                    (its reasoning), the <em>Action</em> — <code>tool(args)</code> it ran — and the
                    <em>Observation</em> it got back. Two things to judge here: did the
                    <strong>conclusion hold up</strong> given that evidence, and did it
                    <strong>pick the right tool</strong>, with sensible arguments, to find it?
                  </p>
                </div>
              </li>

              <!-- Step 4 -->
              <li class="flow-step" style="--d: 330ms">
                <span class="flow-rail"><ArrowsClockwiseIcon size={22} weight="duotone" /></span>
                <div class="flow-body">
                  <div class="flow-top">
                    <span class="flow-title">4 · Make it chain tools</span>
                    <span class="flow-where">the hard case</span>
                  </div>
                  <p>
                    Now ask something no single tool can answer, so it has to combine several and
                    decide the order itself — e.g. <em>"Give me the full picture of the most
                    suspicious host: who's on it, what it's talking to, and whether that
                    destination is known-bad."</em> Watch the trace: each pass it picks the next
                    tool based on what the last one returned.
                  </p>
                </div>
              </li>
            </ol>

            <aside class="cv-callout">
              <CodeIcon size={22} weight="duotone" />
              <p>
                <strong>What this lab adds:</strong> the agent stops just answering and starts
                <em>doing the legwork</em> — gathering its own evidence to triage the candidates.
                Judge it on both fronts: the quality of the investigation and conclusions, and
                whether it chose the right tools to get there. The optional <strong>Code</strong>
                tab shows how the toolbox and the JSON tool-decision contract are wired up.
              </p>
            </aside>
          </div>
        </div>
      {:else if activeTab === "chat"}
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
      {:else if activeTab === "trace"}
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
      {:else}
        <!-- ═══════════════════════════════════════════════════ -->
        <!-- CODE VIEW  (architectural reference, non-interactive)-->
        <!-- ═══════════════════════════════════════════════════ -->
        <div class="code-view">
          <div class="code-inner">
            <!-- Intro -->
            <header class="cv-hero">
              <span class="cv-eyebrow">Under the Hood</span>
              <h2>How the agent actually works</h2>
              <p>
                Optional reading for the curious. In Lab 03 the agent answered in a single
                model call. Here it does something bigger: it <strong>reasons in a loop</strong>,
                calling tools to gather evidence before it answers. This is the first lab where
                the model decides <em>what to do next</em> — the essence of an agent. Every box
                below maps to a real file you can open afterwards.
              </p>
              <div class="cv-mental-model">
                <BrainIcon size={20} weight="duotone" />
                <span>think</span>
                <span class="cv-mm-sep">→</span>
                <WrenchIcon size={20} weight="duotone" />
                <span>act (call a tool)</span>
                <span class="cv-mm-sep">→</span>
                <EyeIcon size={20} weight="duotone" />
                <span>observe</span>
                <span class="cv-mm-sep">↺</span>
              </div>
            </header>

            <!-- A · Journey -->
            <details class="cv-section" open>
              <summary class="cv-h3"><span class="cv-num">A</span> The journey of one turn<span class="cv-chev" aria-hidden="true">▸</span></summary>
              <p class="cv-lead">
                Follow a single question. Unlike Lab 03's one-shot answer, the work here is a
                short loop of model calls with tool runs in between.
              </p>

              <ol class="flow">
                <li class="flow-step" style="--d: 0ms">
                  <span class="flow-rail"><CursorClickIcon size={22} weight="duotone" /></span>
                  <div class="flow-body">
                    <div class="flow-top"><span class="flow-title">You ask a question</span><span class="flow-where">browser</span></div>
                    <p>Your message and a stable <code>sessionId</code> are posted to the server, so this turn joins the same ongoing investigation.</p>
                  </div>
                </li>
                <li class="flow-step" style="--d: 90ms">
                  <span class="flow-rail"><HardDrivesIcon size={22} weight="duotone" /></span>
                  <div class="flow-body">
                    <div class="flow-top"><span class="flow-title">Load session, window the context</span><span class="flow-where">server · session.ts</span></div>
                    <p>The harness loads prior turns <em>and</em> prior tool results, then trims them to a token budget — so the agent remembers the investigation without overflowing.</p>
                  </div>
                </li>
                <li class="flow-step" style="--d: 180ms">
                  <span class="flow-rail"><ArrowsClockwiseIcon size={22} weight="duotone" /></span>
                  <div class="flow-body">
                    <div class="flow-top"><span class="flow-title">The reasoning loop runs</span><span class="flow-badge">the heart of it</span><span class="flow-where">server · demo.ts</span></div>
                    <p>Up to four times: the model returns a JSON decision — a <em>thought</em> plus either "call this tool" or "finish". Each tool result comes back as an observation the model sees on the next pass.</p>
                  </div>
                </li>
                <li class="flow-step" style="--d: 270ms">
                  <span class="flow-rail"><WrenchIcon size={22} weight="duotone" /></span>
                  <div class="flow-body">
                    <div class="flow-top"><span class="flow-title">Tools execute — deterministically</span><span class="flow-where">server · tools.ts</span></div>
                    <p>When the model picks a tool, the harness runs a plain function over the candidate data and returns the result. Tools are not model calls — the model only <em>chooses</em> them.</p>
                  </div>
                </li>
                <li class="flow-step" style="--d: 360ms">
                  <span class="flow-rail"><RobotIcon size={22} weight="duotone" /></span>
                  <div class="flow-body">
                    <div class="flow-top"><span class="flow-title">The model composes the answer</span><span class="flow-where">server · providers/*</span></div>
                    <p>Once the loop finishes, one last model call turns all the gathered observations into the written reply you read in the Chat tab.</p>
                  </div>
                </li>
                <li class="flow-step" style="--d: 450ms">
                  <span class="flow-rail"><FloppyDiskIcon size={22} weight="duotone" /></span>
                  <div class="flow-body">
                    <div class="flow-top"><span class="flow-title">Save the turn + traces, report back</span><span class="flow-where">server → browser</span></div>
                    <p>The turn and every tool trace are saved to the session, then sent back — the answer to <em>Chat</em>, the full step-by-step to <em>Execution Trace</em>.</p>
                  </div>
                </li>
              </ol>
            </details>

            <!-- B · The loop -->
            <details class="cv-section" open>
              <summary class="cv-h3"><span class="cv-num">B</span> The reasoning loop, up close<span class="cv-chev" aria-hidden="true">▸</span></summary>
              <p class="cv-lead">
                This is the pattern that turns a chatbot into an agent: <strong>Thought → Action →
                Observation</strong>, repeated until the model has enough to answer.
              </p>

              <div class="tao">
                <div class="tao-cycle">
                  <span class="tao-node tao-t">Thought</span>
                  <ArrowRightIcon size={14} weight="bold" />
                  <span class="tao-node tao-a">Action — call a tool</span>
                  <ArrowRightIcon size={14} weight="bold" />
                  <span class="tao-node tao-o">Observation</span>
                  <span class="tao-loop">↺ up to 4×</span>
                </div>
                <div class="tao-then">
                  <ArrowRightIcon size={14} weight="bold" />
                  <span class="tao-node tao-f">Finish</span>
                  <ArrowRightIcon size={14} weight="bold" />
                  <span class="tao-node tao-c">Compose the answer</span>
                </div>
              </div>

              <p class="cv-note">
                Each pass, the model must return one strict JSON decision — nothing else. The
                harness parses it, runs the chosen tool (or stops), and loops:
              </p>
              <pre class="cv-code"><code>&#123;
  <span class="c-key">"thought"</span>: <span class="c-str">"I need this candidate's attribution"</span>,
  <span class="c-key">"action"</span>: <span class="c-str">"call_tool"</span>,        <span class="c-cm">// or "finish"</span>
  <span class="c-key">"tool"</span>: <span class="c-str">"get_candidate_detail"</span>,
  <span class="c-key">"args"</span>: &#123; <span class="c-key">"candidateId"</span>: <span class="c-str">"BEA-001"</span> &#125;
&#125;</code></pre>
            </details>

            <!-- C · Toolbox -->
            <details class="cv-section" open>
              <summary class="cv-h3"><span class="cv-num">C</span> The toolbox<span class="cv-chev" aria-hidden="true">▸</span></summary>
              <p class="cv-lead">
                Six deterministic tools are exposed to the agent. The model can only choose from
                these — each is a plain data query, no AI inside.
              </p>
              <div class="tb-list">
                <div class="tb-tool"><code>query_candidates</code><span>Find candidates by type, score, host, destination, process, or id.</span></div>
                <div class="tb-tool"><code>get_candidate_detail</code><span>Open one candidate: attribution, enrichment, score, evidence ids.</span></div>
                <div class="tb-tool"><code>get_related_events</code><span>Pull the raw Sysmon / connection events behind a candidate.</span></div>
                <div class="tb-tool"><code>lookup_asset</code><span>Host context — observed users, processes, and inferred asset role.</span></div>
                <div class="tb-tool"><code>lookup_threat_intel</code><span>Check a destination for threat-intel matches, source, and tags.</span></div>
                <div class="tb-tool"><code>explain_score</code><span>Break down why a candidate scored high or low before trusting it.</span></div>
              </div>
            </details>

            <!-- D · Four ideas -->
            <details class="cv-section" open>
              <summary class="cv-h3"><span class="cv-num">D</span> Four ideas worth understanding<span class="cv-chev" aria-hidden="true">▸</span></summary>
              <div class="cv-cards">
                <article class="cv-card">
                  <div class="cv-card-head"><BrainIcon size={26} weight="duotone" /><h4>The model decides; the harness acts</h4></div>
                  <p>The model never touches the data. It only emits a decision — which tool, which arguments — and the harness runs it. That split keeps the agent's actions auditable and safe.</p>
                </article>
                <article class="cv-card">
                  <div class="cv-card-head"><ShieldCheckIcon size={26} weight="duotone" /><h4>A strict contract keeps the loop bounded</h4></div>
                  <p>Every decision must be valid JSON naming a known tool; anything else is rejected as an error trace. And the loop is capped at four steps — it can gather evidence, but it can't spin forever.</p>
                  <div class="cv-chain">
                    <span class="cv-chip">valid JSON only</span>
                    <span class="cv-chip">known tools only</span>
                    <span class="cv-chip cv-chip-live">≤ 4 steps</span>
                  </div>
                </article>
                <article class="cv-card">
                  <div class="cv-card-head"><RobotIcon size={26} weight="duotone" /><h4>Two shapes of model call per turn</h4></div>
                  <p>Inside the loop are <em>decision</em> calls (pick a tool). After it comes one <em>compose</em> call that writes the final answer. So a single turn is up to four decisions plus one reply.</p>
                </article>
                <article class="cv-card">
                  <div class="cv-card-head"><StackIcon size={26} weight="duotone" /><h4>Memory now carries tool traces</h4></div>
                  <p>Building on Lab 03, the session remembers not just turns but the tool results from earlier turns — all windowed to a token budget, so a long investigation stays coherent and bounded.</p>
                </article>
              </div>
            </details>

            <!-- E · File tree -->
            <details class="cv-section" open>
              <summary class="cv-h3"><span class="cv-num">E</span> Where each piece lives<span class="cv-chev" aria-hidden="true">▸</span></summary>
              <p class="cv-lead">The agent loop and its tools are a few framework files. Open any of them for the full detail.</p>
              <pre class="cv-tree"><code><span class="tr-dir">hunting-agent/src/</span>
│
├─ <span class="tr-dir">routes/lab/04/api/chat/</span>
│  └─ <span class="tr-file">+server.ts</span>              <span class="tr-cm">← the endpoint; streams the turn back</span>
│
└─ <span class="tr-dir">framework/</span>
   ├─ <span class="tr-file">demo.ts</span>                 <span class="tr-cm">← runs the TAO loop + composes the answer</span>
   ├─ <span class="tr-file">tools.ts</span>                <span class="tr-cm">← the six tools + how they execute</span>
   ├─ <span class="tr-file">session.ts</span>             <span class="tr-cm">← session store + context windowing</span>
   ├─ <span class="tr-dir">prompts/</span>
   │  └─ <span class="tr-file">triage.ts</span>            <span class="tr-cm">← system prompt + the decision/compose prompts</span>
   └─ <span class="tr-dir">providers/</span>              <span class="tr-cm">← the model client (one per vendor)</span></code></pre>
            </details>

            <!-- Callout -->
            <aside class="cv-callout">
              <ArrowsClockwiseIcon size={22} weight="duotone" />
              <p>
                <strong>Why a loop instead of one call?</strong> Real triage isn't answerable in
                one shot — you look something up, then decide what to check next based on what you
                found. The loop lets the agent do exactly that: gather evidence step by step, then
                reason over all of it. Every later lab builds on this think-act-observe core.
              </p>
            </aside>
          </div>
        </div>
      {/if}

      {#if activeTab === "chat" || activeTab === "trace"}
      <form onsubmit={(event) => { event.preventDefault(); send(); }}>
        <input bind:value={message} aria-label="Message" disabled={busy} />
        <button disabled={busy || !message.trim()}>{busy ? statusText || "Working" : "Send"}</button>
      </form>
      {/if}
    </section>

    {#if activeTab === "chat" || activeTab === "trace"}
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

    <details class="panel wiring-panel" bind:open={wiringOpen}>
      <summary>
        <div class="panel-title">
          <h2>How the model is told about these tools</h2>
          <span>{wiringOpen ? "collapse" : "expand"}</span>
        </div>
      </summary>
      {#if wiringOpen}
        <div class="wiring">
          <p class="wire-lead">
            Every decision step, the harness sends the model <strong>two</strong> prompts. The
            <strong>system prompt</strong> sets the role and the TAO loop. The
            <strong>user prompt</strong> is where the harness actually <em>injects the tool
            catalog</em> — each tool's name, arguments, and return shape — together with worked
            examples of how to call one. So the answer to "where do the tools live?" is:
            <strong>in the user prompt, rebuilt and re-sent on every single step</strong> — not
            baked into the system prompt.
          </p>

          <div class="wire-prompts">
            <article class="wire-card">
              <div class="wire-head">
                <span class="wire-tag sys">systemPrompt</span>
                <span class="wire-sub">role + loop · mentions tools, never lists them</span>
              </div>
              <pre class="wire-pre">{WIRE_SYS}</pre>
            </article>

            <article class="wire-card">
              <div class="wire-head">
                <span class="wire-tag usr">userPrompt</span>
                <span class="wire-sub">rebuilt every decision step</span>
              </div>
              <pre class="wire-pre">{WIRE_U1}<span class="wire-inject">{WIRE_CATALOG}</span>{WIRE_U2}<span class="wire-ex">{WIRE_EXAMPLES}</span>{WIRE_U3}<span class="wire-ph">{WIRE_PH}</span>{WIRE_U4}</pre>
              <p class="wire-foot">
                <span class="dot inject"></span> the injected tool catalog
                <span class="dot ex"></span> call / finish examples
                <span class="dot ph"></span> your input slots in here
              </p>
            </article>
          </div>
        </div>
      {/if}
    </details>
    {/if}
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
  /* Code tab: lesson sits straight on the page, not on the glass card. */
  .console.panel.bare {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
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

  /* Inline code inside the Instructions/Code prose must stay inline
     (the global `code { display: block }` above is for the trace cards;
     real code blocks live in <pre class="cv-code/cv-tree">, not <p>). */
  .code-view p code {
    display: inline;
    overflow: visible;
    white-space: normal;
    font-size: 0.86em;
    color: #f1fa8c;
    background: rgba(241, 250, 140, 0.07);
    border: 1px solid rgba(241, 250, 140, 0.12);
    border-radius: 3px;
    padding: 0.05em 0.35em;
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

  /* ═══ CODE VIEW (architectural reference) ══════════════ */
  .code-view { padding: 0.25rem 0 0; }
  .code-inner {
    max-width: 940px;
    margin: 0 auto;
    padding: 1.25rem 0.25rem 2rem;
    font-family: "JetBrains Mono", monospace;
  }
  .code-view :global(code) {
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
    font-size: clamp(1.7rem, 4vw, 2.5rem);
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

  .cv-section { margin-top: 1.6rem; }
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

  /* Vertical flow */
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
    gap: 0.4rem 0.7rem;
    margin-bottom: 0.35rem;
  }
  .flow-title { color: #e8e8f0; font-weight: 700; font-size: 1rem; }
  .flow-where {
    color: #6f6f86;
    font-size: 0.76rem;
    letter-spacing: 0.03em;
    margin-left: auto;
  }
  .flow-badge {
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #f5e663;
    border: 1px solid rgba(245, 230, 99, 0.5);
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
  }
  .flow-body p {
    margin: 0;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.65;
  }

  /* TAO loop visual */
  .tao {
    border: 1px solid #1c1c30;
    border-radius: 10px;
    background: rgba(18, 18, 26, 0.6);
    padding: 1.1rem 1.2rem;
  }
  .tao-cycle, .tao-then {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .tao-then { margin-top: 0.7rem; }
  .tao :global(svg) { color: #6f6f86; }
  .tao-node {
    font-size: 0.85rem;
    font-weight: 700;
    color: #cfcfe0;
    background: #0d0d14;
    border: 1px solid #2a2a40;
    border-radius: 6px;
    padding: 0.35rem 0.7rem;
  }
  .tao-t { border-color: rgba(139, 233, 253, 0.5); color: #8be9fd; }
  .tao-a { border-color: rgba(189, 147, 249, 0.5); color: #bd93f9; }
  .tao-o { border-color: rgba(80, 250, 123, 0.5); color: #50fa7b; }
  .tao-f { border-color: rgba(245, 230, 99, 0.5); color: #f5e663; }
  .tao-c { border-color: rgba(245, 230, 99, 0.5); color: #f5e663; }
  .tao-loop {
    font-size: 0.78rem;
    font-weight: 700;
    color: #ff79c6;
    border: 1px dashed rgba(255, 121, 198, 0.55);
    border-radius: 999px;
    padding: 0.2rem 0.6rem;
  }
  .cv-note {
    margin: 1rem 0 0.85rem;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.7;
  }

  /* Toolbox */
  .tb-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .tb-tool {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.3rem 0.8rem;
    border: 1px solid #1c1c30;
    border-radius: 8px;
    background: rgba(18, 18, 26, 0.6);
    padding: 0.6rem 0.85rem;
  }
  .tb-tool span {
    color: #aeaebe;
    font-size: 0.86rem;
    line-height: 1.5;
  }

  /* Concept cards */
  .cv-cards { display: flex; flex-direction: column; gap: 1rem; }
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
  .cv-card p:last-child { margin-bottom: 0; }

  .cv-code {
    margin: 0;
    padding: 0.75rem 0.9rem;
    background: #0d0d14;
    border: 1px solid #1a1a2e;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 0.82rem;
    line-height: 1.6;
  }
  .cv-code :global(code) {
    background: none;
    border: none;
    padding: 0;
    color: #d6d6e2;
    font-size: 0.82rem;
  }
  .cv-code .c-key { color: #8be9fd; }
  .cv-code .c-str { color: #f1fa8c; }
  .cv-code .c-cm { color: #6272a4; }

  .cv-chain {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
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
  .cv-tree :global(code) {
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }
  .cv-tree .tr-dir { color: #8be9fd; }
  .cv-tree .tr-file { color: #f1fa8c; }
  .cv-tree .tr-cm { color: #6f6f86; }

  .cv-callout {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    margin-top: 1.8rem;
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

  /* Question → expected-tool matching rows */
  .gd-match {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    margin-top: 0.85rem;
  }
  .gd-match-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.7rem;
    border: 1px solid #1c1c30;
    border-radius: 7px;
    background: rgba(18, 18, 26, 0.6);
  }
  .gd-q { color: #d6d6e2; font-size: 0.86rem; }
  .gd-tool {
    flex-shrink: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.78rem;
    color: #50fa7b;
    background: rgba(80, 250, 123, 0.1);
    border: 1px solid rgba(80, 250, 123, 0.32);
    border-radius: 5px;
    padding: 0.18rem 0.5rem;
  }
  .gd-tool::before { content: "→ "; color: #6f6f86; }

  /* ── Tool-wiring deconstruction card ── */
  .wiring { padding: 0.25rem 0 0.1rem; }
  .wire-lead { margin: 0 0 1rem; max-width: 92ch; color: #aeaebe; font-size: 0.92rem; line-height: 1.62; }
  .wire-lead strong { color: #e8e8f0; }
  .wire-lead em { color: #bd93f9; font-style: normal; }
  .wire-prompts { display: flex; flex-direction: column; gap: 0.8rem; }
  .wire-card { border: 1px solid rgba(189, 147, 249, 0.22); border-radius: 8px; background: rgba(13, 13, 20, 0.6); padding: 0.85rem 1rem; }
  .wire-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.7rem; margin-bottom: 0.6rem; }
  .wire-tag { font-family: "JetBrains Mono", monospace; font-size: 0.8rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 4px; }
  .wire-tag.sys { color: #bd93f9; background: rgba(189, 147, 249, 0.12); border: 1px solid rgba(189, 147, 249, 0.35); }
  .wire-tag.usr { color: #50fa7b; background: rgba(80, 250, 123, 0.10); border: 1px solid rgba(80, 250, 123, 0.32); }
  .wire-sub { color: #6f6f86; font-size: 0.78rem; }
  .wire-pre { margin: 0; padding: 0.8rem 0.9rem; background: #0b0b11; border: 1px solid #1a1a2e; border-radius: 6px; overflow-x: auto; color: #b6b6c6; font-family: "JetBrains Mono", monospace; font-size: 0.8rem; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
  .wire-inject, .wire-ex, .wire-ph { border-radius: 3px; padding: 0.02em 0.25em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .wire-inject { background: rgba(245, 230, 99, 0.12); color: #e9dfa6; }
  .wire-ex { background: rgba(139, 233, 253, 0.10); color: #bfe9f3; }
  .wire-ph { background: rgba(80, 250, 123, 0.14); color: #9affc0; }
  .wire-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 1.1rem; margin: 0.6rem 0 0; color: #8a8a9a; font-size: 0.78rem; }
  .dot { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 2px; margin-right: 0.3rem; vertical-align: -1px; }
  .dot.inject { background: rgba(245, 230, 99, 0.5); }
  .dot.ex { background: rgba(139, 233, 253, 0.5); }
  .dot.ph { background: rgba(80, 250, 123, 0.55); }

  @keyframes cvRise {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes cvFlow {
    from { background-position: 0 0; }
    to { background-position: 0 140px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .flow-step,
    .cv-hero { animation: none; opacity: 1; }
    .flow-step::before { animation: none; }
  }
</style>
