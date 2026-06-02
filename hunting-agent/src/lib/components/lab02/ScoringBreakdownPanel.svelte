<script lang="ts">
  import type { ConnectionPair } from "$lib/data/lab02/types";

  type InfoContent = {
    title: string;
    body: string;
    details: string[];
  };

  type Dimension = {
    key: string;
    label: string;
    value: number;
    display: string;
    weight: number;
    contribution: number;
    explanation: string;
    info: InfoContent;
  };

  let { pair }: { pair: ConnectionPair } = $props();

  let activeInfo = $state<InfoContent | null>(null);
  let score = $derived(pair.candidate.beacon_score);
  let dimensions: Dimension[] = $derived([
    {
      key: "regularity",
      label: "Interval Regularity",
      value: pair.scoring.regularity,
      display: pair.scoring.regularity.toFixed(3),
      weight: pair.weights.regularity,
      contribution: pair.scoring.regularity * pair.weights.regularity,
      explanation: `Median interval ${pair.scoring.median_interval.toFixed(1)}s with MAD ${pair.scoring.mad_interval.toFixed(2)}s.`,
      info: {
        title: "Interval Regularity",
        body: "Measures whether connections arrive on a stable cadence. Beaconing tends to produce low jitter around a repeated sleep interval.",
        details: [
          "Uses median interval and median absolute deviation rather than simple average.",
          "High regularity is suspicious only when the rest of the entity context also supports it.",
        ],
      },
    },
    {
      key: "orig_byte_consistency",
      label: "Outbound Byte Consistency",
      value: pair.scoring.orig_byte_consistency,
      display: pair.scoring.orig_byte_consistency.toFixed(3),
      weight: pair.weights.orig_byte_consistency,
      contribution: pair.scoring.orig_byte_consistency * pair.weights.orig_byte_consistency,
      explanation: `Median outbound size ${pair.scoring.median_orig_bytes.toFixed(0)} bytes with MAD ${pair.scoring.mad_orig_bytes.toFixed(1)}.`,
      info: {
        title: "Outbound Byte Consistency",
        body: "Checks whether the client sends similarly sized requests each cycle. Fixed-size encrypted check-ins often look more regular than human browsing.",
        details: [
          "Useful for separating automated heartbeat traffic from interactive web activity.",
          "Benign agents can also be consistent, so enrichment and attribution matter.",
        ],
      },
    },
    {
      key: "resp_byte_consistency",
      label: "Inbound Byte Consistency",
      value: pair.scoring.resp_byte_consistency,
      display: pair.scoring.resp_byte_consistency.toFixed(3),
      weight: pair.weights.resp_byte_consistency,
      contribution: pair.scoring.resp_byte_consistency * pair.weights.resp_byte_consistency,
      explanation: `Median inbound size ${pair.scoring.median_resp_bytes.toFixed(0)} bytes with MAD ${pair.scoring.mad_resp_bytes.toFixed(1)}.`,
      info: {
        title: "Inbound Byte Consistency",
        body: "Checks whether the server sends a stable response size. Idle C2 polling often returns similarly sized encrypted payloads.",
        details: [
          "Repeated response size strengthens the beacon hypothesis.",
          "It does not identify maliciousness by itself.",
        ],
      },
    },
    {
      key: "duration_consistency",
      label: "Duration Consistency",
      value: pair.scoring.duration_consistency,
      display: pair.scoring.duration_consistency.toFixed(3),
      weight: pair.weights.duration_consistency,
      contribution: pair.scoring.duration_consistency * pair.weights.duration_consistency,
      explanation: "Stable connection durations support the idea that the same automated exchange repeats.",
      info: {
        title: "Duration Consistency",
        body: "Looks for repeated short-lived connection durations. Automated polling often has tighter duration distributions than browser traffic.",
        details: [
          "Short, stable duration is supporting evidence.",
          "Duration should be interpreted together with bytes and timing.",
        ],
      },
    },
    {
      key: "histogram_score",
      label: "Hourly Concentration",
      value: pair.scoring.histogram_score,
      display: pair.scoring.histogram_score.toFixed(3),
      weight: pair.weights.histogram_score,
      contribution: pair.scoring.histogram_score * pair.weights.histogram_score,
      explanation: "Checks whether activity clusters into a coherent hourly pattern instead of random browsing.",
      info: {
        title: "Hourly Concentration",
        body: "Measures whether the activity forms a recognizable schedule over the day. This can expose automated tasks, but it can also match benign enterprise software.",
        details: [
          "Strong hourly concentration is a clue, not a verdict.",
          "Business-hours concentration can reduce severity for some cases.",
        ],
      },
    },
    {
      key: "consecutive_hours",
      label: "Consecutive Active Hours",
      value: Math.min(1, pair.scoring.consecutive_hours / 24),
      display: `${pair.scoring.consecutive_hours}h`,
      weight: pair.weights.consecutive_hours,
      contribution: Math.min(1, pair.scoring.consecutive_hours / 24) * pair.weights.consecutive_hours,
      explanation: "Longer uninterrupted runs increase confidence that this is automation rather than a brief user action.",
      info: {
        title: "Consecutive Active Hours",
        body: "Counts how long the pattern persists without meaningful interruption. Long-lived regularity is more interesting than a short burst.",
        details: [
          "EDR and SaaS agents can also run for many hours.",
          "This dimension is why process attribution and LOTS context are required.",
        ],
      },
    },
  ]);

  let contributionTotal = $derived(dimensions.reduce((sum, item) => sum + item.contribution, 0));

  function pct(value: number): string {
    return `${Math.max(2, Math.min(100, value * 100)).toFixed(0)}%`;
  }

  function contributionPct(value: number): string {
    if (contributionTotal <= 0) return "0%";
    return `${Math.max(2, (value / contributionTotal) * 100).toFixed(2)}%`;
  }

  function closeDrawer() {
    activeInfo = null;
  }
