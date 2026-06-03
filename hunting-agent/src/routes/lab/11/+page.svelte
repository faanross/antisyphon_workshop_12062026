<script lang="ts">
  import KnowledgeGraph from "$lib/components/KnowledgeGraph.svelte";
  import GraphIcon from "phosphor-svelte/lib/GraphIcon";
  import RobotIcon from "phosphor-svelte/lib/RobotIcon";
  import ScrollIcon from "phosphor-svelte/lib/ScrollIcon";
  import ListChecksIcon from "phosphor-svelte/lib/ListChecksIcon";
  import BracketsCurlyIcon from "phosphor-svelte/lib/BracketsCurlyIcon";
  import ShieldCheckIcon from "phosphor-svelte/lib/ShieldCheckIcon";
  import LinkIcon from "phosphor-svelte/lib/LinkIcon";
  import RocketLaunchIcon from "phosphor-svelte/lib/RocketLaunchIcon";

  type Finding = { id: string; candidateId: string; skillName: string; evidenceSummary: string; verdict: string };
  type Graph = { nodes: Array<{ id: string; label: string; type: string }>; edges: Array<{ source: string; target: string; label: string }> };

  let activeTab = $state<"lab" | "code">("lab");
  let result = $state<{ graph: Graph; findings: Finding[]; narrative: string; progress: unknown[] } | null>(null);
  let busy = $state(false);

  async function run() {
    busy = true;
    const response = await fetch("/lab/11/api/narrative", { method: "POST" });
    result = await response.json();
    busy = false;
  }
</script>

<svelte:head><title>Lab 11 | Graph-Grounded Narrative</title></svelte:head>

