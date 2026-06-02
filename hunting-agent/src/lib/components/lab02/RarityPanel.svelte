<script lang="ts">
  import type { ConnectionPair } from "$lib/data/lab02/types";
  import { POPULATION_HOST_COUNT } from "$lib/data/lab02/steps";

  let { pair }: { pair: ConnectionPair } = $props();

  let rarity = $derived(pair.candidate.enrichment.destination_rarity);
  // hosts = (1 − rarity) × population, floored at 1 (the candidate's own host always counts).
  let hostCount = $derived(
    Math.max(1, Math.round((1 - rarity) * POPULATION_HOST_COUNT)),
  );
  let dots = $derived(Array.from({ length: POPULATION_HOST_COUNT }, (_, i) => i));
  let isRare = $derived(rarity >= 0.5);
</script>

<div class="panel">
  <h3>Least Frequency Analysis</h3>
  <p class="intro">How many hosts across the fleet ever talked to this destination? The fewer, the rarer — and the more interesting. Rarity is computed once across the whole population, then stamped onto the candidate.</p>

  <div class="fleet" class:rare={isRare} aria-label="fleet prevalence">
    {#each dots as i}<span class="hd" class:lit={i < hostCount}></span>{/each}
  </div>

  <p class="fleetcap">
    <strong>{hostCount}</strong> of {POPULATION_HOST_COUNT} hosts ever contacted this destination —
    {#if isRare}<span class="rare-txt">rare, worth a look.</span>{:else}<span class="common-txt">common, seen across the fleet.</span>{/if}
  </p>

  <div class="meter">
    <span class="ml">destination_rarity</span>
    <span class="mtrack"><span class="mfill" style="width:{rarity * 100}%"></span></span>
    <span class="mv">{rarity.toFixed(2)}</span>
  </div>
  <p class="note">Rarity runs from 0 (every host talks to it) to 1 (almost no host does). Higher = rarer = fewer hosts.</p>
</div>

<style>
  .panel {
    padding: 1.4rem 1.5rem;
    border: 1px solid rgba(189, 147, 249, 0.25);
    border-radius: 8px;
    background: rgba(22, 22, 31, 0.78);
  }
  h3 {
    margin: 0 0 0.5rem;
    color: var(--dracula-green);
    font-family: var(--font-heading);
    font-size: 1.3rem;
  }
  .intro {
    margin: 0 0 1.4rem;
    max-width: 75ch;
    color: var(--brand-muted);
    font-size: 1rem;
    line-height: 1.55;
  }
  .fleet {
    display: grid;
    grid-template-columns: repeat(25, 1fr);
    gap: 4px;
    margin-bottom: 0.9rem;
  }
  .hd {
    aspect-ratio: 1;
    border-radius: 2px;
    background: rgba(189, 147, 249, 0.16);
  }
  /* common destinations: lit dots are neutral (many hosts, boring) */
  .hd.lit {
    background: var(--brand-purple-light);
  }
  /* rare destinations: the few lit dots are notable */
  .fleet.rare .hd.lit {
    background: var(--dracula-red);
    box-shadow: 0 0 8px var(--dracula-red);
  }
  .fleetcap {
    margin: 0 0 1.4rem;
    color: var(--brand-text);
    font-size: 1.1rem;
  }
  .fleetcap strong {
    color: var(--brand-yellow);
  }
  .rare-txt {
    color: var(--dracula-red);
  }
  .common-txt {
    color: var(--brand-muted);
  }
  .meter {
    display: grid;
    grid-template-columns: 12rem 1fr auto;
    gap: 0.8rem;
    align-items: center;
    font-family: var(--font-heading);
    font-size: 1.05rem;
  }
  .ml {
    color: var(--brand-purple-light);
  }
  .mtrack {
    height: 1rem;
    border-radius: 5px;
    background: rgba(189, 147, 249, 0.12);
    overflow: hidden;
  }
  .mfill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--brand-yellow), var(--dracula-red));
    transition: width 0.5s ease;
  }
  .mv {
    color: var(--brand-yellow);
    font-size: 1.2rem;
  }
  .note {
    margin: 0.9rem 0 0;
    color: var(--dracula-comment);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  @media (prefers-reduced-motion: reduce) {
    .mfill {
      transition: none;
    }
  }
</style>
