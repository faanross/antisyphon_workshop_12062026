<script lang="ts">
  import { onMount } from "svelte";
  import KnowledgeGraph from "$lib/components/KnowledgeGraph.svelte";
  import ListChecksIcon from "phosphor-svelte/lib/ListChecksIcon";
  import GraphIcon from "phosphor-svelte/lib/GraphIcon";
  import ShareNetworkIcon from "phosphor-svelte/lib/ShareNetworkIcon";
  import DatabaseIcon from "phosphor-svelte/lib/DatabaseIcon";
  import ArrowsInIcon from "phosphor-svelte/lib/ArrowsInIcon";
  import TargetIcon from "phosphor-svelte/lib/TargetIcon";
  import HardDrivesIcon from "phosphor-svelte/lib/HardDrivesIcon";
  import UserIcon from "phosphor-svelte/lib/UserIcon";
  import GearIcon from "phosphor-svelte/lib/GearIcon";
  import GlobeHemisphereWestIcon from "phosphor-svelte/lib/GlobeHemisphereWestIcon";
  import DetectiveIcon from "phosphor-svelte/lib/DetectiveIcon";
  import CpuIcon from "phosphor-svelte/lib/CpuIcon";
  import ArrowRightIcon from "phosphor-svelte/lib/ArrowRightIcon";

  type Graph = {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ source: string; target: string; label: string }>;
  };

  let activeTab = $state<"lab" | "code">("lab");
  let graph = $state<Graph | null>(null);

  onMount(async () => {
    const response = await fetch("/lab/10/api/graph");
    graph = await response.json();
  });
</script>

<svelte:head><title>Lab 10 | Knowledge Graph Shared State</title></svelte:head>

