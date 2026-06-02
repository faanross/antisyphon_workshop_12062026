<script lang="ts">
  type Finding = {
    id: string;
    candidateId: string;
    skillName: string;
    verdict: string;
    compositeScore: number;
    evidenceSummary: string;
    attackNarrative: string;
    uncertainty: string;
  };

  type ProgressEvent = { stage: string; message: string };

  let result = $state<{ findings: Finding[]; progress: ProgressEvent[] } | null>(null);
  let busy = $state(false);

  async function run() {
    busy = true;
    const response = await fetch("/lab/09/api/orchestrate", { method: "POST" });
    result = await response.json();
    busy = false;
  }
</script>

<svelte:head><title>Lab 09 | Fan-Out / Fan-In</title></svelte:head>

<main class="lab-shell">
  <a class="back" href="/">Labs</a>

  <header class="hero">
    <span>Lab 09</span>
    <h1>Fan-Out / Fan-In Orchestration</h1>
    <p>Run independent detection jobs, collect structured findings, and inspect the orchestration trace before adding shared graph state.</p>
    <button onclick={run} disabled={busy}>{busy ? "Running" : "Run Orchestration"}</button>
  </header>

  {#if result}
    <section class="panel">
      <div class="panel-head">
        <h2>Orchestration Trace</h2>
        <span>{result.progress.length} events</span>
      </div>
      <ol class="trace">
        {#each result.progress as event}
          <li>
            <strong>{event.stage}</strong>
            <p>{event.message}</p>
          </li>
        {/each}
      </ol>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>Fan-In Findings</h2>
        <span>{result.findings.length} findings</span>
      </div>
      <div class="findings">
        {#each result.findings as finding}
          <article>
            <div>
              <strong>{finding.candidateId}</strong>
              <span>{finding.skillName}</span>
            </div>
            <p>{finding.evidenceSummary}</p>
            <small>{finding.verdict} | score {finding.compositeScore.toFixed(2)}</small>
          </article>
        {/each}
      </div>
    </section>
  {:else}
    <section class="panel">
      <h2>What this lab isolates</h2>
      <p>The graph and narrative stages are intentionally absent here. This route shows dispatch, independent worker output, and fan-in collection.</p>
    </section>
  {/if}
</main>

<style>
  :global(body) { background: #07070a; }
  .lab-shell {
    min-height: 100vh;
    padding: 2.5rem max(1rem, calc((100vw - 1120px) / 2));
    background:
      linear-gradient(135deg, rgba(189, 147, 249, 0.06), transparent 34%),
      #07070a;
    color: rgba(255, 255, 255, 0.9);
    font-family: var(--font-heading);
  }
  .back {
    display: inline-flex;
    margin-bottom: 1rem;
    color: #f5e663;
    font-size: .75rem;
    font-weight: 800;
    text-decoration: none;
    text-transform: uppercase;
  }
  .hero, .panel {
    border: 1px solid rgba(189, 147, 249, 0.24);
    border-radius: 4px;
    background: rgba(22, 22, 31, 0.92);
    padding: 1.4rem;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
  }
  .hero { display: grid; gap: .8rem; margin-bottom: 1rem; }
  .hero span, .panel-head span { color: #bd93f9; text-transform: uppercase; font-weight: 800; }
  h1, h2, p { margin: 0; }
  h1 { color: #f5e663; font-size: clamp(2.5rem, 7vw, 5rem); line-height: .98; }
  h2 { color: #f5e663; }
  p, small { color: rgba(255, 255, 255, 0.62); line-height: 1.55; }
  button {
    width: fit-content;
    border: 1px solid rgba(245, 230, 99, 0.42);
    border-radius: 3px;
    padding: .7rem .95rem;
    background: rgba(245, 230, 99, 0.1);
    color: #f5e663;
    font: inherit;
    font-weight: 800;
  }
  button:disabled { opacity: .58; }
  .panel { margin-top: 1rem; }
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
  .trace, .findings { display: grid; gap: .75rem; margin: 0; padding: 0; }
  .trace { list-style: none; }
  .trace li, article {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    padding: .9rem;
    background: rgba(255, 255, 255, 0.025);
  }
  .trace strong, article strong { color: #8be9fd; }
  article { display: grid; gap: .45rem; }
  article div { display: flex; justify-content: space-between; gap: 1rem; }
  article span { color: rgba(255, 255, 255, 0.54); }
</style>
