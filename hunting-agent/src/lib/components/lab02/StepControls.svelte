<script lang="ts">
  import { FINAL_STEP, RAW_CAPTION, PIPELINE_STEPS } from "$lib/data/lab02/steps";

  let {
    currentStep,
    onBack,
    onNext,
    onReplay,
  }: {
    currentStep: number;
    onBack: () => void;
    onNext: () => void;
    onReplay: () => void;
  } = $props();

  let atStart = $derived(currentStep === 0);
  let atEnd = $derived(currentStep === FINAL_STEP);
  let caption = $derived(
    currentStep === 0 ? RAW_CAPTION : PIPELINE_STEPS[currentStep - 1].caption,
  );
</script>

<div class="controls">
  <div class="buttons">
    <button type="button" onclick={onBack} disabled={atStart}>← Back</button>
    <button type="button" class="primary" onclick={onNext} disabled={atEnd}>Next →</button>
    <button type="button" class="ghost" onclick={onReplay}>↺ Replay</button>
  </div>
  <p class="caption">{caption}</p>
</div>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.75rem 0.85rem;
    border: 1px solid rgba(189, 147, 249, 0.22);
    border-radius: 8px;
    background: rgba(19, 19, 26, 0.85);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  button {
    min-height: 2.2rem;
    padding: 0.4rem 0.9rem;
    border: 1px solid rgba(189, 147, 249, 0.32);
    border-radius: 6px;
    background: rgba(28, 29, 39, 0.85);
    color: var(--brand-text);
    font-family: var(--font-heading);
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease, opacity 0.2s ease;
  }
  button:hover:not(:disabled) {
    border-color: rgba(245, 230, 99, 0.5);
    background: rgba(245, 230, 99, 0.06);
  }
  button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  button.primary {
    border-color: rgba(245, 230, 99, 0.72);
    color: var(--brand-yellow);
  }
  button.ghost {
    color: var(--brand-muted);
    font-weight: 600;
  }

  .caption {
    margin: 0;
    color: var(--brand-muted);
    font-size: 0.86rem;
    line-height: 1.45;
  }
  .caption :global(strong) {
    color: var(--brand-text);
  }
</style>