<main class="lab-shell">
  <a class="back" href="/">Labs</a>

  <header class="hero">
    <span>Lab 11</span>
    <h1>Graph-Grounded Narrative</h1>
    <p>Select graph context, combine it with detection findings, and synthesize an attack narrative that is grounded in explicit relationships.</p>
    {#if activeTab !== "code"}
      <button onclick={run} disabled={busy}>{busy ? "Synthesizing" : "Run Narrative"}</button>
    {/if}
  </header>

  <div class="tab-bar-top">
    <button class="tab-btn-top" class:active={activeTab === "lab"} onclick={() => (activeTab = "lab")}>Lab</button>
    <button class="tab-btn-top" class:active={activeTab === "code"} onclick={() => (activeTab = "code")}>Code</button>
  </div>

  {#if activeTab === "lab"}
  {#if result}
    <section class="panel">
      <div class="panel-head">
        <h2>Selected Graph Context</h2>
        <span>{result.graph.nodes.length} nodes | {result.graph.edges.length} edges</span>
      </div>
      <KnowledgeGraph graph={result.graph} />
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>Grounded Narrative</h2>
        <span>{result.findings.length} findings cited</span>
      </div>
      <pre>{result.narrative}</pre>
    </section>
  {:else}
    <section class="panel">
      <h2>What this lab isolates</h2>
      <p>This route reads graph state into the narrative stage. It is the read side of the graph, not graph construction.</p>
    </section>
  {/if}
  {:else}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- CODE VIEW  (architectural reference, non-interactive)-->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="code-view">
      <div class="code-inner">
        <!-- Intro -->
        <header class="cv-hero">
          <span class="cv-eyebrow">Under the Hood</span>
          <h2>How the agent writes a grounded story</h2>
          <p>
            Optional reading for the curious. Lab 09 produced findings; Lab 10 linked them into a
            shared graph. Here the model turns all of that into a readable campaign narrative — but
            it's <strong>fenced by the graph</strong>: it may only name entities that exist as nodes,
            and every claim must trace to a finding or an edge. That fence is what makes it
            <em>graph-grounded</em> rather than free narration.
          </p>
          <div class="cv-mental-model">
            <GraphIcon size={20} weight="duotone" />
            <span>findings + graph</span>
            <span class="cv-mm-sep">→</span>
            <ShieldCheckIcon size={20} weight="duotone" />
            <span>grounded synthesis</span>
            <span class="cv-mm-sep">→</span>
            <ScrollIcon size={20} weight="duotone" />
            <span>narrative</span>
          </div>
        </header>

        <!-- A · Journey -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">A</span> The journey of one narrative<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            This lab is the read side of the pipeline: it consumes the previous two stages, then
            makes one model call to write the story.
          </p>

          <ol class="flow">
            <li class="flow-step" style="--d: 0ms">
              <span class="flow-rail"><ListChecksIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Gather the findings</span><span class="flow-where">server · orchestrator.ts</span></div>
                <p>The fan-out from Lab 09 runs, producing the set of structured <code>DetectionFindings</code> the narrative will be built from.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 90ms">
              <span class="flow-rail"><GraphIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Build the shared graph</span><span class="flow-where">server · graph.ts</span></div>
                <p>The candidates are turned into the shared entity graph from Lab 10 — the hosts, IPs, processes, and users that link the findings together.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 180ms">
              <span class="flow-rail"><BracketsCurlyIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Serialize into the prompt</span><span class="flow-where">server · narrative.ts</span></div>
                <p>The findings, every graph node, and every edge are written out as plain text — the bounded context the model is allowed to reason over, and nothing else.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 270ms">
              <span class="flow-rail"><RobotIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Synthesize, grounded</span><span class="flow-badge">the key step</span><span class="flow-where">server · providers/*</span></div>
                <p><code>synthesizeNarrative()</code> asks the model for a few short paragraphs explaining how the findings connect <em>through</em> the shared entities — under strict rules that keep it inside the graph.</p>
              </div>
            </li>
          </ol>
        </details>

        <!-- B · The guardrail -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">B</span> The guardrail: grounded, not free<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            The findings and the graph are serialized into the prompt as plain text — this is exactly
            what the model sees:
          </p>
          <pre class="cv-code"><code><span class="c-key">findings:</span>
  - BEA-001 via hunt-c2-over-https → true_positive

<span class="c-key">nodes:</span>
  - host: DEV-WS03 (host:dev-ws03)
  - ip: 45.61.&#8230; (ip:45.61&#8230;)

<span class="c-key">edges:</span>
  - BEA-001 --CONNECTS_TO--> ip:45.61&#8230;</code></pre>
          <p class="cv-note">Two rules turn this from free narration into grounded synthesis:</p>
          <div class="g11-rules">
            <span class="g11-rule"><ShieldCheckIcon size={14} weight="bold" /> only entities that exist as nodes</span>
            <span class="g11-rule"><ShieldCheckIcon size={14} weight="bold" /> every claim traces to a finding or edge</span>
          </div>
          <p class="cv-note">
            The model can connect the dots, but it can't invent dots — no entity, verdict, or score
            that isn't already in the supplied context.
          </p>
        </details>

        <!-- C · Four ideas -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">C</span> Four ideas worth understanding<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <div class="cv-cards">
            <article class="cv-card">
              <div class="cv-card-head"><ShieldCheckIcon size={26} weight="duotone" /><h4>Grounding is a guardrail, not a suggestion</h4></div>
              <p>Free-form synthesis is where models hallucinate connections. By restricting the narrative to entities and edges that actually exist, the graph becomes a fence the model can't write outside of.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><BracketsCurlyIcon size={26} weight="duotone" /><h4>The graph is serialized as text</h4></div>
              <p>Nodes become <code>type: label (id)</code> lines and edges become <code>source --REL--> target</code> lines. The model reads that bounded context — there is no live graph access, just this snapshot.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><LinkIcon size={26} weight="duotone" /><h4>Every claim traces to evidence</h4></div>
              <p>An assertion in the narrative must map back to a supplied finding or a graph edge. That traceability is what makes the story auditable instead of plausible-sounding fiction.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><RocketLaunchIcon size={26} weight="duotone" /><h4>It's the capstone of the pipeline</h4></div>
              <p>Detect (09) → connect (10) → narrate (11). Each stage stays simple; the final readable story is what emerges when you compose them in order.</p>
            </article>
          </div>
        </details>

        <!-- D · File tree -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">D</span> Where each piece lives<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">The narrative step is one file; it reuses the orchestrator and graph from earlier labs.</p>
          <pre class="cv-tree"><code><span class="tr-dir">hunting-agent/src/</span>
│
├─ <span class="tr-dir">routes/lab/11/api/narrative/</span>
│  └─ <span class="tr-file">+server.ts</span>             <span class="tr-cm">← endpoint → graph + runInvestigation()</span>
│
└─ <span class="tr-dir">framework/</span>
   ├─ <span class="tr-file">narrative.ts</span>           <span class="tr-cm">← serialize graph + findings · grounded prompt · call</span>
   ├─ <span class="tr-file">orchestrator.ts</span>        <span class="tr-cm">← runInvestigation: findings + graph + narrative</span>
   └─ <span class="tr-file">graph.ts</span>               <span class="tr-cm">← the shared entity graph (Lab 10)</span></code></pre>
        </details>

        <!-- Callout -->
        <aside class="cv-callout">
          <ShieldCheckIcon size={22} weight="duotone" />
          <p>
            <strong>Why fence the model at all?</strong> A language model will happily write a fluent,
            confident story — including connections that were never in the data. Grounding flips the
            default: the graph decides what <em>can</em> be said, and the model's job is only to
            explain what's already there. Fluent <em>and</em> faithful, not one at the cost of the other.
          </p>
        </aside>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(body) { background: #07070a; }
  .lab-shell { min-height: 100vh; padding: 2.5rem max(1rem, calc((100vw - 1120px) / 2)); background: linear-gradient(135deg, rgba(189,147,249,.06), transparent 34%), #07070a; color: rgba(255,255,255,.9); font-family: var(--font-heading); }
  .back { display: inline-flex; margin-bottom: 1rem; color: #f5e663; font-size: .75rem; font-weight: 800; text-decoration: none; text-transform: uppercase; }
  .hero, .panel { border: 1px solid rgba(189,147,249,.24); border-radius: 4px; background: rgba(22,22,31,.92); padding: 1.4rem; box-shadow: 0 24px 80px rgba(0,0,0,.32); }
  .panel { margin-top: 1rem; }
  .hero { display: grid; gap: .8rem; }
  .hero span, .panel-head span { color: #bd93f9; text-transform: uppercase; font-weight: 800; }
  h1, h2, p { margin: 0; }
  h1 { color: #f5e663; font-size: clamp(2.5rem, 7vw, 5rem); line-height: .98; }
  h2 { color: #f5e663; }
  p { color: rgba(255,255,255,.62); line-height: 1.55; }
  button { width: fit-content; border: 1px solid rgba(245,230,99,.42); border-radius: 3px; padding: .7rem .95rem; background: rgba(245,230,99,.1); color: #f5e663; font: inherit; font-weight: 800; }
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
  pre { margin: 0; white-space: pre-wrap; color: rgba(255,255,255,.78); line-height: 1.55; }

  /* ═══ Top tab bar ══════════════════════════════════════ */
  .tab-bar-top {
    display: flex;
    gap: 0;
    border-bottom: 1px solid #1a1a2e;
    margin-bottom: 1rem;
  }
  .tab-btn-top {
    width: auto;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0.85rem 1.5rem;
    font-family: "JetBrains Mono", monospace;
    font-size: 1rem;
    font-weight: 600;
    color: #8a8a9a;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tab-btn-top:hover { color: #c0c0d0; }
  .tab-btn-top.active { color: #f5e663; border-bottom-color: #f5e663; }

  /* ═══ CODE VIEW (architectural reference) ══════════════ */
  .code-view { padding: 0.25rem 0 0; }
  .code-inner {
    max-width: 940px;
    margin: 0 auto;
    padding: 0.5rem 0.25rem 2rem;
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

  .cv-section { margin-top: 1.8rem; }
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
    background: linear-gradient(180deg, #bd93f9, #50fa7b);
    background-size: 100% 220%;
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
    box-shadow: 0 0 0 4px #07070a;
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

  /* Code snippet */
  .cv-code {
    margin: 0;
    padding: 0.75rem 0.9rem;
    background: #0d0d14;
    border: 1px solid #1a1a2e;
    border-radius: 6px;
    overflow-x: auto;
    white-space: pre;
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
  .cv-code .c-key { color: #8be9fd; }
  .cv-note {
    margin: 1rem 0 0.4rem;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.7;
  }

  /* Guardrail rule chips */
  .g11-rules { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .g11-rule {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    color: #50fa7b;
    background: rgba(80, 250, 123, 0.07);
    border: 1px solid rgba(80, 250, 123, 0.35);
    border-radius: 999px;
    padding: 0.3rem 0.7rem;
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
    margin: 0;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.65;
  }

  .cv-tree {
    margin: 0;
    padding: 1rem 1.15rem;
    background: #0d0d14;
    border: 1px solid #1a1a2e;
    border-radius: 9px;
    overflow-x: auto;
    white-space: pre;
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

  @keyframes cvRise {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes cvFlow {
    from { background-position: 0 0; }
    to { background-position: 0 -220%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .flow-step,
    .cv-hero { animation: none; opacity: 1; }
    .flow-step::before { animation: none; }
  }
</style>
