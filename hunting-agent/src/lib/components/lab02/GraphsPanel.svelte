<script lang="ts">
  import type { ConnectionPair } from "$lib/data/lab02/types";

  let { pair }: { pair: ConnectionPair } = $props();

  const intervalWidth = 720;
  const intervalHeight = 320;
  const hourlyWidth = 720;
  const hourlyHeight = 280;
  const margin = { top: 30, right: 32, bottom: 46, left: 54 };
  const intervalInnerW = intervalWidth - margin.left - margin.right;
  const intervalInnerH = intervalHeight - margin.top - margin.bottom;
  const hourlyInnerW = hourlyWidth - margin.left - margin.right;
  const hourlyInnerH = hourlyHeight - margin.top - margin.bottom;
  const hourlyBarGap = 4;

  type Bin = {
    x0: number;
    x1: number;
    count: number;
  };

  let intervals = $derived(pair.intervals.filter((value) => Number.isFinite(value) && value > 0));
  let intervalBins = $derived(buildBins(intervals));
  let maxIntervalCount = $derived(Math.max(1, ...intervalBins.map((bin) => bin.count)));
  let intervalDomain = $derived(domainFromBins(intervalBins));
  let hourlyMax = $derived(Math.max(1, ...pair.hourly_histogram));
  let hourlyScaleMax = $derived(niceCeiling(hourlyMax));
  let averageHourly = $derived(pair.hourly_histogram.reduce((sum, value) => sum + value, 0) / pair.hourly_histogram.length);
  let hourlyBarW = $derived((hourlyInnerW - (pair.hourly_histogram.length - 1) * hourlyBarGap) / pair.hourly_histogram.length);

  function buildBins(values: readonly number[]): Bin[] {
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    const count = Math.min(36, Math.max(8, Math.ceil(span <= 30 ? span : Math.sqrt(values.length) * 2)));
    const width = span / count;
    const bins = Array.from({ length: count }, (_, index) => ({
      x0: min + index * width,
      x1: min + (index + 1) * width,
      count: 0,
    }));

    for (const value of values) {
      const rawIndex = Math.floor((value - min) / width);
      const index = Math.max(0, Math.min(bins.length - 1, rawIndex));
      bins[index].count += 1;
    }

    return bins;
  }

  function domainFromBins(bins: readonly Bin[]): [number, number] {
    if (bins.length === 0) return [0, 1];
    return [bins[0].x0, bins[bins.length - 1].x1];
  }

  function scaleX(value: number, domain: [number, number], width: number): number {
    const [min, max] = domain;
    if (max <= min) return 0;
    return ((value - min) / (max - min)) * width;
  }

  function scaleY(value: number, max: number, height: number): number {
    return height - (value / Math.max(1, max)) * height;
  }

  function niceCeiling(value: number): number {
    if (value <= 10) return Math.ceil(value);
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    const nice = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return nice * magnitude;
  }

  function formatSeconds(value: number): string {
    return `${value.toFixed(value >= 100 ? 0 : 1)}s`;
  }

  function hourColor(hour: number): string {
    if (hour >= 8 && hour < 18) return "rgba(245, 230, 99, 0.78)";
    return "rgba(189, 147, 249, 0.72)";
  }
</script>

