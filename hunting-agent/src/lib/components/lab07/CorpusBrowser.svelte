<script lang="ts">
  let { chunks = [] }: {
    chunks?: Array<{ source_report: string; report_title: string; verdict: string; tags: string[] }>;
  } = $props();
  let reports = $derived(Array.from(new Map(chunks.map((chunk) => [chunk.source_report, chunk])).values()));
</script>

<section class="panel">
  <h2>Prior Investigation Corpus</h2>
  {#each reports as report}
    <article>
      <strong>{report.source_report}</strong>
      <span>{report.report_title}</span>
      <small>{report.verdict} | {report.tags.slice(0, 5).join(", ")}</small>
    </article>
  {/each}
</section>

<style>
  .panel {
    min-width: 0;
    max-height: 38rem;
    overflow: auto;
    border: 1px solid rgba(98, 114, 164, 0.55);
    border-radius: 8px;
    padding: 1rem;
    background: rgba(33, 34, 44, 0.9);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
  }

  h2 {
    position: sticky;
    top: -1rem;
    z-index: 1;
    margin: -1rem -1rem .75rem;
    padding: 1rem;
    border-bottom: 1px solid rgba(98, 114, 164, 0.45);
    background: rgba(33, 34, 44, 0.96);
    color: var(--dracula-pink);
    font-family: var(--font-heading);
    font-size: 1rem;
  }

  article {
    display: grid;
    gap: .35rem;
    padding: .85rem;
    border: 1px solid rgba(68, 71, 90, 0.88);
    border-radius: 8px;
    background: rgba(25, 26, 33, 0.58);
  }

  article + article {
    margin-top: .65rem;
  }

  strong {
    color: var(--dracula-yellow);
    font-family: var(--font-heading);
    font-size: .82rem;
  }

  span {
    color: var(--dracula-fg);
    font-weight: 650;
  }

  small {
    color: var(--dracula-muted);
    line-height: 1.45;
  }
</style>
