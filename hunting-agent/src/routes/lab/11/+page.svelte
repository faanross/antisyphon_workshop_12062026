<script lang="ts">
  import KnowledgeGraph from "$lib/components/KnowledgeGraph.svelte";

  type Finding = { id: string; candidateId: string; skillName: string; evidenceSummary: string; verdict: string };
  type Graph = { nodes: Array<{ id: string; label: string; type: string }>; edges: Array<{ source: string; target: string; label: string }> };

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
    <button onclick={run} disabled={busy}>{busy ? "Synthesizing" : "Run Narrative"}</button>
  </header>

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
</style>
