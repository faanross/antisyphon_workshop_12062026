<script lang="ts">
  let { hits = [] }: { hits?: Array<{
    chunk_id: string;
    source_report: string;
    report_title: string;
    verdict: string;
    section: string;
    score: number;
    text: string;
  }> } = $props();
</script>

<section class="panel">
  <div class="panel-title">
    <h2>Retrieved Chunks</h2>
    <span>{hits.length} hits</span>
  </div>

  {#if hits.length > 0}
    {#each hits as hit}
      <article>
        <div class="hit-meta">
          <strong>{hit.source_report}</strong>
          <span>{hit.section} | {hit.score.toFixed(3)}</span>
        </div>
        <h3>{hit.report_title}</h3>
        <small>{hit.verdict}</small>
        <p>{hit.text}</p>
      </article>
    {/each}
  {:else}
    <p class="empty">No retrieved chunks yet. Run a query to inspect nearest prior investigations.</p>
  {/if}
</section>

<style>
  .panel {
    display: grid;
    gap: .75rem;
    margin-bottom: 1rem;
    border: 1px solid rgba(98, 114, 164, 0.55);
    border-radius: 8px;
    padding: 1rem;
    background: rgba(33, 34, 44, 0.9);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
  }

  .panel-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .75rem;
  }

  h2,
  h3 {
    margin: 0;
    font-family: var(--font-heading);
  }

  h2 {
    color: var(--dracula-pink);
    font-size: 1rem;
  }

  h3 {
    color: var(--dracula-fg);
    font-size: 1.05rem;
  }

  .panel-title span,
  .hit-meta span,
  small {
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .78rem;
  }

  article {
    display: grid;
    gap: .55rem;
    border: 1px solid rgba(68, 71, 90, 0.88);
    border-radius: 8px;
    padding: .9rem;
    background: rgba(25, 26, 33, 0.62);
  }

  .hit-meta {
    display: flex;
    flex-wrap: wrap;
    gap: .75rem;
    align-items: center;
    justify-content: space-between;
  }

  strong {
    color: var(--dracula-yellow);
    font-family: var(--font-heading);
  }

  p,
  .empty {
    margin: 0;
    color: var(--dracula-muted);
    line-height: 1.55;
  }
</style>
