<script lang="ts">
  import type { ConnectionPair } from "$lib/data/lab02/types";

  let { pair }: { pair: ConnectionPair } = $props();

  // One concrete connection, observed by BOTH sensors with different field names.
  let r0 = $derived(pair.sample_conn_log[0]);

  // Raw field name in each source -> the one canonical name they all become.
  const mapping = [
    { zeek: "id.orig_h", sysmon: "SourceIp", canon: "src_ip" },
    { zeek: "id.orig_p", sysmon: "SourcePort", canon: "src_port" },
    { zeek: "id.resp_h", sysmon: "DestinationIp", canon: "dest_ip" },
    { zeek: "id.resp_p", sysmon: "DestinationPort", canon: "dest_port" },
    { zeek: "proto", sysmon: "Protocol", canon: "proto" },
  ];
</script>

<section class="panel">
  <h3>Housekeeping — Normalization</h3>
  <p class="intro">
    Two sensors can describe the <em>same</em> connection with completely different field names.
    Housekeeping maps every source onto one <strong>canonical vocabulary</strong> — so no later
    stage ever has to know which sensor a value came from.
  </p>

  <!-- BEFORE: same connection, two different vocabularies -->
  <div class="before">
    <article class="src zeek">
      <div class="src-head"><span class="tag tag-zeek">Zeek · conn.log</span></div>
      <ul>
        <li><span class="k">id.orig_h</span><span class="v">{r0.src_ip}</span></li>
        <li><span class="k">id.orig_p</span><span class="v">{r0.src_port}</span></li>
        <li><span class="k">id.resp_h</span><span class="v">{r0.dest_ip}</span></li>
        <li><span class="k">id.resp_p</span><span class="v">{r0.dest_port}</span></li>
        <li><span class="k">proto</span><span class="v">{r0.proto}</span></li>
        <li class="extra"><span class="k">orig_bytes / resp_bytes</span><span class="v">{r0.orig_bytes} / {r0.resp_bytes}</span></li>
      </ul>
    </article>

    <article class="src sysmon">
      <div class="src-head"><span class="tag tag-sysmon">Sysmon · EID 3 (network connection)</span></div>
      <ul>
        <li><span class="k">SourceIp</span><span class="v">{r0.src_ip}</span></li>
        <li><span class="k">SourcePort</span><span class="v">{r0.src_port}</span></li>
        <li><span class="k">DestinationIp</span><span class="v">{r0.dest_ip}</span></li>
        <li><span class="k">DestinationPort</span><span class="v">{r0.dest_port}</span></li>
        <li><span class="k">Protocol</span><span class="v">{r0.proto}</span></li>
        <li class="extra"><span class="k">Image</span><span class="v">svchost-health.exe</span></li>
      </ul>
    </article>
  </div>

  <div class="norm-bar">
    <span class="badge norm">normalize ↓</span>
    <span class="norm-note">same values — one shared field name</span>
  </div>

  <!-- AFTER: one canonical shape -->
  <article class="canonical">
    <div class="src-head"><span class="tag tag-canon">canonical event</span></div>
    <ul>
      <li><span class="k">src_ip</span><span class="v">{r0.src_ip}</span></li>
      <li><span class="k">src_port</span><span class="v">{r0.src_port}</span></li>
      <li><span class="k">dest_ip</span><span class="v">{r0.dest_ip}</span></li>
      <li><span class="k">dest_port</span><span class="v">{r0.dest_port}</span></li>
      <li><span class="k">proto</span><span class="v">{r0.proto}</span></li>
    </ul>
  </article>

  <!-- The rename map, made explicit -->
  <div class="map">
    <div class="map-row map-head"><span class="tag-zeek">Zeek conn.log</span><span class="tag-sysmon">Sysmon EID 3</span><span class="tag-canon">→ canonical</span></div>
    {#each mapping as m}
      <div class="map-row">
        <span class="z">{m.zeek}</span>
        <span class="s">{m.sysmon}</span>
        <span class="c">{m.canon}</span>
      </div>
    {/each}
  </div>

  <p class="summary">
    Same fact, two vocabularies, one canonical output. Each sensor still keeps its own extras —
    Zeek the byte counts, Sysmon the process — but the shared 5-tuple now lines up, which is what
    lets the next stage correlate them. Still individual events; no scoring yet.
  </p>
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
    margin: 0 0 1.2rem;
    max-width: 78ch;
    color: var(--brand-muted);
    font-size: 1rem;
    line-height: 1.55;
  }
  .intro em { color: #bd93f9; font-style: normal; }
  .intro strong { color: var(--brand-text); }

  /* before: two source cards */
  .before { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .src, .canonical {
    border: 1px solid rgba(189, 147, 249, 0.2);
    border-radius: 8px;
    background: rgba(28, 29, 39, 0.6);
    padding: 0.85rem 1rem;
  }
  .src-head { margin-bottom: 0.6rem; }
  .tag {
    font-family: var(--font-heading);
    font-size: 0.82rem;
    font-weight: 800;
    padding: 0.22rem 0.6rem;
    border-radius: 6px;
  }
  .tag-zeek { color: #8be9fd; background: rgba(139, 233, 253, 0.1); border: 1px solid rgba(139, 233, 253, 0.3); }
  .tag-sysmon { color: #bd93f9; background: rgba(189, 147, 249, 0.12); border: 1px solid rgba(189, 147, 249, 0.34); }
  .tag-canon { color: #50fa7b; background: rgba(80, 250, 123, 0.1); border: 1px solid rgba(80, 250, 123, 0.36); }

  .src ul, .canonical ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
  .src li, .canonical li {
    display: flex; justify-content: space-between; gap: 1rem; align-items: baseline;
    font-family: var(--font-heading); font-size: 0.92rem;
    padding: 0.25rem 0; border-bottom: 1px solid rgba(189, 147, 249, 0.08);
  }
  .src li:last-child, .canonical li:last-child { border-bottom: none; }
  .src .k { color: #ff8a8a; }                 /* raw field names — differ per source */
  .canonical .k { color: #50fa7b; }           /* canonical field names */
  .v { color: var(--brand-text); white-space: nowrap; }
  .extra { opacity: 0.72; }
  .extra .k { color: var(--dracula-comment); }

  .norm-bar { display: flex; align-items: center; gap: 0.7rem; margin: 1rem 0; }
  .badge {
    padding: 0.3rem 0.7rem; border-radius: 6px;
    font-family: var(--font-heading); font-size: 0.85rem; font-weight: 800; text-transform: uppercase;
  }
  .badge.norm { background: rgba(80, 250, 123, 0.16); color: var(--dracula-green); }
  .norm-note { color: var(--brand-muted); font-size: 0.9rem; }

  .canonical { border-color: rgba(80, 250, 123, 0.35); max-width: 22rem; }

  /* rename map */
  .map {
    margin-top: 1.2rem;
    border: 1px solid rgba(189, 147, 249, 0.18);
    border-radius: 8px;
    overflow: hidden;
  }
  .map-row {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;
    padding: 0.5rem 0.9rem;
    font-family: var(--font-heading); font-size: 0.9rem;
    border-bottom: 1px solid rgba(189, 147, 249, 0.1);
  }
  .map-row:last-child { border-bottom: none; }
  .map-head { background: #191a21; }
  .map-head span { font-size: 0.78rem; font-weight: 800; text-transform: uppercase; }
  .map-row .z { color: #8be9fd; }
  .map-row .s { color: #bd93f9; }
  .map-row .c { color: #50fa7b; font-weight: 700; }

  .summary {
    margin: 1rem 0 0;
    max-width: 80ch;
    color: var(--dracula-comment);
    font-size: 0.9rem;
    line-height: 1.55;
  }

  @media (max-width: 760px) {
    .before { grid-template-columns: 1fr; }
  }
</style>
