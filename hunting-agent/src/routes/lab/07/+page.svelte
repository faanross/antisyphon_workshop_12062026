<script lang="ts">
  import { onMount } from "svelte";
  import { parseMarkdown, renderInline, type MarkdownBlock } from "$lib/markdown.js";

  type ContextRequirement = {
    id: string;
    mode: string;
    path: string;
    reason: string;
  };

  type ResolvedContext = ContextRequirement & {
    content: string;
    approxTokens: number;
  };

  type SkillMetadata = {
    name: string;
    version?: string;
    layer?: "detection" | "assessment" | string;
    description?: string;
    inputs?: string[];
    contextRequirements?: ContextRequirement[];
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
    bodyPreview?: string;
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
    phase: "discover" | "inspect" | "context" | "query" | "execute";
    title: string;
    detail: string;
    result: string;
    status: "ok" | "warning";
  };

  type ContextBundle = {
    schema: ResolvedContext;
    requirements: ResolvedContext[];
  };

  type EvidenceRawEvent = {
    id?: string;
    type?: string;
    host?: string;
    timestamp?: string;
    summary?: string;
  };

  type EvidenceBundle = {
    trigger: CompactCandidate;
    related: CompactCandidate[];
    candidates: CompactCandidate[];
    rawEvents: EvidenceRawEvent[];
    rawEventCount: number;
  };

  type DetectionExecution = {
    skill: SkillSummary;
    finding: Record<string, unknown>;
  };

  type DetectionHandoff = {
    version: number;
    source: "lab05" | "lab06-fallback";
    generatedAt: string;
    execution: DetectionExecution;
    finding: Record<string, unknown>;
  };

  type LabPayload = {
    skills: SkillSummary[];
    schemaContext: ResolvedContext;
  };

  // NDJSON event contract emitted by the POST endpoint, one object per line.
  type StreamEvent =
    | { type: "skill"; skill: SkillSummary }
    | { type: "trace"; step: TraceStep }
    | { type: "context"; contextBundle: ContextBundle }
    | { type: "evidence"; evidenceBundle: EvidenceBundle }
    | { type: "prompt"; systemPrompt: string; userPrompt: string }
    | { type: "model-start"; message: string }
    | { type: "token"; value: string }
    | {
        type: "finding";
        text: string;
        model: string;
        usage: Record<string, unknown> | null;
        assessmentType: string;
        skill: string;
      }
    | { type: "done" }
    | { type: "error"; message: string };

  // NDJSON event contract emitted by the upstream Lab 06 detection POST endpoint. We only
  // consume the subset needed to synthesize the structured DetectionFinding handoff.
  type DetectionStreamEvent =
    | { type: "skill"; skill: SkillSummary }
    | { type: "trace"; step: TraceStep }
    | { type: "evidence"; evidenceBundle: { trigger: CompactCandidate; related: CompactCandidate[]; querySummary: Record<string, number> } }
    | { type: "prompt"; systemPrompt: string; userPrompt: string }
    | { type: "model-start"; message: string }
    | { type: "token"; value: string }
    | { type: "finding"; text: string; model: string; usage: Record<string, unknown> | null }
    | { type: "done" }
    | { type: "error"; message: string };


  const LAB05_HANDOFF_KEY = "antisiphon.lab05.detectionFinding";
  const FALLBACK_DETECTION_SKILL = "skills/detection/hunt-c2-over-https.md";

  let skills = $state<SkillSummary[]>([]);
  let schemaContext = $state<ResolvedContext | null>(null);
  let detectionFinding = $state<Record<string, unknown> | null>(null);
  let detectionSource = $state("");
  let assessmentSkillPath = $state("");
  let loading = $state(true);
  let busy = $state(false);
  let error = $state("");

  // Streaming execution state. Each field is populated by a distinct NDJSON event.
  let executedSkill = $state<SkillSummary | null>(null);
  let traceSteps = $state<TraceStep[]>([]);
  let streamedContextBundle = $state<ContextBundle | null>(null);
  let streamedEvidence = $state<EvidenceBundle | null>(null);
  let systemPrompt = $state("");
  let userPrompt = $state("");
  let modelStreaming = $state(false);
  let findingText = $state("");
  let findingModel = $state("");
  let findingUsage = $state<Record<string, unknown> | null>(null);
  let findingAssessmentType = $state("");

  // Active tab within the glass cards that hold more than one peer view.
  let skillTab = $state<"frontmatter" | "procedure" | "reference">("frontmatter");
  let promptTab = $state<"system" | "user">("system");

  const hasExecution = $derived(Boolean(executedSkill));
  const findingBlocks = $derived(findingText ? parseMarkdown(findingText) : []);

  const assessmentSkills = $derived(skills.filter((skill) => skill.metadata.layer === "assessment"));
  const selectedAssessmentSkill = $derived(
    assessmentSkills.find((skill) => skill.path === assessmentSkillPath) ?? null,
  );
  const selectedRequirements = $derived(selectedAssessmentSkill?.metadata.contextRequirements ?? []);

  onMount(async () => {
    await loadLab();
  });

  async function loadLab() {
    loading = true;
    error = "";

    try {
      const response = await fetch("/lab/07/api/skills");
      if (!response.ok) throw new Error(`Skill API returned HTTP ${response.status}`);
      const payload = (await response.json()) as LabPayload;
      skills = payload.skills;
      schemaContext = payload.schemaContext;
      assessmentSkillPath = "";
      await loadDetectionHandoff();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load Lab 07";
    } finally {
      loading = false;
    }
  }

  async function loadDetectionHandoff() {
    const stored = readStoredHandoff();
    if (stored) {
      detectionFinding = stored.finding;
      detectionSource = stored.source === "lab05"
        ? `Loaded from Lab 06 handoff (${stored.generatedAt})`
        : `Loaded generated fallback (${stored.generatedAt})`;
      return;
    }

    const fallback = await generateFallbackDetection();
    detectionFinding = fallback.finding;
    detectionSource = `Generated fallback by running ${FALLBACK_DETECTION_SKILL}`;
  }

  function readStoredHandoff(): DetectionHandoff | null {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(LAB05_HANDOFF_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as DetectionHandoff;
      if (parsed?.finding?.kind === "DetectionFinding") return parsed;
    } catch {
      localStorage.removeItem(LAB05_HANDOFF_KEY);
    }

    return null;
  }

  // Reads a complete NDJSON stream from a Response, parsing each line as it arrives and
  // dispatching it to the supplied handler. Keeps a buffer for the trailing partial line
  // until more bytes arrive, and flushes any final unterminated line on completion.
  async function consumeNdjsonStream<T>(response: Response, onEvent: (event: T) => void) {
    if (!response.body) throw new Error("Stream response had no body.");

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
        if (line) onEvent(JSON.parse(line) as T);
        newlineIndex = buffer.indexOf("\n");
      }
    }

    const tail = buffer.trim();
    if (tail) onEvent(JSON.parse(tail) as T);
  }

  // The upstream Lab 06 detection endpoint now STREAMS NDJSON. We consume that stream, collect
  // the skill / evidence / finding events, and synthesize the SAME structured DetectionFinding
  // handoff that Lab 06's persistDetectionFinding() builds so both labs stay consistent.
  async function generateFallbackDetection(): Promise<DetectionExecution> {
    const response = await fetch("/lab/06/api/skills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skillPath: FALLBACK_DETECTION_SKILL }),
    });

    if (!response.ok) throw new Error(`Fallback detection returned HTTP ${response.status}`);

    let detectionSkill: SkillSummary | null = null;
    let detectionEvidence: { trigger: CompactCandidate; related: CompactCandidate[] } | null = null;
    let detectionFindingText = "";
    let detectionModel = "";
    let streamError = "";

    await consumeNdjsonStream<DetectionStreamEvent>(response, (event) => {
      switch (event.type) {
        case "skill":
          detectionSkill = event.skill;
          break;
        case "evidence":
          detectionEvidence = { trigger: event.evidenceBundle.trigger, related: event.evidenceBundle.related };
          break;
        case "finding":
          detectionFindingText = event.text;
          detectionModel = event.model;
          break;
        case "error":
          streamError = event.message;
          break;
      }
    });

    if (streamError) throw new Error(streamError);
    if (!detectionSkill || !detectionEvidence) {
      throw new Error("Fallback detection stream did not yield a skill + evidence bundle.");
    }

    const skill = detectionSkill as SkillSummary;
    const evidence = detectionEvidence as { trigger: CompactCandidate; related: CompactCandidate[] };
    const trigger = evidence.trigger;

    // Mirror Lab 06's persistDetectionFinding() finding shape exactly.
    const finding: Record<string, unknown> = {
      kind: "DetectionFinding",
      verdict: "Produced",
      skill: skill.metadata.name,
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
        relatedCandidateIds: evidence.related.map((candidate) => candidate.id),
        eventIds: trigger.eventIds,
      },
      findingText: detectionFindingText,
      model: detectionModel,
    };

    const execution: DetectionExecution = { skill, finding };

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        LAB05_HANDOFF_KEY,
        JSON.stringify({
          version: 1,
          source: "lab06-fallback",
          generatedAt: new Date().toISOString(),
          execution,
          finding,
        }),
      );
    }

    return execution;
  }

  function resetExecutionState() {
    executedSkill = null;
    traceSteps = [];
    streamedContextBundle = null;
    streamedEvidence = null;
    systemPrompt = "";
    userPrompt = "";
    modelStreaming = false;
    findingText = "";
    findingModel = "";
    findingUsage = null;
    findingAssessmentType = "";
  }

  function applyStreamEvent(event: StreamEvent) {
    switch (event.type) {
      case "skill":
        executedSkill = event.skill;
        break;
      case "trace":
        traceSteps = [...traceSteps, event.step];
        break;
      case "context":
        streamedContextBundle = event.contextBundle;
        break;
      case "evidence":
        streamedEvidence = event.evidenceBundle;
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
        findingAssessmentType = event.assessmentType;
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

  async function runAssessment() {
    if (!selectedAssessmentSkill || !detectionFinding || busy) return;
    busy = true;
    error = "";
    resetExecutionState();

    try {
      const response = await fetch("/lab/07/api/skills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skillPath: selectedAssessmentSkill.path, upstreamFinding: detectionFinding }),
      });

      if (!response.ok) throw new Error(`Execution API returned HTTP ${response.status}`);
      if (!response.body) throw new Error("Execution API returned an empty stream.");

      await consumeNdjsonStream<StreamEvent>(response, applyStreamEvent);
    } catch (err) {
      error = err instanceof Error ? err.message : "Assessment execution failed";
    } finally {
      modelStreaming = false;
      busy = false;
    }
  }

  function json(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  function record(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

</script>

<svelte:head><title>Lab 07 | Assessment Context</title></svelte:head>

<main>
  <header class="hero">
    <h1>Lab 07: Assessment Skill + Context Injection</h1>
  </header>

  {#if error}
    <section class="error-panel">{error}</section>
  {/if}

  <section class="flow-grid" aria-label="Lab 07 assessment workflow">
    <section class="flow-card input">
      <div class="flow-header">
        <span>01</span>
        <h2>DetectionFinding</h2>
      </div>
      {#if loading}
        <p class="empty">Loading upstream finding.</p>
      {:else if detectionFinding}
        {@render DetectionFindingView({ finding: detectionFinding, source: detectionSource })}
      {:else}
        <p class="empty">No upstream DetectionFinding available.</p>
      {/if}
    </section>

    <section class="flow-card skill-stage">
      <div class="flow-header">
        <span>02</span>
        <h2>Assessment Skill</h2>
      </div>

      <section class="picker">
        <h3>Assessment Skills</h3>
        {#if loading}
          <p class="empty">Loading catalog.</p>
        {:else}
          <div class="skill-list horizontal">
            {#each assessmentSkills as skill}
              <button
                class="skill-card"
                class:active={assessmentSkillPath === skill.path}
                onclick={() => {
                  assessmentSkillPath = skill.path;
                  resetExecutionState();
                }}
              >
                <strong>{skill.metadata.name}</strong>
                <span>{skill.metadata.description}</span>
              </button>
            {/each}
          </div>
        {/if}
      </section>

      {#if selectedAssessmentSkill}
        {@render SkillContract({ skill: selectedAssessmentSkill })}
      {/if}

      <div class="stage-actions">
        <button onclick={runAssessment} disabled={!selectedAssessmentSkill || !detectionFinding || busy}>
          {busy ? "Running Assessment" : "Run Assessment Skill"}
        </button>
      </div>
    </section>

    <section class="flow-card context">
      <div class="flow-header">
        <span>03</span>
        <h2>Context Resolution</h2>
      </div>

      {#if selectedAssessmentSkill}
        <div class="context-list">
          <article>
            <strong>schema.candidate-field-guide</strong>
            <span>{schemaContext?.path ?? "context/schema/candidate-field-guide.md"}</span>
            <p>Shared field definitions. This is schema reference, not org context.</p>
          </article>
          {#each selectedRequirements as requirement}
            <article>
              <strong>{requirement.id}</strong>
              <span>{requirement.path}</span>
              <p>{requirement.reason}</p>
            </article>
          {/each}
        </div>

        {#if streamedContextBundle}
          <div class="resolved-context">
            <details>
              <summary>
                <span>Schema Reference</span>
                <small>{streamedContextBundle.schema.approxTokens} est. tokens</small>
              </summary>
              <pre>{streamedContextBundle.schema.content}</pre>
            </details>
            {#each streamedContextBundle.requirements as contextFile}
              <details>
                <summary>
                  <span>{contextFile.id}</span>
                  <small>{contextFile.approxTokens} est. tokens</small>
                </summary>
                <pre>{contextFile.content}</pre>
              </details>
            {/each}
          </div>
        {/if}
      {:else}
        <p class="empty">Select an assessment skill to see its declared context requirements.</p>
      {/if}
    </section>

    <section class="flow-card prompt-stage">
      <div class="flow-header">
        <span>04</span>
        <h2>Model Prompts</h2>
      </div>

      {#if systemPrompt || userPrompt}
        {@render PromptView()}
      {:else}
        <p class="empty">Run an assessment skill to see how the procedure and injected context assembled into the system and user prompts.</p>
      {/if}
    </section>

    <section class="flow-card finding-step" class:ready={Boolean(findingText) && !modelStreaming}>
      <div class="flow-header">
        <span>05</span>
        <h2>AssessmentFinding</h2>
      </div>
      {#if hasExecution}
        {@render FindingStream()}
      {:else}
        <p class="empty">Select and run an assessment skill to produce this finding.</p>
      {/if}
    </section>
  </section>

  <details class="panel">
    <summary>
      <span>Execution Trace</span>
      <small>{traceSteps.length ? `${traceSteps.length} trace steps` : "waiting"}</small>
    </summary>
    {#if hasExecution}
      <div class="trace">
        {#each traceSteps as step}
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
    {:else}
      <p class="empty">The trace appears after assessment execution.</p>
    {/if}
  </details>
</main>

{#snippet DetectionFindingView({ finding, source }: { finding: Record<string, unknown>; source: string })}
  {@const trigger = record(finding.triggerCandidate)}
  <article class="finding-summary">
    <div class="finding-head">
      <span>{finding.kind ?? "DetectionFinding"}</span>
      <strong>{finding.verdict ?? "Produced"}</strong>
    </div>
    <p class="source-note">{source}</p>
    <dl>
      <div>
        <dt>Skill</dt>
        <dd>{finding.skill}</dd>
      </div>
      <div>
        <dt>Score</dt>
        <dd>{finding.compositeScore}</dd>
      </div>
      <div>
        <dt>Trigger</dt>
        <dd>{trigger.id} | {trigger.host} | {trigger.processName}</dd>
      </div>
    </dl>
    {#if finding.attackNarrative}
      <section class="narrative">
        <h3>Attack Narrative</h3>
        <p>{finding.attackNarrative}</p>
      </section>
    {/if}
    <details>
      <summary>Raw DetectionFinding</summary>
      <pre>{json(finding)}</pre>
    </details>
  </article>
{/snippet}

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
    <p class="tab-note">The candidate types this assessment skill correlates alongside the upstream DetectionFinding. Scores are illustrative values from the curated workshop dataset (not computed by a live engine here); the full dimension-by-dimension math is worked through for the beacon example in Lab 02.</p>
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

{#snippet PromptView()}
  <p class="prompt-caption">
    How the loaded assessment procedure and the injected context assembled into the two prompts sent to the model.
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
      <p class="tab-note">the wrapped assessment procedure</p>
      <pre>{systemPrompt}</pre>
    </div>
  {:else}
    <div class="tab-panel">
      <p class="tab-note">upstream finding + injected context + evidence</p>
      <pre>{userPrompt}</pre>
    </div>
  {/if}
{/snippet}

{#snippet FindingStream()}
  <article class="finding-summary">
    <div class="finding-head">
      <span>AssessmentFinding</span>
      <div class="finding-badges">
        {#if findingModel}
          <span class="model-badge">model: {findingModel}</span>
        {/if}
        {#if findingAssessmentType}
          <span class="model-badge">{findingAssessmentType}</span>
        {/if}
        {#if modelStreaming}
          <span class="streaming-badge">streaming.</span>
        {/if}
      </div>
    </div>

    <p class="real-call-note">
      The assessment procedure is the system prompt; the upstream finding plus the injected
      context and evidence are the user prompt. The model reads them and writes the finding below.
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

<style>
  main {
    width: min(1500px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }

  .hero { margin-bottom: 1rem; }
  h1, h2, h3, h4, p { margin: 0; }
  h1 { color: var(--dracula-cyan); font-size: clamp(2rem, 4vw, 3.4rem); line-height: 1; }
  h2 { color: var(--dracula-pink); font-size: 1.25rem; }
  h3, h4, .flow-header span, summary, .skill-card, button { font-family: var(--font-heading); font-weight: 800; }
  h3 { color: var(--dracula-purple); font-size: .82rem; text-transform: uppercase; }
  h4 { color: var(--dracula-purple); font-size: .9rem; text-transform: uppercase; }
  p, .empty, small, dd, li, td { color: var(--dracula-muted); line-height: 1.5; }

  .flow-grid, .skill-list, .contract, .trace, .context-list, .resolved-context, .finding-summary {
    display: grid;
    gap: .85rem;
  }

  .flow-card, .panel, .picker, .trace article, .context-list article, .narrative {
    min-width: 0;
    border: 1px solid rgba(98, 114, 164, 0.62);
    border-radius: 8px;
    background: rgba(33, 34, 44, 0.82);
  }

  .flow-card, .panel { padding: 1rem; box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22); }
  .flow-card.input { border-color: rgba(245, 230, 99, .65); }
  .flow-card.context { border-color: rgba(245, 230, 99, .65); }
  .flow-card.skill-stage { border-color: rgba(189, 147, 249, .7); }
  .flow-card.finding-step { border-color: rgba(245, 230, 99, .62); background: rgba(245, 230, 99, .06); }
  .flow-card.finding-step.ready { border-color: rgba(80, 250, 123, .68); background: rgba(80, 250, 123, .07); }

  .flow-header {
    display: flex;
    gap: .75rem;
    align-items: baseline;
    margin-bottom: .9rem;
  }

  .flow-header span { color: var(--dracula-comment); font-size: .9rem; }
  .picker, .context-list article, .narrative { padding: .85rem; background: rgba(25, 26, 33, .46); }
  .skill-list { margin-top: .65rem; }
  .skill-list.horizontal { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  .skill-card {
    width: 100%;
    min-height: 5.25rem;
    display: grid;
    align-content: start;
    gap: .45rem;
    padding: .75rem;
    text-align: left;
    background: rgba(25, 26, 33, .7);
  }

  .skill-card.active {
    border-color: rgba(245, 230, 99, .78);
    background: rgba(245, 230, 99, .09);
  }

  .skill-card strong { color: var(--dracula-fg); overflow-wrap: anywhere; }
  .skill-card span { color: var(--dracula-muted); font-size: .78rem; overflow-wrap: anywhere; }
  .stage-actions { margin-top: .85rem; }
  button { min-height: 2.35rem; padding: .35rem .85rem; }

  summary { cursor: pointer; color: var(--dracula-cyan); }
  summary span { color: var(--dracula-cyan); }
  summary small { float: right; color: var(--dracula-comment); }

  pre {
    max-height: 28rem;
    overflow: auto;
    margin: .75rem 0 0;
    border: 1px solid rgba(98, 114, 164, .5);
    border-radius: 8px;
    background: rgba(25, 26, 33, .82);
    color: var(--dracula-fg);
    padding: .85rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .finding-summary span { color: var(--dracula-comment); font-family: var(--font-heading); font-weight: 800; text-transform: uppercase; }
  .finding-summary strong { color: var(--dracula-green); font-family: var(--font-heading); font-size: 1.1rem; }
  .source-note { color: var(--dracula-yellow); font-family: var(--font-heading); font-size: .78rem; }

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

  .markdown-body {
    display: grid;
    gap: .75rem;
    margin-top: .85rem;
  }

  .markdown-body.finding-markdown { margin-top: 0; }

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

  .markdown-body ul {
    display: grid;
    gap: .4rem;
    margin: 0;
    padding-left: 1.1rem;
  }

  .markdown-body table {
    width: 100%;
    border-collapse: collapse;
    overflow: hidden;
    border: 1px solid rgba(98, 114, 164, .45);
    border-radius: 8px;
  }

  .markdown-body th, .markdown-body td {
    border-bottom: 1px solid rgba(98, 114, 164, .38);
    padding: .55rem;
    text-align: left;
    vertical-align: top;
  }

  .markdown-body tr:last-child td { border-bottom: 0; }

  .markdown-body th {
    display: block;
    margin-bottom: .25rem;
    color: var(--dracula-purple);
    font-family: var(--font-heading);
    font-size: .72rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .contract { margin-top: .85rem; }
  .tab-bar { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .65rem; border-bottom: 1px solid rgba(98, 114, 164, .4); padding-bottom: .55rem; }
  .tab-bar .tab { border: 1px solid rgba(98, 114, 164, .5); border-radius: 7px; padding: .4rem .8rem; background: rgba(25, 26, 33, .6); color: var(--dracula-muted); font-size: .8rem; cursor: pointer; }
  .tab-bar .tab.active { border-color: rgba(189, 147, 249, .8); background: rgba(189, 147, 249, .12); color: var(--dracula-fg); }
  .tab-panel { margin-top: .85rem; }
  .tab-panel pre { margin: 0; max-height: 360px; overflow: auto; white-space: pre-wrap; word-break: break-word; font-size: .76rem; line-height: 1.45; }
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
  .prompt-caption { margin: 0 0 .3rem; font-size: .82rem; color: rgba(248, 248, 242, .62); }

  dl {
    display: grid;
    gap: .5rem;
    margin: 0;
  }

  dl > div {
    display: grid;
    grid-template-columns: 9rem minmax(0, 1fr);
    gap: 1rem;
    border-bottom: 1px solid rgba(98, 114, 164, .28);
    padding-bottom: .5rem;
  }

  dt { color: var(--dracula-comment); font-family: var(--font-heading); font-weight: 800; }
  dd { margin: 0; overflow-wrap: anywhere; }
  .narrative h3 { margin-bottom: .5rem; }

  .context-list article {
    display: grid;
    gap: .35rem;
  }

  .context-list strong { color: var(--dracula-cyan); font-family: var(--font-heading); }
  .context-list span { color: var(--dracula-yellow); overflow-wrap: anywhere; }

  .panel { margin-top: 1rem; }
  .panel > summary { display: flex; justify-content: space-between; gap: 1rem; }
  .trace { margin-top: .85rem; }
  .trace article { display: grid; grid-template-columns: 2rem minmax(0, 1fr); gap: .85rem; padding: .85rem; background: rgba(25, 26, 33, .48); }
  .trace article.warning { border-color: rgba(245, 230, 99, .64); }
  .trace article > span { width: 2rem; height: 2rem; display: inline-grid; place-items: center; border-radius: 999px; background: rgba(80, 250, 123, .12); color: var(--dracula-green); font-family: var(--font-heading); font-weight: 800; }
  .trace strong { color: var(--dracula-cyan); }
  .trace code { display: block; color: var(--dracula-yellow); white-space: pre-wrap; overflow-wrap: anywhere; }

  .empty {
    border: 1px dashed rgba(98, 114, 164, .55);
    border-radius: 8px;
    padding: .85rem;
  }

  .error-panel {
    margin-bottom: 1rem;
    border: 1px solid rgba(255, 85, 85, .65);
    border-radius: 8px;
    background: rgba(255, 85, 85, .1);
    color: var(--dracula-red);
    padding: 1rem;
  }

  @media (max-width: 900px) {
    .skill-list.horizontal { grid-template-columns: 1fr; }
    dl > div { grid-template-columns: 1fr; gap: .2rem; }
    summary small { float: none; display: block; margin-top: .25rem; }
  }
</style>
