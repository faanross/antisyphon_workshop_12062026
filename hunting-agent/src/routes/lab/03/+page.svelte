<script lang="ts">
  import type { ContextBudgetReport } from "../../../framework/session";

  type Role = "user" | "assistant";
  interface Msg { role: Role; content: string; }

  // One stable session id per browser tab — this is what gives continuity.
  const sessionId = `ctx-${Math.random().toString(36).slice(2)}-${Date.now()}`;

  let messages = $state<Msg[]>([]);
  let draft = $state("");
  let busy = $state(false);
  let status = $state("");
  let activeTab = $state<"chat" | "context">("chat");
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
  <div class="meter" class:flash={compactionFlash}>
    <span class="m-label">context</span>
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

  <div class="tabs" role="tablist">
    <button type="button" role="tab" class:active={activeTab === "chat"} onclick={() => (activeTab = "chat")}>Chat</button>
    <button type="button" role="tab" class:active={activeTab === "context"} onclick={() => (activeTab = "context")}>Context Window</button>
  </div>

  {#if activeTab === "chat"}
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
  {:else}
    <section class="panel context">
      {#if !budget}
        <p class="hint">Send a message first — then this panel shows exactly what the harness assembles for the model call, and how retained context grows toward the compaction threshold.</p>
      {:else}
        <!-- This turn, plainly -->
        <div class="row this-turn">
          <div class="stat"><strong>{budget.systemPromptTokens}</strong><span>system prompt</span></div>
          <div class="stat"><strong>{budget.retainedContextTokens}</strong><span>retained context</span></div>
          <div class="stat"><strong>{budget.currentTurnPromptTokens}</strong><span>turn prompt</span></div>
          <div class="stat"><strong>{budget.currentTurnOutputTokens}</strong><span>output</span></div>
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
</style>
