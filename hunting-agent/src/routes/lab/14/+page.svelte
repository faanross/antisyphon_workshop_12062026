<script lang="ts">
  type Result = {
    graph: { nodes: unknown[]; edges: unknown[] };
    findings: unknown[];
    narrative: string;
    evals: Array<{ id: string; passed: boolean; description: string }>;
    report: { fileName: string; path: string };
    notification: { channel: string; delivered: boolean; detail: string };
  };

  let result = $state<Result | null>(null);
  let busy = $state(false);

  async function run() {
    busy = true;
    const response = await fetch("/lab/14/api/capstone", { method: "POST" });
    result = await response.json();
    busy = false;
  }
</script>

<svelte:head><title>Lab 14 | Complete Hunt Capstone</title></svelte:head>

<main class="lab-shell">
  <a class="back" href="/">Labs</a>

  <header class="hero">
    <span>Lab 14</span>
    <h1>Complete Hunt Capstone</h1>
    <p>Run the integrated flow from fan-out detection through graph state, narrative, report, notification, and evals.</p>
    <button onclick={run} disabled={busy}>{busy ? "Running" : "Run Complete Hunt"}</button>
  </header>

  {#if result}
    <section class="panel">
      <h2>Integrated Result</h2>
      <div class="stats">
        <article><strong>{result.findings.length}</strong><span>findings</span></article>
        <article><strong>{result.graph.nodes.length}</strong><span>graph nodes</span></article>
        <article><strong>{result.graph.edges.length}</strong><span>graph edges</span></article>
        <article><strong>{result.evals.filter((row) => row.passed).length}/{result.evals.length}</strong><span>evals passing</span></article>
      </div>
    </section>
    <section class="panel">
      <h2>Narrative</h2>
      <pre>{result.narrative}</pre>
    </section>
    <section class="panel">
      <h2>Report + Notification</h2>
      <p>{result.report.fileName}</p>
      <p class="path">{result.report.path}</p>
      <p>{result.notification.channel} | {result.notification.delivered ? "delivered" : "not delivered"} | {result.notification.detail}</p>
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
  .hero span { color: #bd93f9; text-transform: uppercase; font-weight: 800; }
  h1, h2, p { margin: 0; }
  h1 { color: #f5e663; font-size: clamp(2.5rem, 7vw, 5rem); line-height: .98; }
  h2 { color: #f5e663; margin-bottom: 1rem; }
  p, .path { color: rgba(255,255,255,.62); line-height: 1.55; }
  button { width: fit-content; border: 1px solid rgba(245,230,99,.42); border-radius: 3px; padding: .7rem .95rem; background: rgba(245,230,99,.1); color: #f5e663; font: inherit; font-weight: 800; }
  .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; }
  article { border: 1px solid rgba(255,255,255,.12); border-radius: 4px; padding: .9rem; display: grid; gap: .25rem; }
  article strong { color: #8be9fd; font-size: 2rem; }
  article span { color: rgba(255,255,255,.58); }
  pre { white-space: pre-wrap; color: rgba(255,255,255,.76); }
  @media (max-width: 850px) { .stats { grid-template-columns: 1fr 1fr; } }
</style>
