<script lang="ts">
  import type { ConnectionPair } from "$lib/data/lab02/types";

  let { pair }: { pair: ConnectionPair } = $props();

  let candidate = $derived(pair.candidate);
  let candidateJson = $derived(JSON.stringify(candidate, null, 2));
  let identityRows = $derived([
    ["Type", candidate.type],
    ["Source", candidate.entity_key.src_ip],
    ["Destination", candidate.entity_key.dest_ip],
    ["Destination Port", String(candidate.entity_key.dest_port)],
    ["Beacon Score", candidate.beacon_score.toFixed(2)],
    ["Composite Score", candidate.scores.composite_score.toFixed(3)],
    ["Connections", String(candidate.connection_count)],
    ["Evidence Count", String(candidate.evidence_count)],
  ]);
  let timeRows = $derived([
    ["Window Start", candidate.time_window.start],
    ["Window End", candidate.time_window.end],
    ["Median Interval", `${candidate.median_interval_seconds.toFixed(1)}s`],
    ["Consecutive Hours", `${candidate.scores.consecutive_hours}h`],
  ]);
  let attributionRows = $derived([
    ["Process", candidate.attribution.process_name],
    ["PID", String(candidate.attribution.process_id)],
    ["Path", candidate.attribution.process_path],
    ["User", candidate.attribution.user],
    ["Parent", candidate.attribution.parent_process],
    ["Grandparent", candidate.attribution.grandparent_process],
    ["Confidence", candidate.attribution.confidence],
  ]);
  let scoreRows = $derived([
    ["Regularity", candidate.scores.regularity.toFixed(3)],
    ["Median Interval", candidate.scores.median_interval.toFixed(3)],
    ["MAD Interval", candidate.scores.mad_interval.toFixed(3)],
    ["Outbound Byte Consistency", candidate.scores.orig_byte_consistency.toFixed(3)],
    ["Median Outbound Bytes", candidate.scores.median_orig_bytes.toFixed(0)],
    ["MAD Outbound Bytes", candidate.scores.mad_orig_bytes.toFixed(3)],
    ["Inbound Byte Consistency", candidate.scores.resp_byte_consistency.toFixed(3)],
    ["Median Inbound Bytes", candidate.scores.median_resp_bytes.toFixed(0)],
    ["MAD Inbound Bytes", candidate.scores.mad_resp_bytes.toFixed(3)],
    ["Duration Consistency", candidate.scores.duration_consistency.toFixed(3)],
    ["Histogram Score", candidate.scores.histogram_score.toFixed(3)],
    ["Composite Score", candidate.scores.composite_score.toFixed(3)],
    ["Beacon Score", candidate.scores.beacon_score.toFixed(3)],
  ]);
  let enrichmentRows = $derived([
    ["Threat Intel Match", candidate.enrichment.threat_intel_match ? "Yes" : "No"],
    ["Threat Intel Source", candidate.enrichment.threat_intel_source ?? "None"],
    ["GeoIP Country", candidate.enrichment.geoip_country],
    ["GeoIP ASN", candidate.enrichment.geoip_asn],
    ["Destination Rarity", candidate.enrichment.destination_rarity.toFixed(2)],
    ["First Seen", candidate.enrichment.first_seen],
    ["LOTS Match", candidate.enrichment.lots_match ? "Yes" : "No"],
    ["LOTS Service", candidate.enrichment.lots_service ?? "None"],
    ["Missing SNI", candidate.enrichment.missing_sni ? "Yes" : "No"],
    ["Business Hours", `${Math.round(candidate.enrichment.business_hours_proportion * 100)}%`],
  ]);
</script>

