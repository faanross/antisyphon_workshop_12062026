<script lang="ts">
  import chunks from "$lib/data/workshop/rag/chunks.json";
  import ChatPanel from "$lib/components/ChatPanel.svelte";
  import CorpusBrowser from "$lib/components/lab07/CorpusBrowser.svelte";
  import RAGResultsPanel from "$lib/components/lab07/RAGResultsPanel.svelte";
  import SynthesisPanel from "$lib/components/lab07/SynthesisPanel.svelte";
  import CursorClickIcon from "phosphor-svelte/lib/CursorClickIcon";
  import VectorThreeIcon from "phosphor-svelte/lib/VectorThreeIcon";
  import MagnifyingGlassIcon from "phosphor-svelte/lib/MagnifyingGlassIcon";
  import RobotIcon from "phosphor-svelte/lib/RobotIcon";
  import BooksIcon from "phosphor-svelte/lib/BooksIcon";
  import ScissorsIcon from "phosphor-svelte/lib/ScissorsIcon";
  import DatabaseIcon from "phosphor-svelte/lib/DatabaseIcon";
  import ScalesIcon from "phosphor-svelte/lib/ScalesIcon";
  import FunnelIcon from "phosphor-svelte/lib/FunnelIcon";
  import ArrowRightIcon from "phosphor-svelte/lib/ArrowRightIcon";

  type Hit = {
    chunk_id: string;
    source_report: string;
    report_title: string;
    verdict: string;
    section: string;
    score: number;
    text: string;
  };

  let activeTab = $state<"lab" | "code">("lab");
  let query = $state("CrowdFalcon EDR heartbeat beacon false positive 10.42.10.0/24");
  let synthesis = $state("");
  let hits = $state<Hit[]>([]);
  let busy = $state(false);

  async function run(value: string) {
    busy = true;
    const response = await fetch("/api/lab07/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: value }),
    });
    const data = await response.json();
    hits = data.hits;
    synthesis = data.synthesis;
    busy = false;
  }
</script>

<svelte:head><title>Lab 08 | RAG</title></svelte:head>