<main class="lab-shell">
  <a class="back" href="/">Labs</a>

  <header class="hero">
    <span>Lab 10</span>
    <h1>Knowledge Graph Shared State</h1>
    <p>Convert candidate and finding entities into nodes and edges so independent detections can be joined through shared relationships.</p>
  </header>

  <div class="tab-bar-top">
    <button class="tab-btn-top" class:active={activeTab === "lab"} onclick={() => (activeTab = "lab")}>Lab</button>
    <button class="tab-btn-top" class:active={activeTab === "code"} onclick={() => (activeTab = "code")}>Code</button>
  </div>

  {#if activeTab === "lab"}
  {#if graph}
    <section class="panel">
      <div class="panel-head">
        <h2>Graph State</h2>
        <span>{graph.nodes.length} nodes | {graph.edges.length} edges</span>
      </div>
      <KnowledgeGraph {graph} />
    </section>

    <section class="panel">
      <h2>Relationship Table</h2>
      <table>
        <thead><tr><th>Source</th><th>Relationship</th><th>Target</th></tr></thead>
        <tbody>
          {#each graph.edges as edge}
            <tr><td>{edge.source}</td><td>{edge.label}</td><td>{edge.target}</td></tr>
          {/each}
        </tbody>
      </table>
    </section>
  {:else}
    <section class="panel"><p>Loading graph state.</p></section>
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
          <h2>How separate findings become one picture</h2>
          <p>
            Optional reading for the curious. Lab 09 produced a pile of independent findings — but on
            their own they're disconnected. This lab turns them into a <strong>graph</strong>: every
            candidate and the entities it touches (host, user, process, destination IP) become
            <strong>nodes</strong>, joined by typed <strong>edges</strong>. When two findings share
            an entity, they share a node — so overlap becomes visible. This is pure structure: no
            model call here.
          </p>
          <div class="cv-mental-model">
            <ListChecksIcon size={20} weight="duotone" />
            <span>findings</span>
            <span class="cv-mm-sep">→</span>
            <GraphIcon size={20} weight="duotone" />
            <span>nodes + typed edges</span>
            <span class="cv-mm-sep">→</span>
            <ShareNetworkIcon size={20} weight="duotone" />
            <span>shared entities = shared state</span>
          </div>
        </header>

        <!-- A · Journey -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">A</span> How the graph is built<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            One pass over the candidates builds the whole graph. It's deterministic — the same
            candidates always produce the same graph.
          </p>

          <ol class="flow">
            <li class="flow-step" style="--d: 0ms">
              <span class="flow-rail"><DatabaseIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Load the candidates</span><span class="flow-where">server · graph.ts</span></div>
                <p>The scored candidates — each carrying its host, user, process, and destination — are loaded as the raw material for the graph.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 90ms">
              <span class="flow-rail"><GraphIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Emit a node per candidate &amp; entity</span><span class="flow-where">server · buildCandidateSubgraph</span></div>
                <p>Each candidate becomes a <code>candidate</code> node. Its host, user, process, and destination IP each become their own node, linked back with a typed edge.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 180ms">
              <span class="flow-rail"><ArrowsInIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Deduplicate entity nodes</span><span class="flow-badge">the key step</span><span class="flow-where">server · graph.ts</span></div>
                <p>An entity node is only added once. So if three candidates all sit on <code>DEV-WS03</code>, they all link to the <em>same</em> host node — overlap becomes shared structure, automatically.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 270ms">
              <span class="flow-rail"><ShareNetworkIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Return nodes + edges</span><span class="flow-where">server → browser</span></div>
                <p>The finished <code>{"{ nodes, edges }"}</code> graph is returned and drawn — and the relationship table lists every edge as <em>source → relationship → target</em>.</p>
              </div>
            </li>
          </ol>
        </details>

        <!-- B · The graph shape -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">B</span> Nodes, edges, and overlap<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            Every candidate links out to four kinds of entity with a named relationship:
          </p>

          <div class="g10-edges">
            <div class="g10-row"><span class="g10-from"><TargetIcon size={15} weight="duotone" />candidate</span><code class="g10-edge">ON_HOST</code><ArrowRightIcon size={13} weight="bold" /><span class="g10-to"><HardDrivesIcon size={15} weight="duotone" />host</span></div>
            <div class="g10-row"><span class="g10-from"><TargetIcon size={15} weight="duotone" />candidate</span><code class="g10-edge">ATTRIBUTED_TO</code><ArrowRightIcon size={13} weight="bold" /><span class="g10-to"><UserIcon size={15} weight="duotone" />user</span></div>
            <div class="g10-row"><span class="g10-from"><TargetIcon size={15} weight="duotone" />candidate</span><code class="g10-edge">FROM_PROCESS</code><ArrowRightIcon size={13} weight="bold" /><span class="g10-to"><GearIcon size={15} weight="duotone" />process</span></div>
            <div class="g10-row"><span class="g10-from"><TargetIcon size={15} weight="duotone" />candidate</span><code class="g10-edge">CONNECTS_TO</code><ArrowRightIcon size={13} weight="bold" /><span class="g10-to"><GlobeHemisphereWestIcon size={15} weight="duotone" />ip</span></div>
          </div>

          <p class="cv-note">Because entity nodes are shared, two separate findings can meet at one:</p>
          <div class="g10-overlap">
            <span class="g10-cand">BEA-001</span>
            <code class="g10-edge">CONNECTS_TO</code>
            <span class="g10-shared"><GlobeHemisphereWestIcon size={15} weight="duotone" />45.61.&#8230;</span>
            <code class="g10-edge">CONNECTS_TO</code>
            <span class="g10-cand">EXF-003</span>
          </div>
          <p class="cv-note">
            That shared IP node is the whole point: a beacon and an exfil finding, discovered
            independently, are now visibly part of the same activity.
          </p>
        </details>

        <!-- C · Four ideas -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">C</span> Four ideas worth understanding<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <div class="cv-cards">
            <article class="cv-card">
              <div class="cv-card-head"><GraphIcon size={26} weight="duotone" /><h4>Findings become nodes and edges</h4></div>
              <p>A flat list can't express "these touch the same host." A graph can. Each finding and the entities it references turn into nodes joined by typed relationships.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><ShareNetworkIcon size={26} weight="duotone" /><h4>Deduplication is the shared state</h4></div>
              <p>The same host or IP is stored once. Every finding that references it points at that single node — so the graph <em>is</em> the agent's shared memory across findings, with overlap built in for free.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><DetectiveIcon size={26} weight="duotone" /><h4>Overlap reveals the campaign</h4></div>
              <p>Three alerts converging on one host or destination isn't three incidents — it's one. The graph surfaces that connection that a row-by-row view would hide.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><CpuIcon size={26} weight="duotone" /><h4>It's deterministic — no model</h4></div>
              <p>Building the graph is pure structure-mapping: same candidates in, same graph out. The reasoning comes next — Lab 11 reads this graph to write the narrative.</p>
            </article>
          </div>
        </details>

        <!-- D · File tree -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">D</span> Where each piece lives<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">The whole graph builder is one small, dependency-light file.</p>
          <pre class="cv-tree"><code><span class="tr-dir">hunting-agent/src/</span>
│
├─ <span class="tr-dir">routes/lab/10/api/graph/</span>
│  └─ <span class="tr-file">+server.ts</span>             <span class="tr-cm">← endpoint → loadWorkshopGraph()</span>
│
└─ <span class="tr-dir">framework/</span>
   └─ <span class="tr-file">graph.ts</span>               <span class="tr-cm">← buildCandidateSubgraph: nodes, typed edges, dedup</span></code></pre>
        </details>

        <!-- Callout -->
        <aside class="cv-callout">
          <ShareNetworkIcon size={22} weight="duotone" />
          <p>
            <strong>Why a graph instead of a list?</strong> Lists answer "what did we find?". Graphs
            answer "how does it connect?" — and connection is what turns scattered alerts into a
            story. This shared state is the substrate the next lab reasons over: the narrative is only
            possible because the findings already share nodes.
          </p>
        </aside>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(body) { background: #07070a; }
  .lab-shell {
    min-height: 100vh;
    padding: 2.5rem max(1rem, calc((100vw - 1120px) / 2));
    background: linear-gradient(135deg, rgba(189, 147, 249, 0.06), transparent 34%), #07070a;
    color: rgba(255, 255, 255, 0.9);
    font-family: var(--font-heading);
  }
  .back { display: inline-flex; margin-bottom: 1rem; color: #f5e663; font-size: .75rem; font-weight: 800; text-decoration: none; text-transform: uppercase; }
  .hero, .panel { border: 1px solid rgba(189, 147, 249, 0.24); border-radius: 4px; background: rgba(22, 22, 31, 0.92); padding: 1.4rem; box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32); }
  .panel { margin-top: 1rem; }
  .hero span, .panel-head span { color: #bd93f9; text-transform: uppercase; font-weight: 800; }
  h1, h2, p { margin: 0; }
  h1 { color: #f5e663; font-size: clamp(2.5rem, 7vw, 5rem); line-height: .98; }
  h2 { color: #f5e663; }
  p { color: rgba(255, 255, 255, 0.62); line-height: 1.55; }
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { border-bottom: 1px solid rgba(255, 255, 255, 0.12); padding: .65rem; text-align: left; vertical-align: top; }
  th { color: #8be9fd; }
  td { color: rgba(255, 255, 255, 0.72); }

  /* ═══ Top tab bar ══════════════════════════════════════ */
  .tab-bar-top {
    display: flex;
    gap: 0;
    border-bottom: 1px solid #1a1a2e;
    margin-bottom: 1rem;
  }
  .tab-btn-top {
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

  /* Graph edge legend + overlap */
  .g10-edges { display: flex; flex-direction: column; gap: 0.45rem; }
  .g10-row, .g10-overlap {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    border: 1px solid #1c1c30;
    border-radius: 8px;
    background: rgba(18, 18, 26, 0.6);
    padding: 0.5rem 0.75rem;
  }
  .g10-overlap { justify-content: center; margin-top: 0.3rem; }
  .g10-row > :global(svg), .g10-overlap > :global(svg) { color: #6f6f86; flex-shrink: 0; }
  .g10-from, .g10-to, .g10-cand, .g10-shared {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.82rem;
    color: #cfcfe0;
    background: #0d0d14;
    border: 1px solid #2a2a40;
    border-radius: 6px;
    padding: 0.25rem 0.55rem;
  }
  .g10-from { margin-right: auto; }
  .g10-from :global(svg) { color: #f5e663; }
  .g10-to :global(svg) { color: #8be9fd; }
  .g10-cand { color: #f5e663; border-color: rgba(245, 230, 99, 0.4); }
  .g10-shared { color: #50fa7b; border-color: rgba(80, 250, 123, 0.45); }
  .g10-shared :global(svg) { color: #50fa7b; }
  .code-view code.g10-edge {
    color: #bd93f9;
    background: rgba(189, 147, 249, 0.08);
    border-color: rgba(189, 147, 249, 0.22);
    font-size: 0.74rem;
  }
  .cv-note {
    margin: 1rem 0 0.4rem;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.7;
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
