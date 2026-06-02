<script lang="ts">
  import type { PipelineStep } from "$lib/data/lab02/steps";

  let {
    steps,
    currentStep,
    onSelect,
  }: { steps: PipelineStep[]; currentStep: number; onSelect: (step: number) => void } = $props();

  type Card = { index: number; label: string };
  // Step 0 (Raw Telemetry) plus the five processing steps.
  let cards = $derived<Card[]>([
    { index: 0, label: "Raw Telemetry" },
    ...steps.map((s) => ({ index: s.index, label: s.label })),
  ]);

  function state(i: number): "done" | "current" | "todo" {
    if (currentStep > i) return "done";
    if (currentStep === i) return "current";
    return "todo";
  }
</script>

<nav class="stepper" aria-label="Pipeline steps">
  {#each cards as card (card.index)}
    <button
      type="button"
      class="card {state(card.index)}"
      onclick={() => onSelect(card.index)}
      aria-current={currentStep === card.index}
    >
      <span class="num">{card.index}</span>
      <span class="label">{card.label}</span>
    </button>
  {/each}
</nav>

<style>
  .stepper {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.7rem;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-height: 6.5rem;
    padding: 0.95rem 1rem;
    border: 1px solid rgba(189, 147, 249, 0.25);
    border-radius: 9px;
    background: rgba(28, 29, 39, 0.78);
    color: var(--brand-muted);
    text-align: left;
    font: inherit;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
  }
  .card:hover {
    border-color: rgba(245, 230, 99, 0.45);
    background: rgba(245, 230, 99, 0.05);
  }

  .num {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: rgba(189, 147, 249, 0.18);
    color: var(--brand-purple-light);
    font-family: var(--font-heading);
    font-size: 1rem;
    font-weight: 800;
  }

  .label {
    font-family: var(--font-heading);
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .card.done {
    border-color: rgba(80, 250, 123, 0.45);
    color: var(--dracula-green);
  }
  .card.done .num {
    background: rgba(80, 250, 123, 0.18);
    color: var(--dracula-green);
  }

  .card.current {
    border-color: rgba(245, 230, 99, 0.82);
    color: var(--brand-yellow);
    background: rgba(245, 230, 99, 0.09);
    box-shadow: inset 0 0 0 1px rgba(245, 230, 99, 0.22);
  }
  .card.current .num {
    background: rgba(245, 230, 99, 0.22);
    color: var(--brand-yellow);
  }

  @media (max-width: 1000px) {
    .stepper {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  @media (max-width: 560px) {
    .stepper {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
