<script lang="ts">
  import type { ConnectionPair } from "$lib/data/lab02/types";

  let { pair }: { pair: ConnectionPair } = $props();
  let rows = $derived(pair.sample_conn_log.slice(0, 8));

  // The renames applied during normalization (raw Zeek field -> canonical field).
  const renames = [
    ["id.orig_h", "src_ip"],
    ["id.orig_p", "src_port"],
    ["id.resp_h", "dest_ip"],
    ["id.resp_p", "dest_port"],
  ];
</script>

<section class="panel">
  <h3>Housekeeping</h3>
  <p class="intro">Raw telemetry arrives with source-specific field names. Normalization maps every source onto one canonical vocabulary and collapses duplicates — so every later stage reads the same field names.</p>

  <div class="renames">
    <span class="badge norm">normalized</span>
    {#each renames as [from, to]}
      <code><span class="from">{from}</span> → <span class="to">{to}</span></code>
    {/each}
    <span class="badge dedup">duplicates collapsed</span>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>ts</th>
          <th>src_ip</th>
          <th>src_port</th>
          <th>dest_ip</th>
          <th>dest_port</th>
          <th>proto</th>
          <th>service</th>
          <th>duration</th>
          <th>orig_bytes</th>
          <th>resp_bytes</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as r}
          <tr>
            <td>{r.ts}</td>
            <td>{r.src_ip}</td>
            <td>{r.src_port}</td>
            <td>{r.dest_ip}</td>
            <td>{r.dest_port}</td>
            <td>{r.proto}</td>
            <td>{r.service}</td>
            <td>{r.duration.toFixed(3)}</td>
            <td>{r.orig_bytes}</td>
            <td>{r.resp_bytes}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="summary">Canonical field names — exactly what every downstream stage will read. Still individual events; no scoring yet.</p>
</section>

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
    margin: 0 0 1.1rem;
    max-width: 75ch;
    color: var(--brand-muted);
    font-size: 1rem;
    line-height: 1.55;
  }

  .renames {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1.2rem;
  }
  .renames code {
    padding: 0.35rem 0.6rem;
    border-radius: 6px;
    background: rgba(189, 147, 249, 0.1);
    font-family: var(--font-heading);
    font-size: 0.95rem;
  }
  .renames .from {
    color: var(--brand-muted);
    text-decoration: line-through;
    text-decoration-color: rgba(255, 85, 85, 0.6);
  }
  .renames .to {
    color: var(--brand-purple-light);
  }
  .badge {
    padding: 0.35rem 0.65rem;
    border-radius: 6px;
    font-family: var(--font-heading);
    font-size: 0.82rem;
    font-weight: 800;
    text-transform: uppercase;
  }
  .badge.norm {
    background: rgba(80, 250, 123, 0.16);
    color: var(--dracula-green);
  }
  .badge.dedup {
    background: rgba(245, 230, 99, 0.12);
    color: var(--brand-yellow);
  }

  .table-wrap {
    overflow-x: auto;
    border: 1px solid rgba(189, 147, 249, 0.18);
    border-radius: 8px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-family: var(--font-heading);
    font-size: 0.95rem;
  }
  th,
  td {
    border-bottom: 1px solid rgba(189, 147, 249, 0.12);
    padding: 0.6rem 0.8rem;
    text-align: left;
    white-space: nowrap;
  }
  tbody tr:nth-child(even) {
    background: rgba(189, 147, 249, 0.05);
  }
  th {
    position: sticky;
    top: 0;
    background: #191a21;
    color: var(--brand-yellow);
    font-weight: 700;
  }
  td {
    color: var(--brand-text);
  }

  .summary {
    margin: 0.9rem 0 0;
    color: var(--dracula-comment);
    font-size: 0.9rem;
  }
</style>
