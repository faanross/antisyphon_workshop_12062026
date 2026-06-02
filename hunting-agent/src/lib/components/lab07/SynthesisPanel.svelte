<script lang="ts">
  let { synthesis = "" }: { synthesis?: string } = $props();
</script>

<section class="panel">
  <div class="panel-title">
    <h2>Synthesis</h2>
    <span>{synthesis ? "grounded answer" : "waiting"}</span>
  </div>
  <pre>{synthesis || "Run a query to synthesize prior-investigation context."}</pre>
</section>

<style>
  .panel {
    display: grid;
    gap: .85rem;
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

  h2 {
    margin: 0;
    color: var(--dracula-pink);
    font-family: var(--font-heading);
    font-size: 1rem;
  }

  span {
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .78rem;
  }

  pre {
    min-height: 10rem;
    margin: 0;
    white-space: pre-wrap;
    overflow: auto;
    border: 1px solid rgba(68, 71, 90, 0.88);
    border-radius: 8px;
    padding: 1rem;
    background: rgba(25, 26, 33, 0.72);
    color: var(--dracula-fg);
    font-family: var(--font-mono);
    line-height: 1.55;
  }
</style>
