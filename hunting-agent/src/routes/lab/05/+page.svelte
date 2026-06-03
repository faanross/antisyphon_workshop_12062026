<script lang="ts">
  import PlugsConnectedIcon from "phosphor-svelte/lib/PlugsConnectedIcon";
  import MagnifyingGlassIcon from "phosphor-svelte/lib/MagnifyingGlassIcon";
  import LightningIcon from "phosphor-svelte/lib/LightningIcon";
  import CursorClickIcon from "phosphor-svelte/lib/CursorClickIcon";
  import TerminalWindowIcon from "phosphor-svelte/lib/TerminalWindowIcon";
  import CubeIcon from "phosphor-svelte/lib/CubeIcon";
  import GlobeHemisphereWestIcon from "phosphor-svelte/lib/GlobeHemisphereWestIcon";
  import ArrowsLeftRightIcon from "phosphor-svelte/lib/ArrowsLeftRightIcon";
  import CheckCircleIcon from "phosphor-svelte/lib/CheckCircleIcon";
  import HardDrivesIcon from "phosphor-svelte/lib/HardDrivesIcon";
  import ScalesIcon from "phosphor-svelte/lib/ScalesIcon";
  import ArrowRightIcon from "phosphor-svelte/lib/ArrowRightIcon";

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

  let activeTab = $state<"live" | "code">("live");
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

  <div class="tab-bar">
    <button class="tab-btn" class:active={activeTab === "live"} onclick={() => (activeTab = "live")}>Live</button>
    <button class="tab-btn" class:active={activeTab === "code"} onclick={() => (activeTab = "code")}>Code</button>
  </div>

  {#if activeTab === "live"}
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
  {:else}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- CODE VIEW  (architectural reference, non-interactive)-->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="code-view">
      <div class="code-inner">
        <!-- Intro -->
        <header class="cv-hero">
          <span class="cv-eyebrow">Under the Hood</span>
          <h2>How the agent reaches an external tool</h2>
          <p>
            Optional reading for the curious. In Lab 04 the tools were functions <em>we</em>
            wrote, living inside the harness. Here the harness reaches a tool server it did
            <strong>not</strong> write — Google's Threat Intelligence server — using
            <strong>MCP</strong>, the open protocol for plugging external tools into agents.
            This is a real, live connection (it needs a VirusTotal key and <code>uv</code>).
          </p>
          <div class="cv-mental-model">
            <PlugsConnectedIcon size={20} weight="duotone" />
            <span>connect</span>
            <span class="cv-mm-sep">→</span>
            <MagnifyingGlassIcon size={20} weight="duotone" />
            <span>discover tools</span>
            <span class="cv-mm-sep">→</span>
            <LightningIcon size={20} weight="duotone" />
            <span>call one</span>
          </div>
        </header>

        <!-- A · Journey -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">A</span> The journey of one lookup<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            Follow one indicator — an IP, domain, or URL — from the box to a live Google
            Threat Intelligence result. Every step emits an event you see in the lifecycle panel.
          </p>

          <ol class="flow">
            <li class="flow-step" style="--d: 0ms">
              <span class="flow-rail"><CursorClickIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">You enter an indicator</span><span class="flow-where">browser</span></div>
                <p>An IP, domain, URL, or free-text query is posted to the server, which kicks off the MCP lifecycle.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 90ms">
              <span class="flow-rail"><PlugsConnectedIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Connect — spawn the MCP server</span><span class="flow-badge">real subprocess</span><span class="flow-where">server · mcp.ts</span></div>
                <p>The harness launches Google's GTI server as a <em>separate process</em> (<code>uv run server.py</code>) and connects to it over stdio. No HTTP, no SDK for each vendor — just the MCP protocol.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 180ms">
              <span class="flow-rail"><MagnifyingGlassIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Discover — ask what it can do</span><span class="flow-where">server · mcp.ts</span></div>
                <p><code>listTools()</code> asks the server to describe its own tools. Nothing is hardcoded — the harness learns the catalog at runtime, then marks the four GTI tools it cares about.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 270ms">
              <span class="flow-rail"><LightningIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Call — pick a tool and run it</span><span class="flow-where">server · mcp.ts</span></div>
                <p><code>selectGtiTool()</code> chooses the right tool from the indicator's shape, then <code>callTool()</code> makes the live request to Google Threat Intelligence and returns the report.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 360ms">
              <span class="flow-rail"><CheckCircleIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Done — parse and close</span><span class="flow-where">server → browser</span></div>
                <p>The text result is parsed, the connection is closed, and every lifecycle event (connect / discover / call / done) is streamed to the panels you saw.</p>
              </div>
            </li>
          </ol>
        </details>

        <!-- B · What MCP is -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">B</span> What MCP actually is<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            MCP (Model Context Protocol) is a universal adapter between an agent and the tools it
            uses. The harness is the <em>client</em>; any tool provider can ship a <em>server</em>.
            They speak one protocol, so they don't need to know anything about each other.
          </p>

          <div class="mcp-diagram">
            <div class="mcp-node mcp-client">
              <HardDrivesIcon size={22} weight="duotone" />
              <strong>The harness</strong>
              <small>MCP client</small>
            </div>
            <div class="mcp-link">
              <ArrowsLeftRightIcon size={18} weight="bold" />
              <span>stdio · JSON-RPC</span>
            </div>
            <div class="mcp-node mcp-server">
              <CubeIcon size={22} weight="duotone" />
              <strong>GTI MCP server</strong>
              <small>subprocess</small>
            </div>
            <div class="mcp-link">
              <ArrowRightIcon size={18} weight="bold" />
              <span>HTTPS</span>
            </div>
            <div class="mcp-node mcp-api">
              <GlobeHemisphereWestIcon size={22} weight="duotone" />
              <strong>Google TI</strong>
              <small>the real API</small>
            </div>
          </div>
          <p class="cv-note">
            Swap in a different MCP server and the harness talks to it the same way — that's the
            whole point. The agent gains new tools without a single line of vendor-specific code.
          </p>
        </details>

        <!-- C · Discovery & selection -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">C</span> Discovery &amp; tool selection<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            The server advertises many tools; the harness flags four as relevant, then picks one
            by the shape of your indicator — deterministic code, no model call in this lab.
          </p>
          <div class="sel-table">
            <div class="sel-row"><span class="sel-when">contains <code>://</code></span><ArrowRightIcon size={14} weight="bold" /><code class="sel-tool">get_url_report</code></div>
            <div class="sel-row"><span class="sel-when">an IPv4 address</span><ArrowRightIcon size={14} weight="bold" /><code class="sel-tool">get_ip_address_report</code></div>
            <div class="sel-row"><span class="sel-when">a domain name</span><ArrowRightIcon size={14} weight="bold" /><code class="sel-tool">get_domain_report</code></div>
            <div class="sel-row"><span class="sel-when">anything else</span><ArrowRightIcon size={14} weight="bold" /><code class="sel-tool">search_iocs</code></div>
          </div>
        </details>

        <!-- D · Four ideas -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">D</span> Four ideas worth understanding<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <div class="cv-cards">
            <article class="cv-card">
              <div class="cv-card-head"><PlugsConnectedIcon size={26} weight="duotone" /><h4>MCP is a universal adapter</h4></div>
              <p>Lab 04's tools were ours. These belong to Google. MCP lets any external tool server plug into the agent through one protocol — no bespoke integration per vendor.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><MagnifyingGlassIcon size={26} weight="duotone" /><h4>Tools are discovered at runtime</h4></div>
              <p><code>listTools()</code> asks the server what it offers, live. The harness doesn't hardcode the tool list — it adapts to whatever the server exposes.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><TerminalWindowIcon size={26} weight="duotone" /><h4>It runs as a separate process</h4></div>
              <p>The server is spawned as a subprocess and spoken to over stdio (JSON-RPC on stdin/stdout). It can be written in any language — here it's Python, launched with <code>uv</code>.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><ScalesIcon size={26} weight="duotone" /><h4>The indicator picks the tool</h4></div>
              <p>This lab is about the connection plumbing, so the tool is chosen by deterministic rules on the indicator's shape — not by the model. Later labs let the agent decide.</p>
            </article>
          </div>
        </details>

        <!-- E · File tree -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">E</span> Where each piece lives<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">The MCP client is one small framework file; the server is vendored alongside the app.</p>
          <pre class="cv-tree"><code><span class="tr-dir">antisyphon_workshop_12062026/</span>
│
├─ <span class="tr-dir">hunting-agent/src/</span>
│  ├─ <span class="tr-dir">routes/lab/05/api/mcp/</span>
│  │  └─ <span class="tr-file">+server.ts</span>          <span class="tr-cm">← endpoint; streams the lifecycle events</span>
│  └─ <span class="tr-dir">framework/</span>
│     └─ <span class="tr-file">mcp.ts</span>              <span class="tr-cm">← connect · listTools · selectGtiTool · callTool</span>
│
└─ <span class="tr-dir">mcp-security/</span>             <span class="tr-cm">← Google's GTI MCP server, vendored</span>
   └─ <span class="tr-dir">server/gti/</span>           <span class="tr-cm">← spawned as a subprocess (uv run server.py)</span></code></pre>
        </details>

        <!-- Callout -->
        <aside class="cv-callout">
          <PlugsConnectedIcon size={22} weight="duotone" />
          <p>
            <strong>Why bother with a protocol?</strong> Without MCP, every external tool would need
            its own custom integration inside the harness. With it, the agent speaks one language and
            any compliant server — threat intel today, something else tomorrow — just plugs in. That
            composability is what makes MCP a big deal for agents.
          </p>
        </aside>
      </div>
    </div>
  {/if}
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

  /* ═══ Tab bar ═══════════════════════════════════════════ */
  .tab-bar {
    display: flex;
    gap: 0;
    border-bottom: 1px solid #1a1a2e;
    margin-bottom: 1rem;
  }
  .tab-btn {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0.85rem 1.5rem;
    font-family: "JetBrains Mono", monospace;
    font-size: 1rem;
    color: #8a8a9a;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tab-btn:hover { color: #c0c0d0; }
  .tab-btn.active { color: #f5e663; border-bottom-color: #f5e663; }

  /* ═══ CODE VIEW (architectural reference) ══════════════ */
  .code-view { padding: 0.25rem 0 0; }
  .code-inner {
    max-width: 940px;
    margin: 0 auto;
    padding: 0.5rem 0.25rem 2rem;
    font-family: "JetBrains Mono", monospace;
  }
  .code-view code {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.86em;
    color: #f1fa8c;
    background: rgba(241, 250, 140, 0.07);
    border: 1px solid rgba(241, 250, 140, 0.12);
    border-radius: 3px;
    padding: 0.05em 0.35em;
    word-break: break-word;
  }
  .code-view strong { color: #e8e8f0; font-weight: 700; }
  .code-view em { color: #bd93f9; font-style: normal; }

  .cv-hero { animation: cvRise 0.5s ease both; }
  .cv-eyebrow {
    display: inline-block;
    color: #bd93f9;
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 0.6rem;
  }
  .cv-hero h2 {
    margin: 0;
    font-size: clamp(1.7rem, 4vw, 2.5rem);
    line-height: 1.05;
    color: #f5f5fa;
    font-weight: 700;
  }
  .cv-hero p {
    max-width: 64ch;
    margin: 1rem 0 0;
    color: #b6b6c6;
    font-size: 0.98rem;
    line-height: 1.75;
  }
  .cv-mental-model {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.4rem;
    padding: 0.7rem 1rem;
    border: 1px solid #1f1f33;
    border-radius: 8px;
    background: rgba(18, 18, 26, 0.7);
    color: #cfcfe0;
    font-size: 0.92rem;
  }
  .cv-mental-model :global(svg) { color: #8be9fd; flex-shrink: 0; }
  .cv-mm-sep { color: #50fa7b; font-size: 1.05rem; margin: 0 0.15rem; }

  .cv-section { margin-top: 1.8rem; }
  .cv-h3 {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    color: #f5f5fa;
    font-weight: 700;
  }
  summary.cv-h3 {
    cursor: pointer;
    list-style: none;
    user-select: none;
    padding: 0.2rem 0;
  }
  summary.cv-h3::-webkit-details-marker { display: none; }
  .cv-chev {
    margin-left: auto;
    color: #6f6f86;
    font-size: 0.85rem;
    transition: transform 0.2s ease, color 0.2s ease;
  }
  summary.cv-h3:hover .cv-chev { color: #bd93f9; }
  details[open] > summary .cv-chev { transform: rotate(90deg); }
  details.cv-section:not([open]) > summary.cv-h3 { margin-bottom: 0; }
  .cv-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 6px;
    background: rgba(189, 147, 249, 0.14);
    border: 1px solid rgba(189, 147, 249, 0.4);
    color: #bd93f9;
    font-size: 0.9rem;
    font-weight: 800;
  }
  .cv-lead {
    max-width: 64ch;
    margin: 0 0 1.4rem;
    color: #9a9aaa;
    font-size: 0.94rem;
    line-height: 1.7;
  }

  /* Vertical flow */
  .flow { list-style: none; margin: 0; padding: 0.4rem 0 0; }
  .flow-step {
    position: relative;
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 1.1rem;
    padding-bottom: 1.5rem;
    opacity: 0;
    animation: cvRise 0.55s ease forwards;
    animation-delay: var(--d, 0ms);
  }
  .flow-step:last-child { padding-bottom: 0; }
  .flow-step::before {
    content: "";
    position: absolute;
    left: 21px;
    top: 48px;
    bottom: -2px;
    width: 2px;
    background: linear-gradient(180deg, #bd93f9, #50fa7b);
    background-size: 100% 220%;
    opacity: 0.45;
    animation: cvFlow 2.4s linear infinite;
  }
  .flow-step:last-child::before { display: none; }
  .flow-rail {
    position: relative;
    z-index: 1;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #12121a;
    border: 1px solid rgba(189, 147, 249, 0.45);
    color: #bd93f9;
    box-shadow: 0 0 0 4px #0a0a0f;
  }
  .flow-body {
    border: 1px solid #1c1c30;
    border-radius: 8px;
    background: rgba(18, 18, 26, 0.6);
    padding: 0.85rem 1.05rem;
    transition: border-color 0.2s, transform 0.2s;
  }
  .flow-body:hover { border-color: #2e2e4e; transform: translateX(2px); }
  .flow-top {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.4rem 0.7rem;
    margin-bottom: 0.35rem;
  }
  .flow-title { color: #e8e8f0; font-weight: 700; font-size: 1rem; }
  .flow-where {
    color: #6f6f86;
    font-size: 0.76rem;
    letter-spacing: 0.03em;
    margin-left: auto;
  }
  .flow-badge {
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #f5e663;
    border: 1px solid rgba(245, 230, 99, 0.5);
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
  }
  .flow-body p {
    margin: 0;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.65;
  }

  /* MCP diagram */
  .mcp-diagram {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 0.6rem;
    border: 1px solid #1c1c30;
    border-radius: 10px;
    background: rgba(18, 18, 26, 0.6);
    padding: 1.1rem 1.2rem;
  }
  .mcp-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    flex: 1;
    min-width: 110px;
    text-align: center;
    border: 1px solid #2a2a40;
    border-radius: 8px;
    background: #0d0d14;
    padding: 0.7rem 0.6rem;
  }
  .mcp-node strong { color: #e8e8f0; font-size: 0.88rem; }
  .mcp-node small { color: #7d7d92; font-size: 0.72rem; }
  .mcp-client :global(svg) { color: #bd93f9; }
  .mcp-server :global(svg) { color: #8be9fd; }
  .mcp-api :global(svg) { color: #50fa7b; }
  .mcp-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    color: #6f6f86;
    font-size: 0.68rem;
    min-width: 70px;
  }
  .mcp-link :global(svg) { color: #f5e663; }
  .cv-note {
    margin: 1rem 0 0;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.7;
  }

  /* Selection table */
  .sel-table { display: flex; flex-direction: column; gap: 0.45rem; }
  .sel-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.6rem;
    border: 1px solid #1c1c30;
    border-radius: 8px;
    background: rgba(18, 18, 26, 0.6);
    padding: 0.55rem 0.85rem;
  }
  .sel-row :global(svg) { color: #6f6f86; }
  .sel-when { color: #c2c2d2; font-size: 0.88rem; min-width: 9rem; }
  .code-view code.sel-tool { color: #50fa7b; }

  /* Concept cards */
  .cv-cards { display: flex; flex-direction: column; gap: 1rem; }
  .cv-card {
    border: 1px solid #1c1c30;
    border-radius: 10px;
    background: rgba(18, 18, 26, 0.6);
    padding: 1.1rem 1.2rem 1.25rem;
    transition: border-color 0.2s, transform 0.2s;
  }
  .cv-card:hover { border-color: #33335a; transform: translateY(-2px); }
  .cv-card-head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.6rem;
    color: #bd93f9;
  }
  .cv-card-head h4 {
    margin: 0;
    font-size: 1.02rem;
    color: #f0f0f6;
    font-weight: 700;
  }
  .cv-card p {
    margin: 0;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.65;
  }

  .cv-tree {
    margin: 0;
    padding: 1rem 1.15rem;
    background: #0d0d14;
    border: 1px solid #1a1a2e;
    border-radius: 9px;
    overflow-x: auto;
    color: #5f6075;
    font-size: 0.82rem;
    line-height: 1.7;
  }
  .cv-tree code {
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }
  .cv-tree .tr-dir { color: #8be9fd; }
  .cv-tree .tr-file { color: #f1fa8c; }
  .cv-tree .tr-cm { color: #6f6f86; }

  .cv-callout {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    margin-top: 1.8rem;
    padding: 1rem 1.15rem;
    border: 1px solid rgba(189, 147, 249, 0.28);
    border-left: 3px solid #bd93f9;
    border-radius: 8px;
    background: rgba(189, 147, 249, 0.06);
  }
  .cv-callout :global(svg) { color: #bd93f9; flex-shrink: 0; margin-top: 2px; }
  .cv-callout p {
    margin: 0;
    color: #c2c2d2;
    font-size: 0.92rem;
    line-height: 1.7;
  }

  @keyframes cvRise {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes cvFlow {
    from { background-position: 0 0; }
    to { background-position: 0 -220%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .flow-step,
    .cv-hero { animation: none; opacity: 1; }
    .flow-step::before { animation: none; }
  }
</style>
