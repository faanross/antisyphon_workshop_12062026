<script lang="ts">
  let {
    title = "Chat",
    value = $bindable(""),
    output = "",
    busy = false,
    onSubmit = () => {},
  }: {
    title?: string;
    value?: string;
    output?: string;
    busy?: boolean;
    onSubmit?: (value: string) => void | Promise<void>;
  } = $props();
</script>

<section class="panel">
  <h2>{title}</h2>
  <pre>{output || "No response yet."}</pre>
  <form onsubmit={(event) => { event.preventDefault(); onSubmit(value); }}>
    <textarea bind:value rows="4"></textarea>
    <button disabled={busy}>{busy ? "Working" : "Send"}</button>
  </form>
</section>

<style>
  .panel {
    min-width: 0;
    display: grid;
    gap: .85rem;
    border: 1px solid rgba(98, 114, 164, 0.55);
    border-radius: 8px;
    padding: 1rem;
    background: rgba(33, 34, 44, 0.9);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
  }

  h2 {
    margin: 0;
    color: var(--dracula-pink);
    font-family: var(--font-heading);
    font-size: 1rem;
  }

  pre {
    min-height: 18rem;
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

  form {
    display: grid;
    gap: .65rem;
  }

  textarea {
    min-height: 7rem;
    padding: .8rem;
    resize: vertical;
  }

  button {
    min-height: 2.75rem;
    padding: .65rem .9rem;
  }
</style>