<main>
  <header>
    <p class="eyebrow">Lab 08</p>
    <h1>RAG Prior Investigations</h1>
  </header>

  <div class="tab-bar-top">
    <button class="tab-btn-top" class:active={activeTab === "lab"} onclick={() => (activeTab = "lab")}>Lab</button>
    <button class="tab-btn-top" class:active={activeTab === "code"} onclick={() => (activeTab = "code")}>Code</button>
  </div>

  {#if activeTab === "lab"}
  <section class="workspace">
    <ChatPanel title="RAG Query" bind:value={query} output={synthesis} {busy} onSubmit={run} />
    <CorpusBrowser chunks={chunks} />
  </section>

  <RAGResultsPanel {hits} />
  <SynthesisPanel {synthesis} />
  {:else}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- CODE VIEW  (architectural reference, non-interactive)-->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="code-view">
      <div class="code-inner">
        <!-- Intro -->
        <header class="cv-hero">
          <span class="cv-eyebrow">Under the Hood</span>
          <h2>How the agent recalls prior investigations</h2>
          <p>
            Optional reading for the curious. In Lab 07 the skill named the exact context files it
            needed. But often you <em>don't know in advance</em> which past case is relevant. RAG —
            Retrieval-Augmented Generation — fixes that: it searches a library of prior
            investigations by <strong>meaning</strong>, pulls the closest matches, and injects them
            so the model can answer with precedent. This is a real model call.
          </p>
          <div class="cv-mental-model">
            <MagnifyingGlassIcon size={20} weight="duotone" />
            <span>your query</span>
            <span class="cv-mm-sep">→</span>
            <BooksIcon size={20} weight="duotone" />
            <span>find similar past cases</span>
            <span class="cv-mm-sep">→</span>
            <RobotIcon size={20} weight="duotone" />
            <span>synthesize with precedent</span>
          </div>
        </header>

        <!-- A · Journey -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">A</span> The journey of one query<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            The library was indexed once, ahead of time. Each query then embeds, searches, and
            synthesizes — only the last step calls the model.
          </p>

          <ol class="flow">
            <li class="flow-step" style="--d: 0ms">
              <span class="flow-rail"><CursorClickIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">You ask a question</span><span class="flow-where">browser</span></div>
                <p>A free-text query — describing the situation you're investigating — is posted to the server.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 90ms">
              <span class="flow-rail"><VectorThreeIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Embed the query</span><span class="flow-where">server · rag.ts</span></div>
                <p>The query text is turned into a <strong>768-number vector</strong> — a point in "meaning space" — using the same local embedding the library was built with.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 180ms">
              <span class="flow-rail"><MagnifyingGlassIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Search the store</span><span class="flow-badge">the retrieval</span><span class="flow-where">server · rag.ts</span></div>
                <p><code>queryPriorInvestigations()</code> compares the query vector against all <strong>96 stored chunks</strong> by cosine similarity and keeps the <strong>top 5</strong> — the closest precedent.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 270ms">
              <span class="flow-rail"><RobotIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Inject &amp; synthesize</span><span class="flow-where">server · demo.ts · providers/*</span></div>
                <p>The retrieved chunks are injected into the prompt and the model synthesizes an answer — instructed to use the prior cases as precedent, but to <em>compare evidence before borrowing a verdict</em>.</p>
              </div>
            </li>
          </ol>
        </details>

        <!-- B · How retrieval works -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">B</span> How retrieval works<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            Two timelines: the library is embedded <em>once</em>; every query is matched against it.
          </p>

          <div class="rag">
            <div class="rag-lane">
              <span class="rag-when">indexed once</span>
              <div class="rag-flow">
                <span class="rag-node"><BooksIcon size={16} weight="duotone" />12 reports</span>
                <ArrowRightIcon size={13} weight="bold" />
                <span class="rag-node"><ScissorsIcon size={16} weight="duotone" />96 chunks</span>
                <ArrowRightIcon size={13} weight="bold" />
                <span class="rag-node"><VectorThreeIcon size={16} weight="duotone" />768-d vectors</span>
                <ArrowRightIcon size={13} weight="bold" />
                <span class="rag-node"><DatabaseIcon size={16} weight="duotone" />vectors.bin</span>
              </div>
            </div>
            <div class="rag-lane rag-live">
              <span class="rag-when">every query</span>
              <div class="rag-flow">
                <span class="rag-node"><MagnifyingGlassIcon size={16} weight="duotone" />query → vector</span>
                <ArrowRightIcon size={13} weight="bold" />
                <span class="rag-node">cosine vs 96</span>
                <ArrowRightIcon size={13} weight="bold" />
                <span class="rag-node rag-hit"><FunnelIcon size={16} weight="duotone" />top 5</span>
              </div>
            </div>
          </div>
          <p class="cv-note">
            "Closest by cosine" means most similar in meaning — so a query about an EDR heartbeat
            false positive surfaces the past report about that exact pattern, even if it shares no
            keywords.
          </p>
        </details>

        <!-- C · Four ideas -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">C</span> Four ideas worth understanding<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <div class="cv-cards">
            <article class="cv-card">
              <div class="cv-card-head"><MagnifyingGlassIcon size={26} weight="duotone" /><h4>Retrieve, then generate</h4></div>
              <p>RAG is two moves: <em>search</em> a knowledge store for relevant pieces, then let the model <em>generate</em> grounded in them. Lab 07 you named the files; here the system finds them by meaning.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><VectorThreeIcon size={26} weight="duotone" /><h4>Embeddings turn text into geometry</h4></div>
              <p>Each chunk becomes a 768-number vector; similar meaning lands nearby. Similarity is just the cosine angle between two vectors. This workshop uses a self-contained local embedding — no external API.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><ScissorsIcon size={26} weight="duotone" /><h4>Chunking makes retrieval precise</h4></div>
              <p>Reports are split into ~150-token overlapping chunks, so a search returns the <em>relevant paragraph</em>, not a whole document — tighter, more useful context.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><ScalesIcon size={26} weight="duotone" /><h4>Precedent is not a verdict</h4></div>
              <p>The model is told to use prior cases as precedent but compare the actual evidence before borrowing a conclusion. Retrieval <em>informs</em> the judgement; it doesn't replace it.</p>
            </article>
          </div>
        </details>

        <!-- D · File tree -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">D</span> Where each piece lives<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">The prebuilt index is data; the retrieval logic is one small framework file.</p>
          <pre class="cv-tree"><code><span class="tr-dir">hunting-agent/</span>
│
├─ <span class="tr-dir">data/rag/</span>                     <span class="tr-cm">← the prebuilt index (loaded at query time)</span>
│  ├─ <span class="tr-dir">corpus/</span>                    <span class="tr-cm">← the 12 prior-investigation reports</span>
│  ├─ <span class="tr-file">chunks.json</span>              <span class="tr-cm">← 96 chunks + metadata (source, verdict, tags)</span>
│  ├─ <span class="tr-file">vectors.bin</span>              <span class="tr-cm">← 96 × 768 float32 vectors (row-major)</span>
│  └─ <span class="tr-file">store-meta.json</span>          <span class="tr-cm">← model, dimensions, chunk counts</span>
│
└─ <span class="tr-dir">src/</span>
   ├─ <span class="tr-dir">routes/api/lab07/query/</span>
   │  └─ <span class="tr-file">+server.ts</span>           <span class="tr-cm">← endpoint → runRagInvestigation()</span>
   └─ <span class="tr-dir">framework/</span>
      └─ <span class="tr-file">rag.ts</span>               <span class="tr-cm">← embed query · cosine search · build context</span></code></pre>
        </details>

        <!-- Callout -->
        <aside class="cv-callout">
          <BooksIcon size={22} weight="duotone" />
          <p>
            <strong>Static injection or retrieval?</strong> Use Lab 07's explicit injection when you
            know exactly which context applies (this host's record, this policy). Reach for RAG when
            you don't — when the useful precedent is somewhere in a large, growing body of past work
            and has to be <em>found</em> by relevance. Most real agents use both.
          </p>
        </aside>
      </div>
    </div>
  {/if}
</main>

<style>
  main {
    width: min(1440px, calc(100% - 2rem));
    min-height: 100vh;
    margin: 0 auto;
    padding: 2rem 0 3rem;
    color: var(--dracula-fg);
  }

  header {
    margin-bottom: 1rem;
    padding: 1rem;
    border: 1px solid rgba(98, 114, 164, 0.5);
    border-radius: 8px;
    background: rgba(33, 34, 44, 0.84);
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

  h1 {
    margin: 0;
    color: var(--brand-yellow);
    font-family: var(--font-heading);
    font-size: clamp(2.1rem, 4vw, 4rem);
    line-height: 1.02;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
    gap: 1rem;
    align-items: start;
    margin-bottom: 1rem;
  }

  @media (max-width: 980px) {
    .workspace {
      grid-template-columns: 1fr;
    }
  }

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

  /* RAG retrieval diagram */
  .rag {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    border: 1px solid #1c1c30;
    border-radius: 10px;
    background: rgba(18, 18, 26, 0.6);
    padding: 1.1rem 1.2rem;
  }
  .rag-lane {
    border: 1px solid #2a2a40;
    border-radius: 8px;
    background: #0d0d14;
    padding: 0.6rem 0.8rem;
  }
  .rag-live { border-left: 3px solid #50fa7b; }
  .rag-when {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #7d7d92;
    margin-bottom: 0.5rem;
  }
  .rag-live .rag-when { color: #50fa7b; }
  .rag-flow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }
  .rag-flow :global(svg) { color: #6f6f86; flex-shrink: 0; }
  .rag-node {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.8rem;
    color: #cfcfe0;
    background: #12121a;
    border: 1px solid #2a2a40;
    border-radius: 5px;
    padding: 0.25rem 0.55rem;
  }
  .rag-node :global(svg) { color: #8be9fd; }
  .rag-hit {
    color: #f5e663;
    border-color: rgba(245, 230, 99, 0.5);
  }
  .rag-hit :global(svg) { color: #f5e663; }
  .cv-note {
    margin: 1rem 0 0;
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
