<script lang="ts">
  type StepName = "connect" | "discover" | "call" | "done";
  type StepStatus = "start" | "ok" | "error";

  type LifecycleEvent = {
    step: StepName;
    status: StepStatus;
    message: string;
    durationMs?: number;
    details?: unknown;
  };

  type ToolSummary = {
    name: string;
    description: string;
    inputSchema: unknown;
    relevant: boolean;
  };

  type ToolSelection = {
    toolName: string;
    args: Record<string, unknown>;
    reason: string;
    indicatorType: "ip" | "domain" | "url" | "search";
  };

  let indicator = $state("185.225.73.217");
  let events = $state<LifecycleEvent[]>([]);
  let discoveredTools = $state<ToolSummary[]>([]);
  let selectedTool = $state<ToolSelection | null>(null);
  let rawResult = $state<unknown>(null);
  let parsedJson = $state<unknown>(null);
  let textResult = $state("");
  let busy = $state(false);
  let error = $state("");
  let showTools = $state(false);
  let showRaw = $state(false);

  function reset() {
    events = [];
    discoveredTools = [];
    selectedTool = null;
    rawResult = null;
    parsedJson = null;
    textResult = "";
    error = "";
    showTools = false;
    showRaw = false;
  }

  function latest(step: StepName): LifecycleEvent | undefined {
    return events.filter((event) => event.step === step).at(-1);
  }

  function statusLabel(step: StepName): string {
    const event = latest(step);
    if (!event) return "waiting";
    if (event.status === "start") return "running";
    return event.status;
  }

  function json(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  function resultAttributes(): Record<string, unknown> | null {
    return asRecord(asRecord(parsedJson)?.attributes);
  }

  function resultStats(): Record<string, unknown> | null {
    return asRecord(resultAttributes()?.last_analysis_stats);
  }

  function arrayValues(value: unknown): string[] {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  }

  function scalar(value: unknown): string | null {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "object") return null;
    return String(value);
  }

  function epochDate(value: unknown): string | null {
    if (typeof value !== "number") return null;
    return new Date(value * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  }

  function renderedFields(): Array<{ label: string; value: string }> {
    const root = asRecord(parsedJson);
    const attributes = resultAttributes();
    const rdap = asRecord(attributes?.rdap);
    const votes = asRecord(attributes?.total_votes);

    return [
      { label: "GTI type", value: scalar(root?.type) },
      { label: "Reputation", value: scalar(attributes?.reputation) },
      { label: "Country", value: scalar(attributes?.country ?? rdap?.country ?? attributes?.continent) },
      { label: "Registry", value: scalar(attributes?.regional_internet_registry) },
      { label: "Network", value: scalar(rdap?.name ?? rdap?.handle) },
      { label: "Range", value: scalar(rdap?.start_address && rdap?.end_address ? `${rdap.start_address} - ${rdap.end_address}` : null) },
      { label: "Malicious votes", value: scalar(votes?.malicious) },
      { label: "Harmless votes", value: scalar(votes?.harmless) },
      { label: "Last analysis", value: epochDate(attributes?.last_analysis_date) },
      { label: "Last modified", value: epochDate(attributes?.last_modification_date) },
    ].filter((field): field is { label: string; value: string } => Boolean(field.value));
  }

  function renderedTags(): string[] {
    return arrayValues(resultAttributes()?.tags);
  }

  function updateFromEvent(event: LifecycleEvent) {
    events = [...events, event];

    if (event.step === "discover" && event.status === "ok") {
      const details = asRecord(event.details);
      discoveredTools = (details?.tools as ToolSummary[] | undefined) ?? [];
      selectedTool = (details?.selectedTool as ToolSelection | undefined) ?? null;
    }

    if (event.step === "call" && event.status === "start") {
      selectedTool = event.details as ToolSelection;
    }

    if (event.step === "call" && event.status === "ok") {
      const details = asRecord(event.details);
      rawResult = details?.rawResult ?? null;
      parsedJson = details?.parsedJson ?? null;
      textResult = String(details?.textResult ?? "");
    }

    if (event.status === "error") {
      error = event.message;
    }
  }

  async function run() {
    reset();
    busy = true;

    try {
      const response = await fetch("/lab/05/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ indicator }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`MCP route returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          updateFromEvent(JSON.parse(line) as LifecycleEvent);
        }
      }

      if (buffer.trim()) {
        updateFromEvent(JSON.parse(buffer) as LifecycleEvent);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "MCP lifecycle failed";
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Lab 05 | Real GTI MCP</title></svelte:head>

<main>
  <header>
    <div>
      <p class="eyebrow">Lab 05</p>
      <h1>Real GTI MCP</h1>
    </div>
  </header>

  <details class="panel" open>
    <summary class="panel-title">
        <h2>Indicator</h2>
        <span>GTI / VirusTotal</span>
    </summary>

    <div class="controls">
      <label>
        IP, domain, URL, or IOC query
        <input bind:value={indicator} disabled={busy} />
      </label>

      <div class="actions">
        <button onclick={run} disabled={busy}>{busy ? "Running lifecycle" : "Run MCP Lifecycle"}</button>
        <button class="secondary" onclick={reset} disabled={busy && events.length === 0}>Reset</button>
      </div>

      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>
  </details>

  <details class="panel" open>
    <summary class="panel-title">
        <h2>MCP Lifecycle</h2>
        <span>{events.length} events</span>
    </summary>

    <div class="steps">
        {#each ["connect", "discover", "call"] as step}
          {@const event = latest(step as StepName)}
          <article class:active={event?.status === "start"} class:ok={event?.status === "ok"} class:failed={event?.status === "error"}>
            <strong>{step}</strong>
            <span>{statusLabel(step as StepName)}{event?.durationMs !== undefined ? ` | ${event.durationMs}ms` : ""}</span>
            <p>{event?.message ?? "Not started yet."}</p>
          </article>
        {/each}
    </div>
  </details>

  <details class="panel" open>
    <summary class="panel-title">
        <h2>Discovered Tools</h2>
        <div class="title-actions">
          <span>{discoveredTools.length || "not discovered"}</span>
          {#if discoveredTools.length > 0}
            <button class="tiny" onclick={() => showTools = !showTools}>
              {showTools ? "Collapse" : "Expand"}
            </button>
          {/if}
        </div>
    </summary>

      {#if discoveredTools.length > 0}
        <div class="tool-list" class:collapsed={!showTools}>
          {#each showTools ? discoveredTools : discoveredTools.filter((tool) => tool.relevant || tool.name === selectedTool?.toolName) as tool}
            <article class:relevant={tool.relevant} class:selected={tool.name === selectedTool?.toolName}>
              <strong>{tool.name}</strong>
              <p>{tool.description || "No description provided."}</p>
            </article>
          {/each}
        </div>
        {#if !showTools}
          <p class="tool-note">Showing relevant GTI tools only. Expand to inspect all {discoveredTools.length} discovered tools.</p>
        {/if}
      {:else}
        <p class="empty">Run the lifecycle to call <code>listTools()</code>.</p>
      {/if}
  </details>

  <details class="panel" open>
    <summary class="panel-title">
        <h2>Selected Call</h2>
        <span>{selectedTool?.toolName ?? "not selected"}</span>
    </summary>

      {#if selectedTool}
        <div class="call-card">
          <strong>{selectedTool.toolName}</strong>
          <p>{selectedTool.reason}</p>
          <pre>{json(selectedTool.args)}</pre>
        </div>
      {:else}
        <p class="empty">The harness selects the GTI tool after discovery.</p>
      {/if}
  </details>

  <details class="panel" open>
    <summary class="panel-title">
        <h2>Result Summary</h2>
        <span>{parsedJson ? "parsed" : textResult ? "text" : "waiting"}</span>
    </summary>

      {#if parsedJson}
        {@const attributes = resultAttributes()}
        {@const stats = resultStats()}
        <div class="summary">
          <strong>{String(asRecord(parsedJson)?.type ?? selectedTool?.indicatorType ?? "GTI result")}</strong>
          {#if attributes}
            <p>Reputation: {String(attributes.reputation ?? "n/a")}</p>
            <p>Country: {String(attributes.country ?? attributes.continent ?? "n/a")}</p>
          {/if}
          {#if stats}
            <div class="stats">
              {#each Object.entries(stats) as [name, count]}
                <span>{name}: {String(count)}</span>
              {/each}
            </div>
          {/if}
        </div>
      {:else if textResult}
        <pre>{textResult}</pre>
      {:else}
        <p class="empty">No GTI result yet.</p>
      {/if}
  </details>

  <details class="panel" open>
    <summary class="panel-title">
        <h2>Event Log</h2>
        <span>NDJSON stream</span>
    </summary>

      {#if events.length > 0}
        <div class="event-log">
          {#each events as event, index}
            <article class={event.status}>
              <strong>{index + 1}. {event.step}</strong>
              <span>{event.status}</span>
              <p>{event.message}</p>
            </article>
          {/each}
        </div>
      {:else}
        <p class="empty">Lifecycle events will appear as the server streams them.</p>
      {/if}
  </details>

  <details class="panel rendered" open>
    <summary class="panel-title">
      <h2>Rendered GTI Result</h2>
      <span>{parsedJson ? "analyst view" : "waiting"}</span>
    </summary>

    {#if parsedJson}
      {@const fields = renderedFields()}
      {@const stats = resultStats()}
      {@const tags = renderedTags()}
      <div class="rendered-layout">
        <div class="field-grid">
          {#each fields as field}
            <article class="field-card">
              <span>{field.label}</span>
              <strong>{field.value}</strong>
            </article>
          {/each}
        </div>

        {#if stats}
          <section class="mini-section">
            <h3>Detection Stats</h3>
            <div class="stats large">
              {#each Object.entries(stats) as [name, count]}
                <span>{name}: {String(count)}</span>
              {/each}
            </div>
          </section>
        {/if}

        {#if tags.length > 0}
          <section class="mini-section">
            <h3>Tags</h3>
            <div class="tags">
              {#each tags as tag}
                <span>{tag}</span>
              {/each}
            </div>
          </section>
        {/if}
      </div>
    {:else if textResult}
      <pre>{textResult}</pre>
    {:else}
      <p class="empty">Run the lifecycle to render GTI result fields here.</p>
    {/if}
  </details>

  <details class="panel raw">
    <summary class="panel-title">
      <h2>Raw MCP Result</h2>
      <div class="title-actions">
        <span>{rawResult ? "client.callTool()" : "waiting"}</span>
        {#if rawResult}
          <button class="tiny" onclick={() => showRaw = !showRaw}>
            {showRaw ? "Collapse" : "Expand"}
          </button>
        {/if}
      </div>
    </summary>
    {#if rawResult && showRaw}
      <pre>{json(rawResult)}</pre>
    {:else if rawResult}
      <p class="empty">Raw MCP payload is collapsed. Expand when you need the full protocol result.</p>
    {:else}
      <pre>No raw MCP result yet</pre>
    {/if}
  </details>
</main>

<style>
  main {
    width: min(1440px, calc(100% - 2rem));
    min-height: 100vh;
    margin: 0 auto;
    padding: 2rem 0 3rem;
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

  h1,
  h2 {
    margin: 0;
  }

  h1 {
    color: var(--dracula-cyan);
    font-size: clamp(1.7rem, 3vw, 2.45rem);
    line-height: 1.05;
  }

  details.panel {
    margin-bottom: 1rem;
  }

  .panel {
    min-width: 0;
    border: 1px solid rgba(98, 114, 164, 0.55);
    border-radius: 8px;
    padding: 1rem;
    background: rgba(33, 34, 44, 0.9);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
  }

  .panel-title {
    display: flex;
    gap: .75rem;
    align-items: center;
    justify-content: space-between;
    margin-bottom: .85rem;
  }

  summary.panel-title {
    cursor: pointer;
    list-style: none;
    margin-bottom: 0;
  }

  details[open] > summary.panel-title {
    margin-bottom: .85rem;
  }

  summary.panel-title::-webkit-details-marker {
    display: none;
  }

  summary.panel-title h2::before {
    content: "+ ";
    color: var(--dracula-yellow);
  }

  details[open] > summary.panel-title h2::before {
    content: "- ";
  }

  .panel-title h2 {
    color: var(--dracula-pink);
    font-size: 1rem;
  }

  .panel-title span {
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .72rem;
  }

  .title-actions {
    display: flex;
    gap: .55rem;
    align-items: center;
  }

  .controls,
  .steps,
  .tool-list,
  .event-log,
  .summary,
  .call-card {
    display: grid;
    gap: .75rem;
  }

  label {
    display: grid;
    gap: .35rem;
    color: var(--dracula-muted);
    font-family: var(--font-heading);
    font-size: .78rem;
  }

  input,
  button {
    min-height: 2.65rem;
    padding: .65rem .8rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: .65rem;
  }

  .secondary {
    background: rgba(68, 71, 90, 0.5);
  }

  .tiny {
    min-height: 1.9rem;
    padding: .25rem .55rem;
    border-color: rgba(245, 230, 99, 0.35);
    background: rgba(245, 230, 99, 0.09);
    color: var(--dracula-cyan);
    font-family: var(--font-heading);
    font-size: .72rem;
  }

  article,
  .call-card,
  .summary {
    display: grid;
    gap: .45rem;
    padding: .85rem;
    border: 1px solid rgba(68, 71, 90, 0.88);
    border-radius: 8px;
    background: rgba(25, 26, 33, 0.62);
  }

  article.active {
    border-color: rgba(245, 230, 99, 0.5);
    background: rgba(245, 230, 99, 0.08);
  }

  article.ok,
  article.relevant {
    border-color: rgba(80, 250, 123, 0.42);
    background: rgba(80, 250, 123, 0.08);
  }

  article.failed,
  article.error {
    border-color: rgba(255, 85, 85, 0.55);
    background: rgba(255, 85, 85, 0.1);
  }

  article.selected {
    box-shadow: inset 3px 0 0 rgba(245, 230, 99, 0.8);
  }

  strong {
    color: var(--dracula-cyan);
    font-family: var(--font-heading);
  }

  article span,
  .stats span {
    color: var(--dracula-yellow);
    font-family: var(--font-heading);
    font-size: .78rem;
  }

  p,
  .empty {
    margin: 0;
    color: var(--dracula-muted);
    line-height: 1.5;
  }

  .error {
    margin: 0;
    color: var(--dracula-red);
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: .5rem;
  }

  .rendered {
    margin-bottom: 1rem;
  }

  .rendered-layout,
  .mini-section {
    display: grid;
    gap: .85rem;
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: .75rem;
  }

  .field-card {
    gap: .35rem;
    min-height: 5rem;
    border-color: rgba(245, 230, 99, 0.28);
    background: rgba(245, 230, 99, 0.06);
  }

  .field-card span,
  .mini-section h3 {
    margin: 0;
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .72rem;
    text-transform: uppercase;
  }

  .field-card strong {
    align-self: end;
    color: var(--dracula-fg);
    overflow-wrap: anywhere;
  }

  .stats.large span,
  .tags span {
    padding: .32rem .58rem;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: .5rem;
  }

  .tags span {
    border: 1px solid rgba(189, 147, 249, 0.35);
    border-radius: 999px;
    background: rgba(189, 147, 249, 0.08);
    color: var(--dracula-purple);
    font-family: var(--font-heading);
    font-size: .76rem;
  }

  .tool-list.collapsed {
    max-height: 20rem;
    overflow: auto;
  }

  .tool-note {
    margin-top: .75rem;
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-size: .78rem;
  }

  .stats span {
    padding: .25rem .5rem;
    border: 1px solid rgba(245, 230, 99, 0.3);
    border-radius: 999px;
    color: var(--dracula-cyan);
  }

  pre,
  code {
    font-family: var(--font-mono);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  pre {
    margin: 0;
    max-height: 34rem;
    overflow: auto;
    border: 1px solid rgba(68, 71, 90, 0.88);
    border-radius: 8px;
    padding: 1rem;
    background: rgba(25, 26, 33, 0.72);
    color: var(--dracula-fg);
  }

  code {
    color: var(--dracula-yellow);
  }

</style>