<section class="panel">
  <div class="header">
    <h2>Graphs</h2>
    <p>Production candidate review focuses on timing distribution and hourly density before treating a score as meaningful.</p>
  </div>

  <article class="chart-card">
    <h3>Connection Interval Distribution</h3>
    {#if intervalBins.length === 0}
      <div class="empty">Not enough intervals to render the distribution.</div>
    {:else}
      <div class="svg-wrap">
        <svg viewBox={`0 0 ${intervalWidth} ${intervalHeight}`} role="img" aria-label="Connection interval distribution">
          <g transform={`translate(${margin.left},${margin.top})`}>
            {#if pair.candidate.median_interval_seconds >= intervalDomain[0] && pair.candidate.median_interval_seconds <= intervalDomain[1]}
              {@const medianX = scaleX(pair.candidate.median_interval_seconds, intervalDomain, intervalInnerW)}
              <line x1={medianX} y1="0" x2={medianX} y2={intervalInnerH} stroke="rgba(245, 230, 99, 0.76)" stroke-width="1.6" stroke-dasharray="4 4" />
              <text x={medianX + 6} y="13" fill="rgba(245, 230, 99, 0.9)" font-size="11" font-family="JetBrains Mono, monospace">
                median {formatSeconds(pair.candidate.median_interval_seconds)}
              </text>
            {/if}

            {#each intervalBins as bin}
              {@const x0 = scaleX(bin.x0, intervalDomain, intervalInnerW)}
              {@const x1 = scaleX(bin.x1, intervalDomain, intervalInnerW)}
              {@const barWidth = Math.max(2, (x1 - x0) * 0.72)}
              {@const barX = x0 + ((x1 - x0) - barWidth) / 2}
              {@const y = scaleY(bin.count, maxIntervalCount * 1.15, intervalInnerH)}
              <rect
                x={barX}
                y={y}
                width={barWidth}
                height={Math.max(1, intervalInnerH - y)}
                rx="2"
                fill="rgba(189, 147, 249, 0.76)"
              >
                <title>{formatSeconds(bin.x0)} to {formatSeconds(bin.x1)}: {bin.count} intervals</title>
              </rect>
            {/each}

            <line x1="0" y1={intervalInnerH} x2={intervalInnerW} y2={intervalInnerH} stroke="rgba(255,255,255,0.18)" />
            {#each [0, .25, .5, .75, 1] as tick}
              {@const value = intervalDomain[0] + (intervalDomain[1] - intervalDomain[0]) * tick}
              {@const x = scaleX(value, intervalDomain, intervalInnerW)}
              <g transform={`translate(${x},${intervalInnerH})`}>
                <line y1="0" y2="5" stroke="rgba(255,255,255,0.2)" />
                <text y="20" text-anchor="middle" fill="rgba(255,255,255,0.48)" font-size="11" font-family="JetBrains Mono, monospace">
                  {formatSeconds(value)}
                </text>
              </g>
            {/each}

            {#each [0, .25, .5, .75, 1] as tick}
              {@const value = Math.round(maxIntervalCount * tick)}
              {@const y = scaleY(value, maxIntervalCount, intervalInnerH)}
              <g transform={`translate(0,${y})`}>
                <line x1="-4" x2="0" stroke="rgba(255,255,255,0.2)" />
                <text x="-8" dy=".35em" text-anchor="end" fill="rgba(255,255,255,0.48)" font-size="11" font-family="JetBrains Mono, monospace">
                  {value}
                </text>
              </g>
            {/each}
          </g>
        </svg>
      </div>
      <p class="caption">Tight clustering around one interval is a stronger beacon signal than a long sequence of raw bars.</p>
    {/if}
  </article>

  <article class="chart-card">
    <div class="chart-title-row">
      <h3>Hourly Connection Density</h3>
      <span>peak {hourlyMax}/hr · mean {averageHourly.toFixed(1)}/hr</span>
    </div>
    <div class="svg-wrap">
      <svg viewBox={`0 0 ${hourlyWidth} ${hourlyHeight}`} role="img" aria-label="Hourly connection density">
        <g transform={`translate(${margin.left},${margin.top})`}>
          <text x="-36" y={hourlyInnerH / 2} text-anchor="middle" transform={`rotate(-90 -36 ${hourlyInnerH / 2})`} fill="rgba(255,255,255,0.56)" font-size="10" font-family="JetBrains Mono, monospace">
            connections / hour
          </text>

          {#each [0, .25, .5, .75, 1] as tick}
            {@const value = Math.round(hourlyScaleMax * tick)}
            {@const y = scaleY(value, hourlyScaleMax, hourlyInnerH)}
            <g transform={`translate(0,${y})`}>
              <line x1="0" x2={hourlyInnerW} stroke="rgba(255,255,255,0.07)" />
              <line x1="-4" x2="0" stroke="rgba(255,255,255,0.22)" />
              <text x="-8" dy=".35em" text-anchor="end" fill="rgba(255,255,255,0.52)" font-size="11" font-family="JetBrains Mono, monospace">
                {value}
              </text>
            </g>
          {/each}

          <line x1="0" y1={scaleY(averageHourly, hourlyScaleMax, hourlyInnerH)} x2={hourlyInnerW} y2={scaleY(averageHourly, hourlyScaleMax, hourlyInnerH)} stroke="rgba(255,255,255,0.32)" stroke-width="1" stroke-dasharray="4 4" />
          <text x={hourlyInnerW - 2} y={scaleY(averageHourly, hourlyScaleMax, hourlyInnerH)} dy="-0.45em" text-anchor="end" fill="rgba(255,255,255,0.56)" font-size="10" font-family="JetBrains Mono, monospace">
            mean {averageHourly.toFixed(1)}/hr
          </text>

          {#each pair.hourly_histogram as count, hour}
            {@const x = hour * (hourlyBarW + hourlyBarGap)}
            {@const y = scaleY(count, hourlyScaleMax, hourlyInnerH)}
            <rect
              x={x}
              y={y}
              width={hourlyBarW}
              height={Math.max(1, hourlyInnerH - y)}
              rx="2"
              fill={hourColor(hour)}
            >
              <title>{hour}:00 UTC: {count} connections/hour</title>
            </rect>
          {/each}

          <line x1="0" y1={hourlyInnerH} x2={hourlyInnerW} y2={hourlyInnerH} stroke="rgba(255,255,255,0.18)" />
          {#each [0, 6, 12, 18, 23] as hour}
            {@const x = hour * (hourlyBarW + hourlyBarGap) + hourlyBarW / 2}
            <g transform={`translate(${x},${hourlyInnerH})`}>
              <line y1="0" y2="5" stroke="rgba(255,255,255,0.2)" />
              <text y="20" text-anchor="middle" fill="rgba(255,255,255,0.48)" font-size="11" font-family="JetBrains Mono, monospace">
                {String(hour).padStart(2, "0")}
              </text>
            </g>
          {/each}
        </g>
      </svg>
    </div>
    <div class="legend">
      <span><i class="business"></i>Business hours</span>
      <span><i class="off"></i>Outside business hours</span>
      <span><i class="mean"></i>Mean/hr</span>
    </div>
    <p class="caption">This mirrors the candidate-review density view: when traffic happens matters as much as how regular it is.</p>
  </article>
</section>

<style>
  .panel {
    display: grid;
    gap: 1rem;
    border: 1px solid rgba(189, 147, 249, 0.24);
    border-radius: 8px;
    padding: 1rem;
    background: rgba(22, 22, 31, 0.9);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.24);
  }

  .header {
    display: grid;
    gap: .35rem;
  }

  h2,
  h3 {
    margin: 0;
  }

  h2 {
    color: var(--brand-purple);
    font-size: 1.1rem;
  }

  h3 {
    color: var(--brand-yellow);
    font-size: .95rem;
  }

  p {
    margin: 0;
    color: var(--dracula-muted);
  }

  .chart-card {
    display: grid;
    gap: .75rem;
    padding: 1rem;
    border: 1px solid rgba(189, 147, 249, 0.18);
    border-radius: 8px;
    background: rgba(28, 29, 39, 0.68);
  }

  .chart-title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: .75rem;
  }

  .chart-title-row span {
    color: var(--dracula-muted);
    font-family: var(--font-heading);
    font-size: .78rem;
  }

  .svg-wrap {
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    background: rgba(7, 7, 10, 0.32);
  }

  svg {
    display: block;
    width: 100%;
    min-width: 42rem;
    height: auto;
  }

  .empty {
    min-height: 12rem;
    display: grid;
    place-items: center;
    color: var(--dracula-muted);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    background: rgba(7, 7, 10, 0.32);
  }

  .caption {
    color: var(--dracula-muted);
    font-size: .9rem;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    color: var(--dracula-muted);
    font-family: var(--font-heading);
    font-size: .74rem;
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
  }

  .legend i {
    display: inline-block;
    width: .75rem;
    height: .75rem;
    border-radius: 2px;
  }

  .legend .business {
    background: rgba(245, 230, 99, 0.78);
  }

  .legend .off {
    background: rgba(189, 147, 249, 0.72);
  }

  .legend .mean {
    height: 0;
    border-top: 1px dashed rgba(255, 255, 255, 0.5);
    background: transparent;
  }
</style>
