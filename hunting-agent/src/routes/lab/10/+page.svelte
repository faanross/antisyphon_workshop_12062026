<script lang="ts">
  import { onMount } from "svelte";
  import KnowledgeGraph from "$lib/components/KnowledgeGraph.svelte";

  type Graph = {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ source: string; target: string; label: string }>;
  };

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
</style>
