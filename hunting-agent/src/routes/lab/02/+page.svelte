<script lang="ts">
  import PipelineStepper from "$lib/components/lab02/PipelineStepper.svelte";
  import StepControls from "$lib/components/lab02/StepControls.svelte";
  import RawWallPanel from "$lib/components/lab02/RawWallPanel.svelte";
  import HousekeepingPanel from "$lib/components/lab02/HousekeepingPanel.svelte";
  import EventEnrichmentPanel from "$lib/components/lab02/EventEnrichmentPanel.svelte";
  import RarityPanel from "$lib/components/lab02/RarityPanel.svelte";
  import ProcessCorrelationPanel from "$lib/components/lab02/ProcessCorrelationPanel.svelte";
  import ScoringBreakdownPanel from "$lib/components/lab02/ScoringBreakdownPanel.svelte";
  import GraphsPanel from "$lib/components/lab02/GraphsPanel.svelte";
  import EnrichmentPanel from "$lib/components/lab02/EnrichmentPanel.svelte";
  import CandidateCardPanel from "$lib/components/lab02/CandidateCardPanel.svelte";

  import { connectionPairs } from "$lib/data/lab02/connection-pairs";
  import { PIPELINE_STEPS, FINAL_STEP, EVENT_COUNT, CANDIDATE_COUNT } from "$lib/data/lab02/steps";

  // This lab follows a single candidate end to end: the C2 beacon, BEA-001.
  const pair = connectionPairs["c2-beacon"];
  const heroLabel = "BEA-001";

  let currentStep = $state(0);
  // Step 2 sub-view (Correlation vs Event Enrichment) and Step 5 sub-view (Enrichment vs Candidate).
  let corrView = $state<"correlation" | "enrichment">("correlation");
  let finalView = $state<"main" | "candidate">("main");

  let candidateBorn = $derived(currentStep >= 3);
  let nf = new Intl.NumberFormat("en-US");

  function resetSub() {
    corrView = "correlation";
    finalView = "main";
  }
  function next() {
    if (currentStep < FINAL_STEP) currentStep += 1;
    resetSub();
  }
  function back() {
    if (currentStep > 0) currentStep -= 1;
    resetSub();
  }
  function replay() {
    currentStep = 0;
    resetSub();
  }
  function goTo(step: number) {
    currentStep = step;
    resetSub();
  }
  function onKey(event: KeyboardEvent) {
    if (event.key === "ArrowRight") next();
    else if (event.key === "ArrowLeft") back();
  }
</script>

<svelte:head><title>Lab 02 | Distillation Pipeline</title></svelte:head>
<svelte:window onkeydown={onKey} />

<main>
  <header>
    <span class="eyebrow">Lab 02</span>
    <h1>Distillation Pipeline Walkthrough</h1>
  </header>

  <PipelineStepper steps={PIPELINE_STEPS} {currentStep} onSelect={goTo} />

  <div class="barrow">
    <div class="tabslot">
      {#if currentStep === 2}
        <div class="viewtabs" role="tablist" aria-label="Stage 2 views">
          <button type="button" role="tab" class:active={corrView === "correlation"} aria-selected={corrView === "correlation"} onclick={() => (corrView = "correlation")}>Correlation</button>
          <button type="button" role="tab" class:active={corrView === "enrichment"} aria-selected={corrView === "enrichment"} onclick={() => (corrView = "enrichment")}>Event Enrichment</button>
        </div>
      {:else if currentStep === FINAL_STEP}
        <div class="viewtabs" role="tablist" aria-label="Final views">
          <button type="button" role="tab" class:active={finalView === "main"} aria-selected={finalView === "main"} onclick={() => (finalView = "main")}>Enrichment</button>
          <button type="button" role="tab" class:active={finalView === "candidate"} aria-selected={finalView === "candidate"} onclick={() => (finalView = "candidate")}>Candidate</button>
        </div>
      {/if}
    </div>

    <div class="funnel" aria-label="Distillation scale">
      <strong>{nf.format(EVENT_COUNT)}</strong><span>events</span>
      <span class="sep">→</span>
      <strong class:dim={!candidateBorn}>{candidateBorn ? CANDIDATE_COUNT : "—"}</strong><span>candidates</span>
      <span class="sep">→</span>
      <strong class="hero" class:dim={!candidateBorn}>1</strong><span>{heroLabel}</span>
    </div>
  </div>

  <section class="panel-area">
    {#if currentStep === 0}
      <RawWallPanel {pair} />
    {:else if currentStep === 1}
      <HousekeepingPanel {pair} />
    {:else if currentStep === 2}
      {#if corrView === "correlation"}
        <ProcessCorrelationPanel {pair} />
      {:else}
        <EventEnrichmentPanel {pair} />
      {/if}
    {:else if currentStep === 3}
      <div class="stack">
        <ScoringBreakdownPanel {pair} />
        <GraphsPanel {pair} />
      </div>
    {:else if currentStep === 4}
      <RarityPanel {pair} />
    {:else if finalView === "candidate"}
      <CandidateCardPanel {pair} />
    {:else}
      <EnrichmentPanel {pair} />
    {/if}
  </section>

  <StepControls
    {currentStep}
    onBack={back}
    onNext={next}
    onReplay={replay}
  />
</main>

<style>
  main {
    width: min(1320px, calc(100% - 2rem));
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
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.32);
    backdrop-filter: blur(10px);
  }
  .eyebrow {
    display: block;
    margin-bottom: 0.45rem;
    color: var(--brand-purple-light);
    font-family: var(--font-heading);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font-size: 2.25rem;
    line-height: 1.05;
    color: var(--brand-yellow);
  }

  .barrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    min-height: 2.4rem;
  }
  .tabslot {
    min-height: 2.4rem;
  }

  .viewtabs {
    display: flex;
    gap: 0.5rem;
  }
  .viewtabs button {
    min-height: 2.4rem;
    padding: 0.45rem 1.3rem;
    border: 1px solid rgba(189, 147, 249, 0.24);
    border-radius: 7px;
    background: rgba(28, 29, 39, 0.82);
    color: var(--brand-muted);
    font-family: var(--font-heading);
    font-size: 0.9rem;
    font-weight: 800;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
  }
  .viewtabs button:hover {
    border-color: rgba(245, 230, 99, 0.45);
  }
  .viewtabs button.active {
    border-color: rgba(245, 230, 99, 0.72);
    background: rgba(245, 230, 99, 0.1);
    color: var(--brand-yellow);
    box-shadow: inset 0 -2px 0 var(--brand-yellow);
  }

  .funnel {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    margin-left: auto;
    font-family: var(--font-heading);
    font-size: 0.82rem;
    color: var(--brand-muted);
  }
  .funnel strong {
    color: var(--brand-yellow);
    font-size: 1.15rem;
  }
  .funnel strong.hero {
    color: var(--dracula-green);
  }
  .funnel strong.dim {
    color: var(--brand-muted);
    opacity: 0.5;
  }
  .funnel .sep {
    margin: 0 0.3rem;
    color: var(--brand-purple);
  }

  .panel-area {
    min-width: 0;
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
