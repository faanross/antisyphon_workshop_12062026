<script lang="ts">
  import type { ConnectionPair, ProcessTreeNode } from "$lib/data/lab02/types";

  let { pair }: { pair: ConnectionPair } = $props();

  let sampleConn = $derived(pair.sample_conn_log[0]);
  let eid1NetworkProcess = $derived(
    pair.sysmon_eid3
      ? pair.sysmon_eid1_chain.find((event) => event.process_guid === pair.sysmon_eid3?.process_guid)
      : undefined,
  );

  function flatten(node: ProcessTreeNode, depth = 0): Array<{ node: ProcessTreeNode; depth: number }> {
    return [{ node, depth }, ...node.children.flatMap((child) => flatten(child, depth + 1))];
  }

  function fileName(path: string): string {
    return path.split("\\").at(-1) ?? path;
  }
</script>

<section class="panel">
  <h2>Process Correlation</h2>
  <p class="intro">Follow the join path: network telemetry identifies the connection, Sysmon EID 3 attributes the connection to a process GUID, and Sysmon EID 1 uses that GUID to recover process creation and parentage.</p>

  <div class="join-path">
    <article class="join-card conn">
      <span class="tag">conn.log</span>
      <strong>{sampleConn.src_ip}:{sampleConn.src_port} -> {sampleConn.dest_ip}:{sampleConn.dest_port}</strong>
      <small>uid={sampleConn.uid}</small>
      <small>{sampleConn.ts} | {sampleConn.service}/{sampleConn.proto}</small>
    </article>

    <div class="join-arrow">
      <span>tuple + time</span>
    </div>

    {#if pair.sysmon_eid3}
      <article class="join-card eid3">
        <span class="tag">Sysmon EID 3</span>
        <strong>{fileName(pair.sysmon_eid3.image)}</strong>
        <small>{pair.sysmon_eid3.source_ip}:{pair.sysmon_eid3.source_port} -> {pair.sysmon_eid3.destination_ip}:{pair.sysmon_eid3.destination_port}</small>
        <code>{pair.sysmon_eid3.process_guid}</code>
      </article>
    {:else}
      <article class="join-card missing">
        <span class="tag">Sysmon EID 3</span>
        <strong>No direct network-process event</strong>
        <small>This pair cannot be attributed by ProcessGuid.</small>
      </article>
    {/if}

    <div class="join-arrow">
      <span>ProcessGuid</span>
    </div>

    {#if eid1NetworkProcess}
      <article class="join-card eid1">
        <span class="tag">Sysmon EID 1</span>
        <strong>{fileName(eid1NetworkProcess.image)}</strong>
        <small>created {eid1NetworkProcess.utc_time}</small>
        <code>{eid1NetworkProcess.process_guid}</code>
      </article>
    {:else}
      <article class="join-card missing">
        <span class="tag">Sysmon EID 1</span>
        <strong>No matching process creation event</strong>
        <small>No EID 1 ProcessGuid matched the EID 3 ProcessGuid.</small>
      </article>
    {/if}
  </div>

  {#if pair.sysmon_eid1_chain.length > 0}
    <div class="eid1-chain">
      <h3>EID 1 parent chain</h3>
      {#each pair.sysmon_eid1_chain as event}
        <article class="eid1-event" class:matched={event.process_guid === pair.sysmon_eid3?.process_guid}>
          <div>
            <strong>{fileName(event.image)}</strong>
            <span>PID {event.process_id} | {event.user}</span>
          </div>
          <small>{event.command_line}</small>
          <div class="guid-row">
            <code>ProcessGuid {event.process_guid}</code>
            <code>ParentProcessGuid {event.parent_process_guid}</code>
          </div>
        </article>
      {/each}
    </div>
  {/if}

  {#if pair.sysmon_eid3}
    <div class="event">
      <strong>Sysmon EID 3</strong>
      <span>{pair.sysmon_eid3.image}</span>
      <code>ProcessGuid {pair.sysmon_eid3.process_guid}</code>
      <span>{pair.sysmon_eid3.source_ip} -> {pair.sysmon_eid3.destination_ip}:{pair.sysmon_eid3.destination_port}</span>
    </div>
  {:else}
    <p>No direct Sysmon EID 3 attribution for this pair.</p>
  {/if}

  <div class="tree">
    <h3>Resolved process tree</h3>
    {#each flatten(pair.process_tree) as item}
      <div class="node" style:margin-left={`${item.depth * 1.5}rem`}>
        <strong>{item.node.process_name}</strong>
        <span>PID {item.node.pid} | {item.node.user}</span>
        <small>{item.node.full_path}</small>
        {#if item.node.annotation}
          <em>{item.node.annotation.tooltip}</em>
        {/if}
      </div>
    {/each}
  </div>
</section>

<style>
  .panel {
    border: 1px solid rgba(98, 114, 164, 0.55);
    border-radius: 8px;
    padding: 1rem;
    background: rgba(33, 34, 44, 0.9);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
  }

  h2 {
    margin: 0 0 .75rem;
    font-size: 1.1rem;
    color: var(--dracula-green);
  }

  h3 {
    margin: 0 0 .65rem;
    color: var(--dracula-cyan);
    font-size: .95rem;
  }

  p {
    color: var(--dracula-muted);
  }

  .intro {
    max-width: 72rem;
    margin: 0 0 1rem;
    line-height: 1.5;
  }

  .join-path {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 7rem minmax(0, 1fr) 7rem minmax(0, 1fr);
    gap: .7rem;
    align-items: stretch;
    margin-bottom: 1rem;
  }

  .join-card {
    display: grid;
    align-content: start;
    gap: .38rem;
    min-width: 0;
    padding: .85rem;
    border: 1px solid rgba(68, 71, 90, 0.9);
    border-radius: 8px;
    background: rgba(25, 26, 33, 0.62);
  }

  .join-card.conn {
    border-color: rgba(245, 230, 99, 0.35);
  }

  .join-card.eid3 {
    border-color: rgba(80, 250, 123, 0.35);
  }

  .join-card.eid1 {
    border-color: rgba(189, 147, 249, 0.45);
  }

  .join-card.missing {
    border-color: rgba(255, 85, 85, 0.35);
    background: rgba(255, 85, 85, 0.07);
  }

  .tag {
    width: fit-content;
    border-radius: 999px;
    padding: .16rem .48rem;
    background: rgba(68, 71, 90, 0.85);
    color: var(--dracula-cyan);
    font-family: var(--font-heading);
    font-size: .68rem;
    font-weight: 800;
  }

  .join-arrow {
    display: grid;
    place-items: center;
    min-height: 100%;
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .72rem;
    text-align: center;
  }

  .join-arrow::before {
    content: "->";
    display: block;
    color: var(--dracula-yellow);
    font-size: 1.4rem;
    line-height: 1;
  }

  .eid1-chain {
    margin-bottom: 1rem;
  }

  .eid1-event {
    display: grid;
    gap: .42rem;
    margin-bottom: .6rem;
    padding: .78rem;
    border: 1px solid rgba(68, 71, 90, 0.9);
    border-left: 4px solid var(--dracula-purple);
    border-radius: 8px;
    background: rgba(25, 26, 33, 0.62);
  }

  .eid1-event.matched {
    border-left-color: var(--dracula-green);
    background: rgba(80, 250, 123, 0.07);
  }

  .eid1-event > div:first-child {
    display: flex;
    flex-wrap: wrap;
    gap: .5rem 1rem;
    justify-content: space-between;
  }

  .guid-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    gap: .45rem;
  }

  .event,
  .node {
    display: grid;
    gap: .25rem;
    border: 1px solid rgba(68, 71, 90, 0.9);
    border-radius: 8px;
    padding: .78rem;
    margin-bottom: .65rem;
  }

  .event {
    background: rgba(80, 250, 123, 0.08);
    border-color: rgba(80, 250, 123, 0.28);
  }

  .tree {
    margin-top: .75rem;
  }

  .node {
    background: rgba(25, 26, 33, 0.62);
    border-left: 4px solid var(--dracula-purple);
  }

  strong {
    color: var(--dracula-fg);
  }

  span,
  small,
  em {
    color: var(--dracula-muted);
  }

  small,
  code {
    font-family: var(--font-mono);
    color: var(--dracula-comment);
    overflow-wrap: anywhere;
  }

  em {
    color: var(--dracula-yellow);
  }

  @media (max-width: 980px) {
    .join-path {
      grid-template-columns: 1fr;
    }

    .join-arrow {
      min-height: auto;
    }

    .join-arrow::before {
      content: "↓";
    }
  }
</style>
