<script lang="ts">
  import { onMount } from "svelte";

  type EvalRow = { id: string; category: string; description: string; expected: string; passed: boolean; detail: string };

  let evals = $state<EvalRow[]>([]);
  let busy = $state(false);
  let hasRun = $state(false);

  onMount(async () => {
    // Load the check definitions (not-yet-run) so the dashboard lists what will be evaluated.
    const response = await fetch("/lab/13/api/evals");
    const data = await response.json();
    evals = data.evals;
  });

  async function run() {
    busy = true;
    try {
      // POST runs the real investigation, then evaluates its live output.
      const response = await fetch("/lab/13/api/evals", { method: "POST" });
      const data = await response.json();
      evals = data.evals;
      hasRun = true;
    } finally {
      busy = false;
    }
  }

  const passed = $derived(evals.filter((row) => row.passed).length);
</script>

<svelte:head><title>Lab 13 | Eval Harness</title></svelte:head>

<main class="lab-shell">
  <a class="back" href="/">Labs</a>

  <header class="hero">
    <span>Lab 13</span>
    <h1>Eval Harness</h1>
    <p>Deterministic checks graded against a live investigation — so improvement is measured instead of guessed. The checks are fixed (a test oracle should not be probabilistic); the investigation they grade is real model output.</p>
    <button onclick={run} disabled={busy}>{busy ? "Running investigation + evals" : "Run Eval Harness"}</button>
  </header>

  <section class="panel">
    <div class="panel-head">
      <h2>Eval Dashboard</h2>
      <span>{hasRun ? `${passed} / ${evals.length} passing` : "not run"}</span>
    </div>
    <div class="evals">
      {#each evals as row}
        <article class:pass={row.passed}>
          <strong>{row.id} {row.passed ? "PASS" : "FAIL"}</strong>
          <span>{row.category}</span>
          <p>{row.description}</p>
          <small>Expected: {row.expected}</small>
          <small>{row.detail}</small>
        </article>
      {/each}
    </div>
  </section>
</main>

<style>
  :global(body) { background: #07070a; }
  .lab-shell { min-height: 100vh; padding: 2.5rem max(1rem, calc((100vw - 1120px) / 2)); background: linear-gradient(135deg, rgba(189,147,249,.06), transparent 34%), #07070a; color: rgba(255,255,255,.9); font-family: var(--font-heading); }
  .back { display: inline-flex; margin-bottom: 1rem; color: #f5e663; font-size: .75rem; font-weight: 800; text-decoration: none; text-transform: uppercase; }
  .hero, .panel { border: 1px solid rgba(189,147,249,.24); border-radius: 4px; background: rgba(22,22,31,.92); padding: 1.4rem; box-shadow: 0 24px 80px rgba(0,0,0,.32); }
  .hero { display: grid; gap: .8rem; }
  button { width: fit-content; border: 1px solid rgba(245,230,99,.42); border-radius: 3px; padding: .7rem .95rem; background: rgba(245,230,99,.1); color: #f5e663; font: inherit; font-weight: 800; }
  button:disabled { opacity: .58; }
  .panel { margin-top: 1rem; }
  .hero span, .panel-head span { color: #bd93f9; text-transform: uppercase; font-weight: 800; }
  h1, h2, p { margin: 0; }
  h1 { color: #f5e663; font-size: clamp(2.5rem, 7vw, 5rem); line-height: .98; }
  h2 { color: #f5e663; }
  p, small { color: rgba(255,255,255,.62); line-height: 1.55; }
  .panel-head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; margin-bottom: 1rem; }
  .evals { display: grid; gap: .75rem; }
  article { border: 1px solid rgba(255,85,85,.36); border-radius: 4px; padding: .9rem; display: grid; gap: .3rem; background: rgba(255,85,85,.05); }
  article.pass { border-color: rgba(80,250,123,.42); background: rgba(80,250,123,.05); }
  article strong { color: #8be9fd; }
  article span { color: #bd93f9; }
</style>
