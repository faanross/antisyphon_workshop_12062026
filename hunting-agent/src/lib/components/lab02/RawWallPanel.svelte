<script lang="ts">
  import type { ConnectionPair } from "$lib/data/lab02/types";

  let { pair }: { pair: ConnectionPair } = $props();
  let rows = $derived(pair.sample_conn_log.slice(0, 6));
</script>

<div class="panel">
  <h3>Raw Telemetry</h3>
  <p class="intro">Thousands of conn.log rows arrive every minute. The beacon is in here somewhere — buried in volume, indistinguishable from everything else.</p>

  <div class="wall">
    {#each Array(3) as _, i}<div class="ghostrow" style="opacity:{0.45 - i * 0.1}"></div>{/each}
    {#each rows as r}
      <div class="conn">
        <span class="c-ts">{r.ts}</span>
        <span class="c-pair">{r.src_ip}:{r.src_port} → {r.dest_ip}:{r.dest_port}</span>
        <span class="c-bytes">{r.orig_bytes}/{r.resp_bytes} B</span>
      </div>
    {/each}
    {#each Array(5) as _, i}<div class="ghostrow" style="opacity:{0.4 - i * 0.07}"></div>{/each}
  </div>
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
    margin: 0 0 1.2rem;
    max-width: 70ch;
    color: var(--brand-muted);
    font-size: 1rem;
    line-height: 1.55;
  }
  .wall {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
  .ghostrow {
    height: 1.15rem;
    border-radius: 3px;
    background: linear-gradient(90deg, rgba(189, 147, 249, 0.18), rgba(189, 147, 249, 0.05));
    filter: blur(1px);
  }
  .conn {
    display: grid;
    grid-template-columns: 15rem 1fr auto;
    gap: 1.5rem;
    align-items: center;
    padding: 0.65rem 0.9rem;
    border-radius: 5px;
    background: rgba(28, 29, 39, 0.7);
    color: var(--brand-muted);
    font-family: var(--font-heading);
    font-size: 1rem;
    opacity: 0.62;
  }
  .conn span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .c-bytes {
    text-align: right;
  }
</style>