</script>

<section class="panel">
  <div class="score-header">
    <div>
      <h2>Scoring Breakdown</h2>
      <p>How telemetry dimensions combine into the beacon candidate score.</p>
    </div>
    <div class="final-score" aria-label="Final beacon score">
      <strong>{Math.round(score * 100)}</strong>
      <span>beacon score</span>
    </div>
  </div>

  <div class="formula">
    <span>composition</span>
    <code>weighted dimensions -> composite score {pair.scoring.composite_score.toFixed(3)} -> beacon score {score.toFixed(2)}</code>
  </div>

  <div class="waterfall" aria-label="Score composition">
    {#each dimensions as dimension}
      <button
        type="button"
        class="seg"
        style:width={contributionPct(dimension.contribution)}
        title={`${dimension.label} — ${dimension.info.body}`}
        aria-label={`${dimension.label}: contributes ${dimension.contribution.toFixed(3)} to the score`}
        onclick={() => activeInfo = dimension.info}
      ></button>
    {/each}
  </div>
  <p class="waterfall-hint">Each segment is one dimension's weighted contribution to the score. Hover or click a segment to see what it measures.</p>

  <div class="rows">
    {#each dimensions as dimension}
      <article>
        <div class="metric-label">
          <div>
            <strong>{dimension.label}</strong>
            <small>{dimension.explanation}</small>
          </div>
          <button
            class="info-button"
            type="button"
            aria-label={`More about ${dimension.label}`}
            onclick={() => activeInfo = dimension.info}
          >i</button>
        </div>

        <div class="metric-body">
          <div class="bar">
            <i style={`width: ${pct(dimension.value)}`}></i>
            <span>{dimension.display}</span>
          </div>
          <code>x {dimension.weight.toFixed(2)}</code>
          <code>= {dimension.contribution.toFixed(3)}</code>
        </div>
      </article>
    {/each}
  </div>
</section>

{#if activeInfo}
  <button class="drawer-backdrop" type="button" aria-label="Close information drawer" onclick={closeDrawer}></button>
  <div class="info-drawer" role="dialog" aria-modal="true" aria-labelledby="scoring-info-title">
    <button class="close" type="button" onclick={closeDrawer}>Close</button>
    <span>Scoring dimension</span>
    <h3 id="scoring-info-title">{activeInfo.title}</h3>
    <p>{activeInfo.body}</p>
    <ul>
      {#each activeInfo.details as detail}
        <li>{detail}</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .panel {
    border: 1px solid rgba(189, 147, 249, 0.24);
    border-radius: 8px;
    padding: 1rem;
    background: rgba(22, 22, 31, 0.9);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.24);
  }

  .score-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  h2 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--brand-yellow);
  }

  p {
    margin: .35rem 0 0;
    color: var(--dracula-muted);
  }

  .final-score {
    display: grid;
    gap: .2rem;
    justify-items: end;
    min-width: 8rem;
  }

  .final-score strong {
    color: var(--brand-yellow);
    font-family: var(--font-heading);
    font-size: 2.35rem;
    line-height: 1;
  }

  .final-score span,
  .formula span {
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .72rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .formula {
    display: grid;
    gap: .35rem;
    margin-bottom: .9rem;
    padding: .75rem;
    border: 1px solid rgba(189, 147, 249, 0.18);
    border-radius: 8px;
    background: rgba(7, 7, 10, 0.34);
  }

  code {
    color: var(--dracula-muted);
    font-family: var(--font-heading);
    font-size: .8rem;
    overflow-wrap: anywhere;
  }

  .waterfall {
    display: flex;
    height: 1.55rem;
    overflow: hidden;
    margin-bottom: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.045);
  }

  .waterfall .seg {
    min-width: 2%;
    height: 100%;
    padding: 0;
    border: 0;
    border-right: 1px solid rgba(7, 7, 10, 0.5);
    background: var(--brand-yellow);
    opacity: .82;
    cursor: pointer;
    transition: opacity .15s ease;
  }

  .waterfall .seg:hover {
    opacity: 1;
  }

  .waterfall .seg:nth-child(even) {
    background: var(--brand-purple);
  }

  .waterfall-hint {
    margin: -.4rem 0 1rem;
    color: var(--dracula-comment);
    font-size: .82rem;
  }

  .rows {
    display: grid;
    gap: .75rem;
  }

  article {
    display: grid;
    gap: .7rem;
    padding: .85rem;
    border: 1px solid rgba(189, 147, 249, 0.16);
    border-radius: 8px;
    background: rgba(28, 29, 39, 0.7);
  }

  .metric-label,
  .metric-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: .75rem;
    align-items: center;
  }

  .metric-label {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .metric-label strong {
    color: var(--dracula-fg);
    font-size: .98rem;
  }

  .metric-label small {
    display: block;
    margin-top: .24rem;
    color: var(--dracula-muted);
    line-height: 1.45;
  }

  .info-button {
    width: 1.65rem;
    height: 1.65rem;
    padding: 0;
    border-radius: 999px;
    color: var(--brand-yellow);
    font-family: var(--font-heading);
    font-weight: 800;
  }

  .bar {
    position: relative;
    min-height: 1.45rem;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.09);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.045);
  }

  .bar i {
    display: block;
    height: 100%;
    border-right: 2px solid rgba(189, 147, 249, 0.95);
    background: linear-gradient(90deg, rgba(245, 230, 99, 0.92), rgba(245, 230, 99, 0.72));
    box-shadow: 0 0 18px rgba(245, 230, 99, 0.16);
  }

  .bar span {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--brand-text);
    font-family: var(--font-heading);
    font-size: .72rem;
    font-weight: 800;
  }

  .drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    border: 0;
    border-radius: 0;
    background: rgba(7, 7, 10, 0.58);
  }

  .info-drawer {
    position: fixed;
    z-index: 41;
    top: 0;
    right: 0;
    width: min(26rem, calc(100vw - 2rem));
    height: 100vh;
    padding: 1.25rem;
    border-left: 1px solid rgba(189, 147, 249, 0.34);
    background: rgba(22, 22, 31, 0.98);
    box-shadow: -24px 0 70px rgba(0, 0, 0, 0.42);
  }

  .info-drawer .close {
    float: right;
    padding: .4rem .65rem;
  }

  .info-drawer span {
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .72rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .info-drawer h3 {
    clear: both;
    margin: 1.25rem 0 .65rem;
    color: var(--brand-yellow);
    font-size: 1.25rem;
  }

  .info-drawer ul {
    display: grid;
    gap: .6rem;
    padding-left: 1.1rem;
    color: var(--dracula-muted);
  }

  @media (max-width: 760px) {
    .score-header,
    .metric-body {
      grid-template-columns: 1fr;
    }

    .score-header {
      display: grid;
    }

    .final-score {
      justify-items: start;
    }
  }
</style>
