<script lang="ts">
  import { onMount } from "svelte";
  import { parseMarkdown, renderInline, type MarkdownBlock } from "$lib/markdown.js";

  type SkillMetadata = {
    name: string;
    version?: string;
    layer?: "detection" | "assessment" | string;
    model?: string;
    description?: string;
    invocationTriggerCandidate?: string;
    invocationGate?: Record<string, unknown>;
    correlatingCandidates?: Array<{ type?: string; scope?: string }>;
    mitreTechniques?: string[];
    [key: string]: unknown;
  };

  type CandidateRef = {
    type: string;
    role: "trigger" | "correlating";
    scope?: string;
    scopeDescription?: string;
    description: string;
    fields: string[];
    scoreNote?: string;
  };

  type SkillSummary = {
    path: string;
    metadata: SkillMetadata;
    frontmatter: string;
    bodyPreview: string;
    body: string;
    candidateReference?: CandidateRef[];
  };

  type CompactCandidate = {
    id: string;
    type: string;
    host: string;
    srcIp: string;
    destIp: string;
    destPort: number | string;
    processName: string;
    processGuid: string;
    score: number;
    lots: string;
    eventIds: string[];
  };

  type TraceStep = {
    step: number;
    phase: "discover" | "inspect" | "query" | "bundle" | "execute";
    title: string;
    status: "ok" | "warning";
    detail: string;
    result: string;
  };

  type EvidenceBundle = {
    trigger: CompactCandidate;
    related: CompactCandidate[];
    querySummary: Record<string, number>;
  };

  type LabPayload = {
    skills: SkillSummary[];
    candidateStats: {
      total: number;
      byType: Record<string, number>;
      topCandidates: CompactCandidate[];
    };
  };

  // NDJSON event contract emitted by the POST endpoint, one object per line.
  type StreamEvent =
    | { type: "skill"; skill: SkillSummary }
    | { type: "trace"; step: TraceStep }
    | { type: "evidence"; evidenceBundle: EvidenceBundle }
    | { type: "prompt"; systemPrompt: string; userPrompt: string }
    | { type: "model-start"; message: string }
    | { type: "token"; value: string }
    | { type: "finding"; text: string; model: string; usage: Record<string, unknown> | null }
    | { type: "done" }
    | { type: "error"; message: string };

  let skills = $state<SkillSummary[]>([]);
  let candidateStats = $state<LabPayload["candidateStats"] | null>(null);
  let detectionSkillPath = $state("");
  let loading = $state(true);
  let busy = $state(false);
  let error = $state("");

  // Streaming execution state. Each field is populated by a distinct NDJSON event.
  let executedSkill = $state<SkillSummary | null>(null);
  let traceSteps = $state<TraceStep[]>([]);
  let evidenceBundle = $state<EvidenceBundle | null>(null);
  let systemPrompt = $state("");
  let userPrompt = $state("");
  let modelStreaming = $state(false);
  let findingText = $state("");
  let findingModel = $state("");
  let findingUsage = $state<Record<string, unknown> | null>(null);

  // Active tab within the glass cards that hold more than one peer view.
  let skillTab = $state<"frontmatter" | "procedure" | "reference">("frontmatter");
  let promptTab = $state<"system" | "user">("system");

  const hasExecution = $derived(Boolean(executedSkill));
  const findingBlocks = $derived(findingText ? parseMarkdown(findingText) : []);

  const LAB05_HANDOFF_KEY = "antisiphon.lab05.detectionFinding";

  const detectionSkills = $derived(skills.filter((skill) => skill.metadata.layer === "detection"));
  const selectedDetectionSkill = $derived(
    detectionSkills.find((skill) => skill.path === detectionSkillPath) ?? null,
  );

  onMount(async () => {
    await loadCatalog();
  });

  async function loadCatalog() {
    loading = true;
    error = "";

    try {
      const response = await fetch("/lab/06/api/skills");
      if (!response.ok) throw new Error(`Skill API returned HTTP ${response.status}`);
      const payload = (await response.json()) as LabPayload;
      skills = payload.skills;
      candidateStats = payload.candidateStats;
      detectionSkillPath = "";
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load skill catalog";
    } finally {
      loading = false;
    }
  }

  function resetExecutionState() {
    executedSkill = null;
    traceSteps = [];
    evidenceBundle = null;
    systemPrompt = "";
    userPrompt = "";
    modelStreaming = false;
    findingText = "";
    findingModel = "";
    findingUsage = null;
  }

  function applyStreamEvent(event: StreamEvent) {
    switch (event.type) {
      case "skill":
        executedSkill = event.skill;
        break;
      case "trace":
        traceSteps = [...traceSteps, event.step];
        break;
      case "evidence":
        evidenceBundle = event.evidenceBundle;
        break;
      case "prompt":
        systemPrompt = event.systemPrompt;
        userPrompt = event.userPrompt;
        break;
      case "model-start":
        modelStreaming = true;
        break;
      case "token":
        findingText += event.value;
        break;
      case "finding":
        findingText = event.text;
        findingModel = event.model;
        findingUsage = event.usage;
        break;
      case "done":
        modelStreaming = false;
        break;
      case "error":
        modelStreaming = false;
        error = event.message;
        break;
    }
  }

  async function executeDetection() {
    if (!selectedDetectionSkill || busy) return;
    busy = true;
    error = "";
    resetExecutionState();

    try {
      const response = await fetch("/lab/06/api/skills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skillPath: selectedDetectionSkill.path }),
      });

      if (!response.ok) throw new Error(`Execution API returned HTTP ${response.status}`);
      if (!response.body) throw new Error("Execution API returned an empty stream.");

      // Read the NDJSON stream: split on newlines, parse each complete line, keep
      // a buffer for the trailing partial line until more bytes arrive.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (line) applyStreamEvent(JSON.parse(line) as StreamEvent);
          newlineIndex = buffer.indexOf("\n");
        }
      }

      const tail = buffer.trim();
      if (tail) applyStreamEvent(JSON.parse(tail) as StreamEvent);

      persistDetectionFinding();
    } catch (err) {
      error = err instanceof Error ? err.message : "Detection execution failed";
    } finally {
      modelStreaming = false;
      busy = false;
    }
  }

  // The streamed POST returns free-text Markdown, but the assessment lab (Lab 07) reads a
  // STRUCTURED DetectionFinding object from this handoff key. We synthesize that object from
  // the executed skill + deterministic evidence bundle so Lab 07 keeps working, and carry the
  // raw model Markdown alongside it for display.
  function persistDetectionFinding() {
    if (typeof localStorage === "undefined") return;
    if (!executedSkill || !evidenceBundle) return;
    if (!findingText.trim()) return;

    const trigger = evidenceBundle.trigger;
    const finding = {
      kind: "DetectionFinding",
      verdict: "Produced",
      skill: executedSkill.metadata.name,
      compositeScore: trigger.score,
      triggerCandidate: {
        id: trigger.id,
        type: trigger.type,
        host: trigger.host,
        destIp: trigger.destIp,
        processName: trigger.processName,
        score: trigger.score,
      },
      candidateId: trigger.id,
      evidenceRefs: {
        relatedCandidateIds: evidenceBundle.related.map((candidate) => candidate.id),
        eventIds: trigger.eventIds,
      },
      findingText,
      model: findingModel,
    };

    localStorage.setItem(
      LAB05_HANDOFF_KEY,
      JSON.stringify({
        version: 1,
        source: "lab05",
        generatedAt: new Date().toISOString(),
        execution: {
          skill: executedSkill,
          finding,
        },
        finding,
      }),
    );
  }

  function json(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  function typeLabel(type: string): string {
    return type.replaceAll("_", " ");
  }

</script>

<svelte:head><title>Lab 06 | Detection Skills</title></svelte:head>

<main>
  <header class="hero">
    <h1>Lab 06: Detection Skill Discovery + Execution</h1>
  </header>

  {#if error}
    <section class="error-panel">{error}</section>
  {/if}

  <section class="flow-grid" aria-label="Lab 06 detection workflow">
    <section class="flow-card skill-stage detection">
      <div class="flow-header">
        <span>01</span>
        <h2>Detection Skill</h2>
      </div>

      <section class="picker">
        <h3>Detection Skills</h3>
        {#if loading}
          <p class="empty">Loading catalog.</p>
        {:else}
          <div class="skill-list horizontal">
            {#each detectionSkills as skill}
              <button
                class="skill-card"
                class:active={detectionSkillPath === skill.path}
                onclick={() => {
                  detectionSkillPath = skill.path;
                  resetExecutionState();
                }}
              >
                <strong>{skill.metadata.name}</strong>
                <span>{skill.metadata.invocationTriggerCandidate ?? "candidate"}</span>
              </button>
            {/each}
          </div>
        {/if}
      </section>

      {#if selectedDetectionSkill}
        {@render SkillContract({ skill: selectedDetectionSkill })}
      {/if}

      <div class="stage-actions">
        <button onclick={executeDetection} disabled={!selectedDetectionSkill || busy}>
          {busy ? "Running Detection" : "Run Detection Skill"}
        </button>
      </div>
    </section>

    <section class="flow-card prompt-stage">
      <div class="flow-header">
        <span>02</span>
        <h2>Model Prompts</h2>
      </div>

      {#if systemPrompt || userPrompt}
        {@render PromptView()}
      {:else}
        <p class="empty">Run a detection skill to see how it parsed into the system and user prompts.</p>
      {/if}
    </section>

    <section class="flow-card finding-step" class:ready={Boolean(findingText) && !modelStreaming}>
      <div class="flow-header">
        <span>03</span>
        <h2>DetectionFinding</h2>
      </div>

      {#if hasExecution}
        {@render FindingStream()}
      {:else}
        <p class="empty">Run a detection skill to produce this finding.</p>
      {/if}
    </section>
  </section>

  <section class="utility-grid">
    <details class="panel">
      <summary>
        <span>Execution Detail</span>
        <small>{traceSteps.length ? `${traceSteps.length} trace steps` : "no trace yet"}</small>
      </summary>

      {#if hasExecution}
        {@render TraceView({ trace: traceSteps })}
        {#if evidenceBundle}
          {@render EvidenceView({ bundle: evidenceBundle })}
        {/if}
      {:else}
        <p class="empty">Run the detection stage to populate the trace and evidence bundle.</p>
      {/if}
    </details>

    <details class="panel">
      <summary>
        <span>Candidate Inputs</span>
        <small>{candidateStats?.total ?? 0} candidates</small>
      </summary>

      <div class="context-grid">
        <article>
          <h3>Candidate Types</h3>
          <div class="stat-list">
            {#each Object.entries(candidateStats?.byType ?? {}) as [type, count]}
              <span><strong>{typeLabel(type)}</strong><em>{count}</em></span>
            {/each}
          </div>
        </article>

        <article>
          <h3>Top Inputs</h3>
          <div class="mini-candidates">
            {#each candidateStats?.topCandidates ?? [] as candidate}
              <span>{candidate.id} | {candidate.type} | score {candidate.score}</span>
            {/each}
          </div>
        </article>
      </div>
    </details>
  </section>
</main>

{#snippet SkillContract({ skill }: { skill: SkillSummary })}
  <section class="contract">
    <div class="tab-bar" role="tablist" aria-label="Skill detail views">
      <button class="tab" class:active={skillTab === "frontmatter"} role="tab" aria-selected={skillTab === "frontmatter"} onclick={() => (skillTab = "frontmatter")}>
        YAML Frontmatter
      </button>
      <button class="tab" class:active={skillTab === "procedure"} role="tab" aria-selected={skillTab === "procedure"} onclick={() => (skillTab = "procedure")}>
        Procedure
      </button>
      <button class="tab" class:active={skillTab === "reference"} role="tab" aria-selected={skillTab === "reference"} onclick={() => (skillTab = "reference")}>
        Reference
      </button>
    </div>

    {#if skillTab === "frontmatter"}
      <div class="tab-panel">
        <p class="tab-note">{skill.path}</p>
        <pre class="yaml-block">---
{skill.frontmatter}
---</pre>
      </div>
    {:else if skillTab === "procedure"}
      <div class="tab-panel">
        <div class="markdown-body">
          {@render MarkdownView({ blocks: parseMarkdown(skill.body) })}
        </div>
      </div>
    {:else}
      <div class="tab-panel">
        {@render ReferenceView({ refs: skill.candidateReference ?? [] })}
      </div>
    {/if}
  </section>
{/snippet}

{#snippet ReferenceView({ refs }: { refs: CandidateRef[] })}
  {#if refs.length === 0}
    <p class="empty">This skill declares no candidate types.</p>
  {:else}
    <p class="tab-note">The candidate types this skill reads — its trigger plus the correlating evidence it fuses. Scores are illustrative values from the curated workshop dataset (not computed by a live engine here); the full dimension-by-dimension math is worked through for the beacon example in Lab 02.</p>
    <div class="ref-list">
      {#each refs as ref}
        <article class="candidate-ref" class:trigger={ref.role === "trigger"}>
          <div class="ref-head">
            <strong>{ref.type}</strong>
            <span class="ref-role">{ref.role === "trigger" ? "trigger" : `correlating · ${ref.scope ?? "any"}`}</span>
          </div>
          <p>{@html renderInline(ref.description)}</p>
          {#if ref.scopeDescription}
            <p class="ref-meta"><em>scope</em> {ref.scopeDescription}</p>
          {/if}
          {#if ref.fields.length}
            <div class="ref-fields">
              {#each ref.fields as field}
                <code>{field}</code>
              {/each}
            </div>
          {/if}
          {#if ref.scoreNote}
            <p class="ref-meta"><em>score</em> {@html renderInline(ref.scoreNote)}</p>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet MarkdownView({ blocks }: { blocks: MarkdownBlock[] })}
  {#each blocks as block}
    {#if block.kind === "heading"}
      <h4 class:major={block.level <= 2}>{@html renderInline(block.text)}</h4>
    {:else if block.kind === "paragraph"}
      <p>{@html renderInline(block.text)}</p>
    {:else if block.kind === "list"}
      <ul>
        {#each block.items as item}
          <li>{@html renderInline(item)}</li>
        {/each}
      </ul>
    {:else if block.kind === "code"}
      <pre class="code-block"><code>{block.text}</code></pre>
    {:else if block.kind === "table"}
      <table>
        <thead>
          <tr>
            {#each block.headers as header}
              <th>{@html renderInline(header)}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each block.rows as row}
            <tr>
              {#each row as cell}
                <td>{@html renderInline(cell)}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  {/each}
{/snippet}

{#snippet FindingStream()}
  <article class="finding-summary">
    <div class="finding-head">
      <span>DetectionFinding</span>
      <div class="finding-badges">
        {#if findingModel}
          <span class="model-badge">model: {findingModel}</span>
        {/if}
        {#if modelStreaming}
          <span class="streaming-badge">streaming.</span>
        {/if}
      </div>
    </div>

    <p class="real-call-note">
      The skill procedure is the system prompt; the evidence bundle is the user prompt. The model
      reads them and writes the finding below.
    </p>

    {#if findingText}
      <div class="markdown-body finding-markdown">
        {@render MarkdownView({ blocks: findingBlocks })}
      </div>
    {:else if modelStreaming}
      <p class="empty">Waiting for the first tokens from the model.</p>
    {:else}
      <p class="empty">No finding text yet.</p>
    {/if}

    {#if findingUsage}
      <details>
        <summary>Token usage</summary>
        <pre>{json(findingUsage)}</pre>
      </details>
    {/if}
  </article>
{/snippet}

{#snippet PromptView()}
  <p class="prompt-caption">
    How the loaded skill was parsed and assembled into the two prompts sent to the model.
  </p>
  <div class="tab-bar" role="tablist" aria-label="Prompt views">
    <button class="tab" class:active={promptTab === "system"} role="tab" aria-selected={promptTab === "system"} onclick={() => (promptTab = "system")}>
      System prompt
    </button>
    <button class="tab" class:active={promptTab === "user"} role="tab" aria-selected={promptTab === "user"} onclick={() => (promptTab = "user")}>
      User prompt
    </button>
  </div>
  {#if promptTab === "system"}
    <div class="tab-panel">
      <p class="tab-note">the wrapped skill procedure</p>
      <pre>{systemPrompt}</pre>
    </div>
  {:else}
    <div class="tab-panel">
      <p class="tab-note">output instructions + evidence bundle</p>
      <pre>{userPrompt}</pre>
    </div>
  {/if}
{/snippet}

{#snippet TraceView({ trace }: { trace: TraceStep[] })}
  <div class="trace">
    {#each trace as step}
      <article class:warning={step.status === "warning"}>
        <span>{step.step}</span>
        <div>
          <strong>{step.title}</strong>
          <p>{step.detail}</p>
          <code>{step.result}</code>
        </div>
      </article>
    {/each}
  </div>
{/snippet}

{#snippet EvidenceView({ bundle }: { bundle: EvidenceBundle })}
  <div class="evidence">
    <article class="candidate trigger">
      <span>trigger</span>
      <strong>{bundle.trigger.id}</strong>
      <p>
        {typeLabel(bundle.trigger.type)} | {bundle.trigger.host} |
        {bundle.trigger.destIp}
      </p>
      <small>
        {bundle.trigger.processName} | score {bundle.trigger.score} | LOTS
        {bundle.trigger.lots}
      </small>
    </article>

    <div class="candidate-list">
      {#each bundle.related as candidate}
        <article class="candidate">
          <span>{typeLabel(candidate.type)}</span>
          <strong>{candidate.id}</strong>
          <p>{candidate.host} | {candidate.destIp || candidate.srcIp || "no network observable"}</p>
          <small>{candidate.processName} | score {candidate.score} | {candidate.eventIds.length} event refs</small>
        </article>
      {/each}
    </div>

    <div class="query-summary">
      <h4>Query summary</h4>
      <div class="stat-list">
        {#each Object.entries(bundle.querySummary) as [type, count]}
          <span><strong>{typeLabel(type)}</strong><em>{count}</em></span>
        {/each}
      </div>
    </div>
  </div>
{/snippet}

<style>
  main {
    width: min(1500px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }

  .hero { margin-bottom: 1rem; }

  h1, h2, h3, h4, p { margin: 0; }

  h1 {
    color: var(--dracula-cyan);
    font-size: clamp(2rem, 4vw, 3.4rem);
    line-height: 1;
  }

  h2 {
    color: var(--dracula-pink);
    font-size: 1.25rem;
  }

  h3, h4, .flow-header span, summary, .skill-card, button {
    font-family: var(--font-heading);
    font-weight: 800;
  }

  h3, h4 {
    color: var(--dracula-purple);
    text-transform: uppercase;
  }

  h3 { font-size: .82rem; }
  h4 { font-size: .9rem; }

  p, .empty, small, td, .candidate small {
    color: var(--dracula-muted);
    line-height: 1.5;
  }

  .flow-grid, .contract, .utility-grid, .context-grid, .skill-list, .trace, .candidate-list, .stat-list, .mini-candidates {
    display: grid;
    gap: .85rem;
  }

  .flow-card, .panel, .picker, .candidate, .trace article, .context-grid article {
    min-width: 0;
    border: 1px solid rgba(98, 114, 164, 0.62);
    border-radius: 8px;
    background: rgba(33, 34, 44, 0.82);
  }

  .flow-card, .panel {
    padding: 1rem;
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22);
  }

  .flow-card.detection { border-color: rgba(245, 230, 99, 0.72); }
  .finding-step { border-color: rgba(245, 230, 99, 0.62); background: rgba(245, 230, 99, 0.06); }
  .finding-step.ready { border-color: rgba(80, 250, 123, .68); background: rgba(80, 250, 123, 0.07); }

  .flow-header {
    display: flex;
    gap: .75rem;
    align-items: baseline;
    margin-bottom: .9rem;
  }

  .flow-header span {
    color: var(--dracula-comment);
    font-size: .9rem;
  }

  .picker {
    padding: .85rem;
    background: rgba(25, 26, 33, 0.38);
  }

  .skill-list { margin-top: .65rem; }
  .skill-list.horizontal { grid-template-columns: repeat(4, minmax(0, 1fr)); }

  .skill-card {
    width: 100%;
    min-height: 5.25rem;
    display: grid;
    align-content: start;
    gap: .45rem;
    padding: .75rem;
    text-align: left;
    background: rgba(25, 26, 33, 0.7);
    overflow: hidden;
  }

  .skill-card.active {
    border-color: rgba(245, 230, 99, 0.78);
    background: rgba(245, 230, 99, 0.09);
  }

  .skill-card strong {
    color: var(--dracula-fg);
    font-size: clamp(.86rem, 1.4vw, 1rem);
    line-height: 1.15;
    overflow-wrap: anywhere;
  }

  .skill-card span {
    color: var(--dracula-muted);
    font-size: .78rem;
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }

  .contract { margin-top: .85rem; }
  .tab-bar { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .65rem; border-bottom: 1px solid rgba(98, 114, 164, .4); padding-bottom: .55rem; }
  .tab-bar .tab { border: 1px solid rgba(98, 114, 164, .5); border-radius: 7px; padding: .4rem .8rem; background: rgba(25, 26, 33, .6); color: var(--dracula-muted); font-size: .8rem; cursor: pointer; }
  .tab-bar .tab.active { border-color: rgba(189, 147, 249, .8); background: rgba(189, 147, 249, .12); color: var(--dracula-fg); }
  .tab-panel { margin-top: .85rem; }
  .tab-note { margin: 0 0 .5rem; font-size: .76rem; color: var(--dracula-comment); font-family: var(--font-heading); overflow-wrap: anywhere; }
  .ref-list { display: grid; gap: .7rem; }
  .candidate-ref { border: 1px solid rgba(98, 114, 164, .5); border-radius: 8px; padding: .8rem; background: rgba(25, 26, 33, .46); display: grid; gap: .4rem; }
  .candidate-ref.trigger { border-color: rgba(245, 230, 99, .6); background: rgba(245, 230, 99, .06); }
  .ref-head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
  .ref-head strong { color: var(--dracula-cyan); font-family: var(--font-heading); font-size: 1rem; }
  .ref-role { color: var(--dracula-purple); font-family: var(--font-heading); font-weight: 800; font-size: .72rem; text-transform: uppercase; }
  .ref-meta { font-size: .82rem; }
  .ref-meta em { color: var(--dracula-yellow); font-style: normal; font-family: var(--font-heading); margin-right: .35rem; }
  .ref-fields { display: flex; flex-wrap: wrap; gap: .35rem; }
  .ref-fields code { background: rgba(25, 26, 33, .8); border: 1px solid rgba(98, 114, 164, .4); border-radius: 5px; padding: .12rem .4rem; color: var(--dracula-green); font-size: .76rem; }
  .candidate-ref p :global(code) { background: rgba(25, 26, 33, .8); border: 1px solid rgba(98, 114, 164, .35); border-radius: 5px; padding: .03rem .3rem; color: var(--dracula-green); font-size: .85em; }
  .candidate-ref p :global(strong) { color: var(--dracula-fg); font-weight: 800; }

  summary {
    cursor: pointer;
    color: var(--dracula-cyan);
  }

  summary span { color: var(--dracula-cyan); }

  summary small {
    float: right;
    max-width: 52%;
    color: var(--dracula-comment);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .markdown-body {
    display: grid;
    gap: .75rem;
    margin-top: .85rem;
  }

  .markdown-body h4 {
    color: var(--dracula-cyan);
    font-size: .98rem;
    text-transform: none;
  }

  .markdown-body h4.major {
    color: var(--dracula-pink);
    font-size: 1.05rem;
  }

  .markdown-body :global(strong) { color: var(--dracula-fg); font-weight: 800; }
  .markdown-body :global(em) { color: var(--dracula-fg); font-style: italic; }
  .markdown-body :global(code) {
    background: rgba(25, 26, 33, .8);
    border: 1px solid rgba(98, 114, 164, .4);
    border-radius: 5px;
    padding: .05rem .35rem;
    color: var(--dracula-green);
    font-size: .86em;
  }
  .code-block {
    margin: 0;
    border: 1px solid rgba(98, 114, 164, .5);
    border-radius: 8px;
    background: rgba(25, 26, 33, .82);
    padding: .75rem .85rem;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .code-block code { color: var(--dracula-green); font-size: .82rem; line-height: 1.5; }

  ul {
    display: grid;
    gap: .4rem;
    margin: 0;
    padding-left: 1.1rem;
  }

  li { color: var(--dracula-muted); }

  table {
    width: 100%;
    border-collapse: collapse;
    overflow: hidden;
    border: 1px solid rgba(98, 114, 164, .45);
    border-radius: 8px;
  }

  th, td {
    border-bottom: 1px solid rgba(98, 114, 164, .38);
    padding: .55rem;
    text-align: left;
    vertical-align: top;
  }

  tr:last-child td { border-bottom: 0; }

  th {
    display: block;
    margin-bottom: .25rem;
    color: var(--dracula-purple);
    font-family: var(--font-heading);
    font-size: .72rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .stage-actions { margin-top: .85rem; }
  button { min-height: 2.35rem; padding: .35rem .85rem; }

  .finding-summary { display: grid; gap: .85rem; }

  .finding-summary span, .candidate span {
    color: var(--dracula-comment);
    font-family: var(--font-heading);
    font-weight: 800;
    text-transform: uppercase;
  }

  .finding-head {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .finding-badges { display: flex; gap: .5rem; flex-wrap: wrap; }

  .model-badge, .streaming-badge {
    border: 1px solid rgba(98, 114, 164, .55);
    border-radius: 999px;
    padding: .15rem .6rem;
    font-family: var(--font-heading);
    font-size: .72rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .model-badge { color: var(--dracula-cyan); border-color: rgba(139, 233, 253, .5); }

  .streaming-badge {
    color: var(--dracula-yellow);
    border-color: rgba(245, 230, 99, .55);
    background: rgba(245, 230, 99, .08);
  }

  .real-call-note {
    border-left: 3px solid rgba(139, 233, 253, .6);
    padding-left: .65rem;
    font-size: .82rem;
  }

  .finding-markdown { margin-top: 0; }

  .tab-panel pre { margin: 0; max-height: 360px; overflow: auto; white-space: pre-wrap; word-break: break-word; font-size: .76rem; line-height: 1.45; }
  .prompt-caption { margin: 0 0 .3rem; font-size: .82rem; color: rgba(248, 248, 242, .62); }
  .query-summary { margin-top: .85rem; }

  .stat-list span, .mini-candidates span {
    min-width: 0;
    border: 1px solid rgba(98, 114, 164, 0.45);
    border-radius: 8px;
    background: rgba(25, 26, 33, 0.55);
    padding: .65rem;
  }
  .utility-grid { margin-top: 1rem; }

  .panel > summary {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .trace article {
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr);
    gap: .85rem;
    padding: .85rem;
    background: rgba(25, 26, 33, 0.48);
  }

  .trace article.warning { border-color: rgba(245, 230, 99, .64); }

  .trace article > span {
    width: 2rem;
    height: 2rem;
    display: inline-grid;
    place-items: center;
    border-radius: 999px;
    background: rgba(80, 250, 123, 0.12);
    color: var(--dracula-green);
    font-family: var(--font-heading);
    font-weight: 800;
  }

  .trace strong, .candidate strong, .stat-list strong {
    color: var(--dracula-cyan);
    overflow-wrap: anywhere;
  }

  .trace code {
    display: block;
    color: var(--dracula-yellow);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .evidence { margin-top: .85rem; }
  .candidate { display: grid; gap: .3rem; padding: .75rem; }
  .candidate.trigger { margin-bottom: .75rem; border-color: rgba(80, 250, 123, .65); background: rgba(80, 250, 123, .08); }
  .candidate span { color: var(--dracula-purple); font-size: .72rem; }

  .context-grid {
    grid-template-columns: .75fr 1fr;
    margin-top: .85rem;
  }

  .context-grid article { padding: .85rem; background: rgba(25, 26, 33, .48); }
  .stat-list, .mini-candidates { margin-top: .65rem; }
  .stat-list span { display: flex; justify-content: space-between; gap: 1rem; }
  .stat-list em { color: var(--dracula-green); font-style: normal; overflow-wrap: anywhere; }
  .mini-candidates span { color: var(--dracula-muted); font-family: var(--font-heading); font-size: .85rem; }

  pre {
    max-height: 28rem;
    overflow: auto;
    margin: .75rem 0 0;
    border: 1px solid rgba(98, 114, 164, 0.5);
    border-radius: 8px;
    background: rgba(25, 26, 33, 0.82);
    color: var(--dracula-fg);
    padding: .85rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .empty {
    border: 1px dashed rgba(98, 114, 164, .55);
    border-radius: 8px;
    padding: .85rem;
  }

  .error-panel {
    margin-bottom: 1rem;
    border: 1px solid rgba(255, 85, 85, 0.65);
    border-radius: 8px;
    background: rgba(255, 85, 85, 0.1);
    color: var(--dracula-red);
    padding: 1rem;
  }

  @media (max-width: 1150px) {
    .skill-list.horizontal { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .context-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 720px) {
    main { width: min(100% - 1rem, 1500px); padding-top: 1rem; }
    .skill-list.horizontal { grid-template-columns: 1fr; }
    summary small { float: none; display: block; max-width: 100%; margin-top: .25rem; }
  }
</style>
