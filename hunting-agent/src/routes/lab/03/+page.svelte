<script lang="ts">
  import type { ContextBudgetReport } from "../../../framework/session";
  import BrainIcon from "phosphor-svelte/lib/BrainIcon";
  import StackIcon from "phosphor-svelte/lib/StackIcon";
  import ArrowsInSimpleIcon from "phosphor-svelte/lib/ArrowsInSimpleIcon";
  import GaugeIcon from "phosphor-svelte/lib/GaugeIcon";
  import PushPinIcon from "phosphor-svelte/lib/PushPinIcon";
  import SlidersHorizontalIcon from "phosphor-svelte/lib/SlidersHorizontalIcon";
  import FloppyDiskIcon from "phosphor-svelte/lib/FloppyDiskIcon";
  import RobotIcon from "phosphor-svelte/lib/RobotIcon";
  import CursorClickIcon from "phosphor-svelte/lib/CursorClickIcon";
  import HardDrivesIcon from "phosphor-svelte/lib/HardDrivesIcon";
  import GearIcon from "phosphor-svelte/lib/GearIcon";
  import ArrowRightIcon from "phosphor-svelte/lib/ArrowRightIcon";
  import ChatCircleTextIcon from "phosphor-svelte/lib/ChatCircleTextIcon";
  import MagnifyingGlassIcon from "phosphor-svelte/lib/MagnifyingGlassIcon";
  import CodeIcon from "phosphor-svelte/lib/CodeIcon";

  type Role = "user" | "assistant";
  interface Msg { role: Role; content: string; }

  // One stable session id per browser tab — this is what gives continuity.
  const sessionId = `ctx-${Math.random().toString(36).slice(2)}-${Date.now()}`;

  let messages = $state<Msg[]>([]);
  let draft = $state("");
  let busy = $state(false);
  let status = $state("");
  let activeTab = $state<"instructions" | "chat" | "context" | "code">("instructions");
  let budget = $state<ContextBudgetReport | null>(null);
  let compactionFlash = $state(false);

  let pct = (n: number, d: number) => (d <= 0 ? 0 : Math.min(100, (n / d) * 100));

  // Classify the full browser transcript the way the harness treats it.
  let classes = $derived.by(() => {
    const b = budget;
    const total = messages.length;
    if (!b) return messages.map(() => "recent");
    return messages.map((_, i) => {
      if (i < b.pinnedTurnCount) return "pinned";
      if (i >= total - b.recentTurnCount) return "recent";
      const middleIndex = i - b.pinnedTurnCount;
      return middleIndex < b.compactedTurnCount ? "compacted" : "middle";
    });
  });

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    draft = "";
    messages = [...messages, { role: "user", content: text }];
    messages = [...messages, { role: "assistant", content: "" }];
    const assistantIndex = messages.length - 1;
    busy = true;
    status = "Thinking…";
    compactionFlash = false;

    try {
      const res = await fetch("/lab/03/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, sessionId, stream: true }),
      });
      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line);
          if (evt.type === "status") status = evt.message;
          else if (evt.type === "token") {
            messages[assistantIndex] = {
              role: "assistant",
              content: messages[assistantIndex].content + evt.token,
            };
          } else if (evt.type === "metadata" || evt.type === "done") {
            const b: ContextBudgetReport = evt.type === "done" ? evt.result.contextBudget : evt.contextBudget;
            budget = b;
            if (b.compaction?.occurred) compactionFlash = true;
            if (evt.type === "done") messages[assistantIndex] = { role: "assistant", content: evt.result.message };
          } else if (evt.type === "error") {
            messages[assistantIndex] = { role: "assistant", content: `⚠ ${evt.message}` };
          }
        }
      }
    } catch (err) {
      messages[assistantIndex] = { role: "assistant", content: `⚠ ${err instanceof Error ? err.message : "request failed"}` };
    } finally {
      busy = false;
      status = "";
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }
</script>

<svelte:head><title>Lab 03 | Context Window</title></svelte:head>

