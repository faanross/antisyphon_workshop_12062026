<script lang="ts">
  import chunks from "$lib/data/workshop/rag/chunks.json";
  import ChatPanel from "$lib/components/ChatPanel.svelte";
  import CorpusBrowser from "$lib/components/lab07/CorpusBrowser.svelte";
  import RAGResultsPanel from "$lib/components/lab07/RAGResultsPanel.svelte";
  import SynthesisPanel from "$lib/components/lab07/SynthesisPanel.svelte";

  type Hit = {
    chunk_id: string;
    source_report: string;
    report_title: string;
    verdict: string;
    section: string;
    score: number;
    text: string;
  };

  let query = $state("CrowdFalcon EDR heartbeat beacon false positive 10.42.10.0/24");
  let synthesis = $state("");
  let hits = $state<Hit[]>([]);
  let busy = $state(false);

  async function run(value: string) {
    busy = true;
    const response = await fetch("/api/lab07/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: value }),
    });
    const data = await response.json();
    hits = data.hits;
    synthesis = data.synthesis;
    busy = false;
  }
</script>

<svelte:head><title>Lab 08 | RAG</title></svelte:head>

<main>
  <header>
    <p class="eyebrow">Lab 08</p>
    <h1>RAG Prior Investigations</h1>
  </header>

  <section class="workspace">
    <ChatPanel title="RAG Query" bind:value={query} output={synthesis} {busy} onSubmit={run} />
    <CorpusBrowser chunks={chunks} />
  </section>

  <RAGResultsPanel {hits} />
  <SynthesisPanel {synthesis} />
</main>

<style>
  main {
    width: min(1440px, calc(100% - 2rem));
    min-height: 100vh;
    margin: 0 auto;
    padding: 2rem 0 3rem;
    color: var(--dracula-fg);
  }

  header {
    margin-bottom: 1rem;
    padding: 1rem;
    border: 1px solid rgba(98, 114, 164, 0.5);
    border-radius: 8px;
    background: rgba(33, 34, 44, 0.84);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.28);
  }

  .eyebrow {
    margin: 0 0 .35rem;
    color: var(--dracula-purple);
    font-family: var(--font-heading);
    font-size: .78rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    color: var(--brand-yellow);
    font-family: var(--font-heading);
    font-size: clamp(2.1rem, 4vw, 4rem);
    line-height: 1.02;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
    gap: 1rem;
    align-items: start;
    margin-bottom: 1rem;
  }

  @media (max-width: 980px) {
    .workspace {
      grid-template-columns: 1fr;
    }
  }
</style>