<section class="panel">
  <div class="header">
    <div>
      <h2>Complete Candidate</h2>
      <p>The emitted object should be inspectable without dropping immediately into raw JSON.</p>
    </div>
    <div class="score">{candidate.beacon_score.toFixed(2)}</div>
  </div>

  <div class="candidate-id">
    <span>{pair.id}</span>
    <strong>{candidate.entity_key.src_ip} -> {candidate.entity_key.dest_ip}:{candidate.entity_key.dest_port}</strong>
  </div>

  <div class="sections">
    <article>
      <h3>Identity</h3>
      <dl>
        {#each identityRows as [label, value]}
          <div><dt>{label}</dt><dd>{value}</dd></div>
        {/each}
      </dl>
    </article>

    <article>
      <h3>Time Window</h3>
      <dl>
        {#each timeRows as [label, value]}
          <div><dt>{label}</dt><dd>{value}</dd></div>
        {/each}
      </dl>
    </article>

    <article>
      <h3>Attribution</h3>
      <dl>
        {#each attributionRows as [label, value]}
          <div><dt>{label}</dt><dd>{value}</dd></div>
        {/each}
      </dl>
    </article>

    <article>
      <h3>Enrichment</h3>
      <dl>
        {#each enrichmentRows as [label, value]}
          <div><dt>{label}</dt><dd>{value}</dd></div>
        {/each}
      </dl>
    </article>
  </div>

  <article class="wide">
    <h3>Scores</h3>
    <dl class="score-grid">
      {#each scoreRows as [label, value]}
        <div><dt>{label}</dt><dd>{value}</dd></div>
      {/each}
    </dl>
  </article>

  <details>
    <summary>Raw structured candidate object</summary>
    <pre>{candidateJson}</pre>
  </details>
</section>

<style>
  .panel {
    border: 1px solid rgba(189, 147, 249, 0.24);
    border-radius: 8px;
    padding: 1rem;
    background: rgba(22, 22, 31, 0.9);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.24);
  }

  .header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  h2,
  h3 {
    margin: 0;
  }

  h2 {
    color: var(--brand-yellow);
    font-size: 1.3rem;
  }

  h3 {
    color: var(--brand-purple-light);
    font-size: 1.15rem;
  }

  p {
    margin: .35rem 0 0;
    color: var(--dracula-muted);
    font-size: 1.05rem;
    line-height: 1.55;
  }

  .score {
    color: var(--brand-yellow);
    font-family: var(--font-heading);
    font-size: 2.1rem;
    font-weight: 800;
  }

  .candidate-id {
    margin-bottom: 1rem;
    padding: .85rem;
    border: 1px solid rgba(245, 230, 99, 0.24);
    border-radius: 8px;
    background: rgba(245, 230, 99, 0.06);
  }

  .candidate-id span {
    display: block;
    margin-bottom: .45rem;
    color: var(--brand-purple-light);
    font-family: var(--font-heading);
    font-size: .78rem;
    font-weight: 800;
  }

  .candidate-id strong {
    color: var(--brand-text);
    font-size: 1.25rem;
    overflow-wrap: anywhere;
  }

  .sections {
    margin-bottom: 1rem;
  }

  article,
  details {
    min-width: 0;
    padding: 1.15rem;
    border: 1px solid rgba(189, 147, 249, 0.18);
    border-radius: 8px;
    background: rgba(28, 29, 39, 0.7);
  }

  .wide {
    margin-bottom: 1rem;
  }

  .sections article {
    margin-bottom: 1rem;
  }

  dl {
    margin: .75rem 0 0;
  }

  .score-grid {
    display: block;
  }

  dl > div {
    display: flex;
    gap: 1.25rem;
    align-items: baseline;
    padding: .7rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }

  .score-grid > div {
    display: flex;
  }

  dt {
    flex: 0 0 15rem;
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: 1rem;
    font-weight: 800;
  }

  dd {
    flex: 1 1 auto;
    margin: 0;
    color: var(--dracula-fg);
    font-size: 1.22rem;
    font-weight: 700;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  summary {
    color: var(--brand-yellow);
    cursor: pointer;
    font-family: var(--font-heading);
    font-weight: 800;
  }

  pre {
    max-height: 32rem;
    margin: .85rem 0 0;
    overflow: auto;
    padding: .85rem;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 8px;
    background: rgba(7, 7, 10, 0.56);
    color: var(--dracula-fg);
    font-size: .78rem;
    line-height: 1.55;
  }

  @media (max-width: 620px) {
    .header {
      display: block;
    }

    dl > div,
    .score-grid > div {
      display: block;
    }

    dt {
      margin-bottom: .25rem;
    }
  }
</style>