<main>
  <header>
    <span class="eyebrow">Lab 03</span>
    <h1>Context Window</h1>
  </header>

  <!-- Persistent context meter: visible on both tabs so the live reaction is never hidden -->
  {#if activeTab === "chat" || activeTab === "context"}
  <div class="meter" class:flash={compactionFlash}>
    <span class="m-label">retained context</span>
    <div class="m-track">
      {#if budget}
        <span class="m-fill" style="width:{pct(budget.retainedContextTokens, budget.maxRetainedContextTokens)}%"></span>
        <span class="m-trigger" style="left:{pct(budget.compactionTriggerTokens, budget.maxRetainedContextTokens)}%"></span>
        {#if budget.compaction?.occurred}
          <span class="m-before" style="left:{pct(budget.compaction.beforeTokens, budget.maxRetainedContextTokens)}%"></span>
        {/if}
      {/if}
    </div>
    <span class="m-num">
      {#if budget}{budget.retainedContextTokens} / {budget.maxRetainedContextTokens}{:else}— / —{/if}
    </span>
    {#if compactionFlash}<span class="m-flash">⟳ compacted</span>{/if}
  </div>
  {/if}

  <div class="tabs" role="tablist">
    <button type="button" role="tab" class:active={activeTab === "instructions"} onclick={() => (activeTab = "instructions")}>Instructions</button>
    <button type="button" role="tab" class:active={activeTab === "chat"} onclick={() => (activeTab = "chat")}>Chat</button>
    <button type="button" role="tab" class:active={activeTab === "context"} onclick={() => (activeTab = "context")}>Context Window</button>
    <button type="button" role="tab" class:active={activeTab === "code"} onclick={() => (activeTab = "code")}>Code</button>
  </div>

  {#if activeTab === "instructions"}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- INSTRUCTIONS VIEW  (the workshop walkthrough)        -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="code-view">
      <div class="code-inner">
        <header class="cv-hero">
          <span class="cv-eyebrow">Lab 03 · Walkthrough</span>
          <h2>Give the agent a memory — and watch it manage it</h2>
          <p>
            In Lab 01 the agent forgot everything between messages. Here it remembers: every
            turn shares one session, so the conversation builds up. But context isn't
            infinite — so when it fills up, the harness <strong>compacts</strong> the oldest
            turns into a summary instead of dropping them. Your job is to fill the window,
            trigger a compaction, and prove the agent still remembers.
          </p>
        </header>

        <ol class="flow">
          <!-- Step 1 -->
          <li class="flow-step" style="--d: 0ms">
            <span class="flow-rail"><ChatCircleTextIcon size={22} weight="duotone" /></span>
            <div class="flow-body">
              <div class="flow-top">
                <span class="flow-title">1 · Tell it a fact, then keep chatting</span>
                <span class="flow-where">Chat tab</span>
              </div>
              <p>
                On the <strong>Chat</strong> tab, give it something to remember in your first
                message, then carry on a normal conversation. Unlike Lab 01, it keeps up —
                because every turn is part of the same session.
              </p>
              <div class="gd-egs">
                <span class="gd-eg">My name is Sam and I'm investigating a phishing case.</span>
                <span class="gd-eg">…(send a few more messages about anything)…</span>
              </div>
            </div>
          </li>

          <!-- Step 2 -->
          <li class="flow-step" style="--d: 110ms">
            <span class="flow-rail"><GaugeIcon size={22} weight="duotone" /></span>
            <div class="flow-body">
              <div class="flow-top">
                <span class="flow-title">2 · Watch the context meter fill</span>
                <span class="flow-where">bar at the top</span>
              </div>
              <p>
                The <strong>context</strong> bar above the tabs grows with every turn. The
                little marker partway along is the <strong>compaction trigger</strong> — the
                point where retained context gets too big and the harness steps in. Keep
                sending messages and push the fill toward it.
              </p>
            </div>
          </li>

          <!-- Step 3 -->
          <li class="flow-step" style="--d: 220ms">
            <span class="flow-rail"><ArrowsInSimpleIcon size={22} weight="duotone" /></span>
            <div class="flow-body">
              <div class="flow-top">
                <span class="flow-title">3 · Cross the line — watch it compact</span>
                <span class="flow-where">⟳ compacted</span>
              </div>
              <p>
                When retained context passes the trigger, the bar flashes
                <strong>⟳ compacted</strong>. Behind the scenes the harness summarized the
                oldest turns into a compact <em>memory</em> and dropped the raw versions —
                freeing room so the conversation can keep going.
              </p>
            </div>
          </li>

          <!-- Step 4 -->
          <li class="flow-step" style="--d: 330ms">
            <span class="flow-rail"><BrainIcon size={22} weight="duotone" /></span>
            <div class="flow-body">
              <div class="flow-top">
                <span class="flow-title">4 · Now test its memory</span>
                <span class="flow-where">the payoff</span>
              </div>
              <p>
                Ask about that very first fact — <em>"what's my name, and what am I
                investigating?"</em> Even though that turn was compacted away, it still
                answers correctly. That's the whole point: <strong>compaction is not
                forgetting</strong> — the agent recalls it through the summary.
              </p>
            </div>
          </li>

          <!-- Step 5 -->
          <li class="flow-step" style="--d: 440ms">
            <span class="flow-rail"><MagnifyingGlassIcon size={22} weight="duotone" /></span>
            <div class="flow-body">
              <div class="flow-top">
                <span class="flow-title">5 · Open the Context Window tab</span>
                <span class="flow-where">Context Window tab</span>
              </div>
              <p>
                This is where it all becomes concrete. See exactly what the harness assembles
                for each model call: the <strong>system prompt</strong>, the
                <strong>pinned</strong> and <strong>recent</strong> turns kept word-for-word,
                and the older turns collapsed into a <strong>memory summary</strong>. The
                colour-coded messages array shows which turns are kept verbatim vs. compacted.
              </p>
            </div>
          </li>
        </ol>

        <aside class="cv-callout">
          <CodeIcon size={22} weight="duotone" />
          <p>
            <strong>The big idea:</strong> a real agent can't keep an infinite transcript, so
            it trades old detail for a summary the moment it runs low on room — staying
            coherent over long conversations. Curious how the budgeting and summarising
            actually work? The optional <strong>Code</strong> tab walks the architecture.
          </p>
        </aside>
      </div>
    </div>
  {:else if activeTab === "chat"}
    <section class="panel chat">
      <div class="transcript">
        {#each messages as m, i (i)}
          <div class="bubble {m.role}">
            <span class="who">{m.role}</span>
            <div class="text">{m.content}{#if busy && i === messages.length - 1 && m.role === "assistant" && !m.content}<em class="status">{status}</em>{/if}</div>
          </div>
        {/each}
      </div>
      <div class="composer">
        <textarea bind:value={draft} onkeydown={onKey} placeholder="Type a message… (Enter to send)" rows="2" disabled={busy}></textarea>
        <button type="button" onclick={send} disabled={busy || !draft.trim()}>Send</button>
      </div>
    </section>
  {:else if activeTab === "context"}
    <section class="panel context">
      {#if !budget}
        <p class="hint">Send a message first — then this panel shows exactly what the harness assembles for the model call, and how retained context grows toward the compaction threshold.</p>
      {:else}
        <!-- This turn, plainly -->
        <div class="row this-turn">
          <div class="stat"><strong>{budget.systemPromptTokens}</strong><span>system prompt</span></div>
          <div class="stat"><strong>{budget.currentMessageTokens}</strong><span>your input</span></div>
          <div class="stat"><strong>{budget.currentTurnOutputTokens}</strong><span>output</span></div>
          <div class="stat">
            <strong>{budget.retainedContextTokens}</strong>
            <span class="stat-label">
              retained context
              <button type="button" class="info-dot" aria-label="What is retained context, and why isn't it exactly your input plus output?">i</button>
              <span class="info-pop" role="tooltip">
                <strong>Retained context</strong> is the whole conversation the harness keeps and re-sends to the model every turn.
                It’s stored as <em>structured turns</em> — each message tagged with who said it:
                <code>user: …</code> and <code>assistant: …</code>.
                <br /><br />
                That’s why it’s a few tokens more than <em>your input</em> + <em>output</em>: those two count only the
                words, while retained context also counts the <code>user:</code> / <code>assistant:</code> labels and the
                line breaks that wrap them. The bar below tracks this number against the
                {budget.maxRetainedContextTokens}-token budget — and it’s what grows until compaction fires.
              </span>
            </span>
          </div>
        </div>

        <!-- Capacity bar -->
        <div class="capacity">
          <div class="cap-head">
            <span>Retained context</span>
            <span>{budget.retainedContextTokens} / {budget.maxRetainedContextTokens} tokens</span>
          </div>
          <div class="cap-track">
            <span class="cap-fill" style="width:{pct(budget.retainedContextTokens, budget.maxRetainedContextTokens)}%"></span>
            <span class="cap-trigger" style="left:{pct(budget.compactionTriggerTokens, budget.maxRetainedContextTokens)}%" title="compaction trigger"></span>
            {#if budget.compaction?.occurred}
              <span class="cap-before" style="left:{pct(budget.compaction.beforeTokens, budget.maxRetainedContextTokens)}%" title="size before compaction"></span>
            {/if}
          </div>
          <div class="cap-legend">
            <span><i class="dot trig"></i> compaction trigger ({budget.compactionTriggerTokens})</span>
            {#if budget.compaction?.occurred}<span><i class="dot before"></i> before compaction ({budget.compaction.beforeTokens})</span>{/if}
          </div>
        </div>

        <!-- What the model sees, by section -->
        <h3>Retained context parts</h3>
        <div class="sections">
          {#each budget.contextSections.filter((s) => s.tokens > 0 || s.id === "memory-summary") as s (s.id)}
            <div class="sec">
              <div class="sec-head"><span class="sec-label">{s.label}</span><span class="sec-tok">{s.tokens}</span></div>
              <div class="sec-bar"><span style="width:{pct(s.tokens, budget.retainedContextTokens || 1)}%"></span></div>
              <p class="sec-desc">{s.description}</p>
            </div>
          {/each}
        </div>

        <!-- Messages array: what the harness keeps vs compacts -->
        <h3>Messages array <small>{messages.length} messages · {budget.compactedTurnCount} compacted into memory</small></h3>
        <div class="msgarr">
          {#each messages as _, i (i)}
            <span class="cell {classes[i]}" title={classes[i]}>{classes[i][0].toUpperCase()}</span>
          {/each}
        </div>
        <div class="msg-legend">
          <span><i class="dot pinned"></i> pinned</span>
          <span><i class="dot compacted"></i> compacted memory</span>
          <span><i class="dot middle"></i> middle</span>
          <span><i class="dot recent"></i> recent</span>
        </div>

        <!-- Compaction event -->
        {#if budget.compaction?.occurred}
          <div class="compaction fired">
            <div class="comp-head">⟳ Compaction fired</div>
            <div class="comp-flow">
              <div class="comp-num"><strong>{budget.compaction.beforeTokens}</strong><span>before</span></div>
              <span class="comp-arrow">→</span>
              <div class="comp-num drop"><strong>{budget.compaction.afterTokens}</strong><span>after</span></div>
              <span class="comp-sep">·</span>
              <div class="comp-num"><strong>{budget.compaction.compactedTurns}</strong><span>turns → memory</span></div>
              <span class="comp-sep">·</span>
              <div class="comp-num"><strong>{budget.memorySummaryTokens}</strong><span>memory tokens</span></div>
            </div>
            <p>The conversation crossed the threshold, so the harness summarized the oldest turns into a compact memory and dropped them — freeing room to keep talking. The agent still remembers them through that summary.</p>
          </div>
        {:else}
          <div class="compaction">
            <strong>No compaction this turn</strong>
            <p>{budget.compaction?.reason}</p>
          </div>
        {/if}

        <!-- Folded mini-lesson -->
        <details class="lesson">
          <summary>How compaction works</summary>
          <ol>
            <li><b>The model is stateless.</b> Every turn, the harness re-sends the whole conversation so the model can "remember" earlier turns.</li>
            <li><b>That can't grow forever.</b> The context window is a finite token budget — here {budget.maxRetainedContextTokens} tokens.</li>
            <li><b>At the trigger</b> ({budget.compactionTriggerTokens} tokens) the harness makes a separate model call that <em>summarizes the oldest turns</em>.</li>
            <li><b>It drops those turns</b> and keeps the summary plus the most recent turns verbatim — so the bar falls sharply, but nothing important is forgotten.</li>
          </ol>
        </details>
      {/if}
    </section>
  {:else}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- CODE VIEW  (architectural reference, non-interactive)-->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="code-view">
      <div class="code-inner">
        <!-- Intro -->
        <header class="cv-hero">
          <span class="cv-eyebrow">Under the Hood</span>
          <h2>How memory actually works</h2>
          <p>
            Optional reading for the curious — you don't need any of it to use the lab.
            Here's the key idea: the model behind this lab is <strong>stateless</strong>.
            It remembers nothing between turns. Everything that feels like memory is the
            <strong>harness re-sending the conversation</strong> on every single call —
            inside a fixed token budget. This explains how that budget fills, and what
            happens when it's about to overflow.
          </p>
          <div class="cv-mental-model">
            <BrainIcon size={20} weight="duotone" />
            <span>the model forgets</span>
            <span class="cv-mm-sep">→</span>
            <StackIcon size={20} weight="duotone" />
            <span>the harness re-sends everything</span>
            <span class="cv-mm-sep">→</span>
            <ArrowsInSimpleIcon size={20} weight="duotone" />
            <span>compaction keeps it bounded</span>
          </div>
        </header>

        <!-- ── A · The journey ── -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">A</span> The journey of one turn<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            Follow a single message from the moment you hit Send. The interesting work all
            happens on the server, before and after one model call.
          </p>

          <ol class="flow">
            <li class="flow-step" style="--d: 0ms">
              <span class="flow-rail"><CursorClickIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">You send a message</span>
                  <span class="flow-where">browser</span>
                </div>
                <p>
                  Your message and a stable <code>sessionId</code> are posted to the server.
                  That session id is the thread of continuity — it's how the harness knows
                  which conversation this turn belongs to.
                </p>
              </div>
            </li>

            <li class="flow-step" style="--d: 90ms">
              <span class="flow-rail"><HardDrivesIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">The harness loads your session</span>
                  <span class="flow-where">server · session.ts</span>
                </div>
                <p>
                  <code>getOrCreateSession()</code> looks you up in a server-side store and
                  returns everything held so far: the turns kept verbatim and any compacted
                  memory. <em>The model never sees this store — only the harness does.</em>
                </p>
              </div>
            </li>

            <li class="flow-step" style="--d: 180ms">
              <span class="flow-rail"><GaugeIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">Check the budget — maybe compact</span>
                  <span class="flow-badge">the key step</span>
                  <span class="flow-where">server · memory-lab.ts</span>
                </div>
                <p>
                  <code>planMemory()</code> measures the whole conversation. If it has crossed
                  the trigger <em>and</em> there are at least two older middle turns, the harness
                  makes a <strong>separate model call</strong> to summarize those older turns into
                  a short memory, then drops them. The budget falls before the real answer is even
                  generated.
                </p>
              </div>
            </li>

            <li class="flow-step" style="--d: 270ms">
              <span class="flow-rail"><StackIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">Assemble the bounded context</span>
                  <span class="flow-where">server · memory-lab.ts</span>
                </div>
                <p>
                  <code>buildMemoryText()</code> stitches together what the model will see this
                  turn: the compacted memory, the conversation kept verbatim, and your new
                  message — all under the fixed system prompt.
                </p>
              </div>
            </li>

            <li class="flow-step" style="--d: 360ms">
              <span class="flow-rail"><RobotIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">One model call, streamed</span>
                  <span class="flow-where">server · providers/*</span>
                </div>
                <p>
                  <code>provider.invoke()</code> sends that bundle to the model and streams the
                  answer back token-by-token. No tools, no loops — this lab is purely about memory,
                  so each turn is a single call.
                </p>
              </div>
            </li>

            <li class="flow-step" style="--d: 450ms">
              <span class="flow-rail"><FloppyDiskIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">Save the turn</span>
                  <span class="flow-where">server · session.ts</span>
                </div>
                <p>
                  Your message and the model's reply are appended to the session and saved. The
                  conversation just grew by two turns — which is why, next time, the budget is a
                  little fuller.
                </p>
              </div>
            </li>

            <li class="flow-step" style="--d: 540ms">
              <span class="flow-rail"><GaugeIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top">
                  <span class="flow-title">Report the budget back</span>
                  <span class="flow-where">server → browser</span>
                </div>
                <p>
                  <code>buildMemoryBudget()</code> produces the numbers behind the
                  <em>Context Window</em> tab — the capacity bar, the section breakdown, and the
                  compaction event you just saw fire.
                </p>
              </div>
            </li>
          </ol>
        </details>

        <!-- ── B · Anatomy of the context window ── -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">B</span> What's inside the context window<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            Every turn, the harness packs a fixed budget with these pieces and sends the lot to
            the model. The dashed line is the compaction trigger.
          </p>

          <div class="cw">
            <div class="cw-bar">
              <div class="cw-seg cw-sys" style="flex: 2"></div>
              <div class="cw-seg cw-mem" style="flex: 1.3"></div>
              <div class="cw-seg cw-pin" style="flex: 1.3"></div>
              <div class="cw-seg cw-old" style="flex: 3"></div>
              <div class="cw-seg cw-rec" style="flex: 2"></div>
              <div class="cw-trigger" style="left: 70%"></div>
            </div>
            <div class="cw-legend">
              <span><i class="cw-dot cw-sys"></i> System prompt — fixed overhead, sent every call</span>
              <span><i class="cw-dot cw-mem"></i> Compacted memory — a summary that stands in for dropped turns</span>
              <span><i class="cw-dot cw-pin"></i> Pinned turns — the first turns, kept verbatim</span>
              <span><i class="cw-dot cw-old"></i> Older turns — the compactable middle</span>
              <span><i class="cw-dot cw-rec"></i> Recent turns — the latest turns, kept verbatim</span>
            </div>
            <p class="cw-note">
              As you chat, the filled portion grows. The moment it crosses the trigger, the
              <strong class="cw-hl-old">older</strong> middle turns are summarized into
              <strong class="cw-hl-mem">compacted memory</strong> and dropped — the bar falls
              sharply, while pinned and recent turns stay verbatim. Nothing important is lost; it
              just gets smaller.
            </p>
          </div>
        </details>

        <!-- ── C · Four ideas ── -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">C</span> Four ideas worth understanding<span class="cv-chev" aria-hidden="true">▸</span></summary>

          <div class="cv-cards">
            <!-- Stateless model -->
            <article class="cv-card">
              <div class="cv-card-head">
                <BrainIcon size={26} weight="duotone" />
                <h4>The model is stateless — the harness is the memory</h4>
              </div>
              <p>
                The model keeps nothing between calls. "Memory" is an illusion the harness
                maintains by re-sending the conversation every turn. That's the single most
                important idea in this lab — and the reason a context budget exists at all.
              </p>
            </article>

            <!-- Grow then compact -->
            <article class="cv-card">
              <div class="cv-card-head">
                <ArrowsInSimpleIcon size={26} weight="duotone" />
                <h4>Grow verbatim, then compact</h4>
              </div>
              <p>
                The conversation is kept word-for-word until it crosses a trigger — a fraction of
                the budget. Then the oldest middle turns are summarized into memory and dropped.
                Fill, then fall.
              </p>
              <div class="cv-chain">
                <span class="cv-chip">max 1000</span>
                <span class="cv-mm-sep">×</span>
                <span class="cv-chip">ratio 0.7</span>
                <ArrowRightIcon size={14} weight="bold" />
                <span class="cv-chip cv-chip-live">trigger 700</span>
              </div>
            </article>

            <!-- Pinned + recent protected -->
            <article class="cv-card">
              <div class="cv-card-head">
                <PushPinIcon size={26} weight="duotone" />
                <h4>The middle folds; the ends are protected</h4>
              </div>
              <p>
                Compaction only ever touches the <em>middle</em>. The first few turns (pinned)
                set up the conversation, and the last few (recent) keep follow-ups accurate — both
                are always kept verbatim.
              </p>
              <div class="cv-chain">
                <span class="cv-chip cv-chip-iface">pinned</span>
                <ArrowRightIcon size={14} weight="bold" />
                <span class="cv-chip cv-chip-live">older → memory</span>
                <ArrowRightIcon size={14} weight="bold" />
                <span class="cv-chip cv-chip-iface">recent</span>
              </div>
            </article>

            <!-- Cheap math + knobs -->
            <article class="cv-card">
              <div class="cv-card-head">
                <SlidersHorizontalIcon size={26} weight="duotone" />
                <h4>Cheap token math, tunable knobs</h4>
              </div>
              <p>
                Token counts are estimated with a simple <code>length ÷ 4</code> heuristic — fast,
                no tokenizer needed. Four <code>.env</code> knobs decide when compaction fires;
                lower the max to watch it happen in just a few messages.
              </p>
              <pre class="cv-code"><code>MEMORY_MAX_TOKENS=600       <span class="c-cm">// the ceiling (retained context)</span>
MEMORY_TRIGGER_RATIO=0.67   <span class="c-cm">// compact at 67% → trigger 402</span>
MEMORY_PINNED_TURNS=0       <span class="c-cm">// opening turns kept verbatim</span>
MEMORY_KEEP_RECENT=2        <span class="c-cm">// latest turns kept verbatim</span></code></pre>
            </article>
          </div>
        </details>

        <!-- ── D · File tree ── -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">D</span> Where each piece lives<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            The memory machinery is a few small files in the framework. Open any of them
            afterwards to see the full detail.
          </p>

          <pre class="cv-tree"><code><span class="tr-dir">hunting-agent/src/</span>
│
├─ <span class="tr-dir">routes/lab/03/api/chat/</span>
│  └─ <span class="tr-file">+server.ts</span>              <span class="tr-cm">← the endpoint; streams the turn back as NDJSON</span>
│
└─ <span class="tr-dir">framework/</span>
   ├─ <span class="tr-file">demo.ts</span>                 <span class="tr-cm">← runs the turn: compact → assemble → call → save</span>
   ├─ <span class="tr-file">memory-lab.ts</span>           <span class="tr-cm">← the memory model: plan, split, build, budget</span>
   ├─ <span class="tr-file">session.ts</span>             <span class="tr-cm">← the session store + token estimation</span>
   ├─ <span class="tr-dir">prompts/</span>
   │  └─ <span class="tr-file">chat.ts</span>              <span class="tr-cm">← chat + compaction system prompts</span>
   └─ <span class="tr-dir">providers/</span>              <span class="tr-cm">← the model client (one per vendor)</span></code></pre>
        </details>

        <!-- Callout -->
        <aside class="cv-callout">
          <ArrowsInSimpleIcon size={22} weight="duotone" />
          <p>
            <strong>Why compaction instead of just forgetting?</strong> Dropping old turns outright
            would make the agent lose facts mid-conversation. Summarizing them first keeps the
            durable facts — names, numbers, decisions — in a tiny memory, so the agent stays
            coherent over a long chat without ever blowing the budget. Every later lab that holds a
            conversation relies on this same trick.
          </p>
        </aside>
      </div>
    </div>
  {/if}
</main>

<style>
  main {
    width: min(1100px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 3rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  header {
    padding: 1.15rem;
    border: 1px solid rgba(189, 147, 249, 0.26);
    border-radius: 8px;
    background: rgba(22, 22, 31, 0.88);
  }
  .eyebrow {
    display: block; margin-bottom: 0.45rem;
    color: var(--brand-purple-light);
    font-family: var(--font-heading); font-size: 0.78rem; font-weight: 800;
    letter-spacing: 0.04em; text-transform: uppercase;
  }
  h1 { margin: 0; font-size: 2.25rem; color: var(--brand-yellow); }
  h3 { margin: 0.4rem 0 0.2rem; font-family: var(--font-heading); font-size: 1.05rem; color: var(--brand-yellow); }
  h3 small { color: var(--brand-muted); font-size: 0.8rem; font-weight: 400; }

  /* persistent meter */
  .meter {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.55rem 0.9rem;
    border: 1px solid rgba(245, 230, 99, 0.32);
    border-radius: 9px; background: rgba(22, 22, 31, 0.8);
    transition: box-shadow 0.3s ease, border-color 0.3s ease;
  }
  .meter.flash { border-color: var(--dracula-green); box-shadow: 0 0 0 2px rgba(80, 250, 123, 0.35); }
  .m-label { font-family: var(--font-heading); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--brand-muted); }
  .m-track { position: relative; flex: 1; height: 0.85rem; border-radius: 6px; background: rgba(189, 147, 249, 0.14); overflow: hidden; }
  .m-fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--brand-yellow); transition: width 0.4s ease; }
  .m-trigger { position: absolute; top: -2px; bottom: -2px; width: 2px; background: #ff9d5c; }
  .m-before { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--dracula-red); }
  .m-num { font-family: var(--font-heading); font-size: 0.85rem; color: var(--brand-yellow); min-width: 6.5rem; text-align: right; }
  .m-flash { font-family: var(--font-heading); font-size: 0.78rem; font-weight: 800; color: var(--dracula-green); }

  .tabs { display: flex; gap: 0.5rem; }
  .tabs button {
    min-height: 2.4rem; padding: 0.45rem 1.3rem;
    border: 1px solid rgba(189, 147, 249, 0.24); border-radius: 7px;
    background: rgba(28, 29, 39, 0.82); color: var(--brand-muted);
    font-family: var(--font-heading); font-size: 0.92rem; font-weight: 800; cursor: pointer;
  }
  .tabs button.active {
    border-color: rgba(245, 230, 99, 0.72); color: var(--brand-yellow);
    background: rgba(245, 230, 99, 0.1); box-shadow: inset 0 -2px 0 var(--brand-yellow);
  }

  .panel {
    padding: 1.2rem 1.35rem; border: 1px solid rgba(189, 147, 249, 0.25);
    border-radius: 8px; background: rgba(15, 15, 21, 0.85);
  }
  .hint { color: var(--brand-muted); font-size: 1rem; line-height: 1.55; max-width: 70ch; }

  /* chat */
  .chat { display: flex; flex-direction: column; gap: 1rem; min-height: 50vh; }
  .transcript { display: flex; flex-direction: column; gap: 0.7rem; flex: 1; }
  .bubble { display: flex; flex-direction: column; gap: 0.2rem; max-width: 80%; }
  .bubble.user { align-self: flex-end; align-items: flex-end; }
  .bubble .who { font-family: var(--font-heading); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--brand-muted); }
  .bubble .text {
    padding: 0.6rem 0.85rem; border-radius: 9px; font-size: 1rem; line-height: 1.5; white-space: pre-wrap;
    border: 1px solid rgba(189, 147, 249, 0.22); background: rgba(28, 29, 39, 0.8); color: var(--brand-text);
  }
  .bubble.user .text { border-color: rgba(245, 230, 99, 0.4); background: rgba(245, 230, 99, 0.08); }
  .status { color: var(--brand-muted); font-style: italic; }
  .composer { display: flex; gap: 0.6rem; }
  .composer textarea {
    flex: 1; resize: vertical; padding: 0.6rem 0.8rem; border-radius: 7px;
    border: 1px solid rgba(189, 147, 249, 0.3); background: rgba(22, 22, 31, 0.9);
    color: var(--brand-text); font-family: inherit; font-size: 1rem;
  }
  .composer button {
    padding: 0 1.4rem; border-radius: 7px; border: 1px solid rgba(245, 230, 99, 0.72);
    background: rgba(245, 230, 99, 0.1); color: var(--brand-yellow);
    font-family: var(--font-heading); font-weight: 800; cursor: pointer;
  }
  .composer button:disabled { opacity: 0.4; cursor: not-allowed; }

  /* context */
  .context { display: flex; flex-direction: column; gap: 1.1rem; }
  .row.this-turn { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.7rem; }
  .stat { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.7rem 0.9rem; border: 1px solid rgba(189, 147, 249, 0.22); border-radius: 8px; background: rgba(28, 29, 39, 0.7); }
  .stat strong { font-family: var(--font-heading); font-size: 1.6rem; color: var(--brand-yellow); }
  .stat span { font-size: 0.78rem; color: var(--brand-muted); }

  /* (i) explainer on the retained-context card */
  .stat-label { position: relative; display: inline-flex; align-items: center; gap: 0.4rem; }
  .info-dot {
    display: inline-flex; align-items: center; justify-content: center;
    width: 1.05rem; height: 1.05rem; padding: 0; border-radius: 50%;
    border: 1px solid rgba(189, 147, 249, 0.55); background: rgba(28, 29, 39, 0.9);
    color: var(--brand-purple, #bd93f9); font-family: var(--font-heading);
    font-size: 0.72rem; line-height: 1; cursor: help; transition: background 0.12s, border-color 0.12s;
  }
  .info-dot:hover, .info-dot:focus-visible { background: rgba(189, 147, 249, 0.22); border-color: rgba(189, 147, 249, 0.9); outline: none; }
  .info-pop {
    position: absolute; top: calc(100% + 0.5rem); right: 0; z-index: 50;
    width: min(360px, 78vw); padding: 0.9rem 1rem;
    border: 1px solid rgba(189, 147, 249, 0.4); border-radius: 10px;
    background: #1b1c27; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
    color: var(--brand-fg, #f8f8f2); font-size: 0.92rem; line-height: 1.55; text-align: left;
    opacity: 0; visibility: hidden; transform: translateY(-4px);
    transition: opacity 0.14s ease, transform 0.14s ease, visibility 0.14s;
    pointer-events: none;
  }
  .info-pop strong { font-family: inherit; font-size: inherit; color: var(--brand-yellow); }
  .info-pop code { font-size: 0.86em; color: var(--brand-purple, #bd93f9); background: rgba(189, 147, 249, 0.12); padding: 0.05em 0.3em; border-radius: 4px; }
  .stat-label:hover .info-pop, .stat-label:focus-within .info-pop { opacity: 1; visibility: visible; transform: translateY(0); pointer-events: auto; }

  .capacity { display: flex; flex-direction: column; gap: 0.4rem; }
  .cap-head { display: flex; justify-content: space-between; font-family: var(--font-heading); font-size: 0.85rem; color: var(--brand-text); }
  .cap-track { position: relative; height: 1.1rem; border-radius: 6px; background: rgba(189, 147, 249, 0.14); overflow: hidden; }
  .cap-fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--brand-yellow); transition: width 0.4s ease; }
  .cap-trigger { position: absolute; top: -3px; bottom: -3px; width: 2px; background: #ff9d5c; }
  .cap-before { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--dracula-red); }
  .cap-legend { display: flex; gap: 1.2rem; font-size: 0.8rem; color: var(--brand-muted); }
  .dot { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 2px; vertical-align: middle; margin-right: 0.25rem; }
  .dot.trig { background: #ff9d5c; } .dot.before { background: var(--dracula-red); }
  .dot.pinned { background: var(--brand-purple); } .dot.compacted { background: var(--dracula-green); }
  .dot.middle { background: #6b6688; } .dot.recent { background: var(--brand-yellow); }

  .sections { display: flex; flex-direction: column; gap: 0.55rem; }
  .sec-head { display: flex; justify-content: space-between; font-family: var(--font-heading); font-size: 0.85rem; }
  .sec-label { color: var(--brand-purple-light); } .sec-tok { color: var(--brand-yellow); }
  .sec-bar { height: 0.5rem; border-radius: 4px; background: rgba(189, 147, 249, 0.12); overflow: hidden; margin: 0.2rem 0; }
  .sec-bar span { display: block; height: 100%; background: var(--brand-purple); }
  .sec-desc { margin: 0; font-size: 0.78rem; color: var(--brand-muted); line-height: 1.45; }

  .msgarr { display: flex; flex-wrap: wrap; gap: 4px; }
  .cell { width: 1.7rem; height: 1.7rem; border-radius: 4px; display: grid; place-items: center; font-family: var(--font-heading); font-size: 0.7rem; font-weight: 800; color: #0f0f15; }
  .cell.pinned { background: var(--brand-purple); } .cell.compacted { background: var(--dracula-green); }
  .cell.middle { background: #6b6688; color: #ddd; } .cell.recent { background: var(--brand-yellow); }
  .msg-legend { display: flex; gap: 1.1rem; font-size: 0.8rem; color: var(--brand-muted); }

  .compaction { padding: 0.8rem 1rem; border: 1px solid rgba(189, 147, 249, 0.25); border-radius: 8px; background: rgba(28, 29, 39, 0.7); }
  .compaction.fired { border-color: var(--dracula-green); }
  .compaction strong { font-family: var(--font-heading); color: var(--brand-text); }
  .compaction p { margin: 0.3rem 0 0; font-size: 0.88rem; color: var(--brand-muted); line-height: 1.5; }
  .compaction.fired { background: rgba(80, 250, 123, 0.07); }
  .comp-head { font-family: var(--font-heading); font-weight: 800; color: var(--dracula-green); font-size: 1.05rem; margin-bottom: 0.6rem; }
  .comp-flow { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem 0.9rem; }
  .comp-num { display: flex; flex-direction: column; line-height: 1.05; }
  .comp-num strong { font-family: var(--font-heading); font-size: 1.5rem; color: var(--brand-yellow); }
  .comp-num.drop strong { color: var(--dracula-green); }
  .comp-num span { font-size: 0.72rem; color: var(--brand-muted); }
  .comp-arrow { color: var(--dracula-green); font-size: 1.4rem; font-weight: 800; }
  .comp-sep { color: var(--brand-muted); }

  .lesson { border: 1px solid rgba(189, 147, 249, 0.22); border-radius: 8px; background: rgba(22, 22, 31, 0.7); padding: 0.5rem 1rem; }
  .lesson summary { cursor: pointer; font-family: var(--font-heading); font-weight: 800; color: var(--brand-purple-light); padding: 0.4rem 0; }
  .lesson ol { margin: 0.4rem 0 0.6rem; padding-left: 1.3rem; display: flex; flex-direction: column; gap: 0.45rem; }
  .lesson li { font-size: 0.92rem; color: var(--brand-muted); line-height: 1.5; }
  .lesson b { color: var(--brand-text); }
  .lesson em { color: var(--brand-yellow); font-style: normal; }

  /* ═══ CODE VIEW (architectural reference) ══════════════ */
  .code-view { padding: 0.25rem 0 0; }
  .code-inner {
    max-width: 940px;
    margin: 0 auto;
    padding: 1.5rem 0.25rem 3rem;
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

  /* Context-window anatomy */
  .cw {
    border: 1px solid #1c1c30;
    border-radius: 10px;
    background: rgba(18, 18, 26, 0.6);
    padding: 1.1rem 1.2rem;
  }
  .cw-bar {
    position: relative;
    display: flex;
    height: 2.6rem;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #2a2a40;
  }
  .cw-seg { height: 100%; }
  .cw-sys { background: #44475a; }
  .cw-mem { background: #bd93f9; }
  .cw-pin { background: #8be9fd; }
  .cw-old { background: #f5e663; }
  .cw-rec { background: #50fa7b; }
  .cw-trigger {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 0;
    border-left: 2px dashed #ff79c6;
  }
  .cw-legend {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-top: 0.9rem;
    font-size: 0.82rem;
    color: #aeaebe;
  }
  .cw-legend span { display: flex; align-items: center; gap: 0.5rem; }
  .cw-dot {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 3px;
    flex-shrink: 0;
  }
  i.cw-dot.cw-sys { background: #44475a; }
  i.cw-dot.cw-mem { background: #bd93f9; }
  i.cw-dot.cw-pin { background: #8be9fd; }
  i.cw-dot.cw-old { background: #f5e663; }
  i.cw-dot.cw-rec { background: #50fa7b; }
  .cw-note {
    margin: 1rem 0 0;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.7;
  }
  .cw-hl-old { color: #f5e663; }
  .cw-hl-mem { color: #bd93f9; }

  /* Concept cards (stacked) */
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
  .cv-code code {
    background: none;
    border: none;
    padding: 0;
    color: #d6d6e2;
    font-size: 0.82rem;
  }
  .cv-code .c-cm { color: #6272a4; }

  .cv-chain {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .cv-chain :global(svg) { color: #50fa7b; }
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
    color: #8be9fd;
    border-color: rgba(139, 233, 253, 0.5);
    font-weight: 700;
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
