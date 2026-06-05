<script lang="ts">
  import { onMount } from "svelte";
  import { parseMarkdown, renderInline, type MarkdownBlock } from "$lib/markdown.js";
  import ShieldCheckIcon from "phosphor-svelte/lib/ShieldCheckIcon";
  import BuildingsIcon from "phosphor-svelte/lib/BuildingsIcon";
  import ScalesIcon from "phosphor-svelte/lib/ScalesIcon";
  import ListMagnifyingGlassIcon from "phosphor-svelte/lib/ListMagnifyingGlassIcon";
  import BracketsCurlyIcon from "phosphor-svelte/lib/BracketsCurlyIcon";
  import FoldersIcon from "phosphor-svelte/lib/FoldersIcon";
  import FunnelIcon from "phosphor-svelte/lib/FunnelIcon";
  import RobotIcon from "phosphor-svelte/lib/RobotIcon";
  import LinkIcon from "phosphor-svelte/lib/LinkIcon";
  import SyringeIcon from "phosphor-svelte/lib/SyringeIcon";
  import StackIcon from "phosphor-svelte/lib/StackIcon";
  import GitBranchIcon from "phosphor-svelte/lib/GitBranchIcon";
  import FileTextIcon from "phosphor-svelte/lib/FileTextIcon";
  import DatabaseIcon from "phosphor-svelte/lib/DatabaseIcon";
  import ArrowRightIcon from "phosphor-svelte/lib/ArrowRightIcon";

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
    source: "lab06" | "lab06-fallback";
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


  const LAB06_HANDOFF_KEY = "antisiphon.lab06.detectionFinding";
  const FALLBACK_DETECTION_SKILL = "skills/detection/hunt-c2-over-https.md";

  let activeTab = $state<"lab" | "handoff" | "code">("lab");
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

  // Drives the "layering strip": what detection established (baseline) → the context that was
  // injected (the new input) → the categories this assessment layer adds on top.
  const detectionBaseline = $derived.by(() => {
    const f = detectionFinding;
    if (!f) return null;
    const tc = f.triggerCandidate && typeof f.triggerCandidate === "object"
      ? (f.triggerCandidate as Record<string, unknown>)
      : {};
    const score = f.compositeScore ?? tc.score ?? null;
    return {
      candidateId: String(f.candidateId ?? tc.id ?? "candidate"),
      score: score == null ? null : String(score),
    };
  });
  const injectedContextIds = $derived(streamedContextBundle?.requirements.map((r) => r.id) ?? []);
  const assessmentAdds = $derived.by(() => {
    const name = executedSkill?.metadata.name ?? selectedAssessmentSkill?.metadata.name ?? "";
    return name.includes("behavioral")
      ? ["Behavioral verdict", "Baseline deviation", "Context judgement"]
      : ["Severity", "Operational bottom line", "Business impact", "Escalation", "Recommended response"];
  });

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
      detectionSource = stored.source === "lab06"
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
    const raw = localStorage.getItem(LAB06_HANDOFF_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as DetectionHandoff;
      if (parsed?.finding?.kind === "DetectionFinding") return parsed;
    } catch {
      localStorage.removeItem(LAB06_HANDOFF_KEY);
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
        LAB06_HANDOFF_KEY,
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

  <div class="tab-bar-top">
    <button class="tab-btn-top" class:active={activeTab === "lab"} onclick={() => (activeTab = "lab")}>Lab</button>
    <button class="tab-btn-top" class:active={activeTab === "handoff"} onclick={() => (activeTab = "handoff")}>Handoff</button>
    <button class="tab-btn-top" class:active={activeTab === "code"} onclick={() => (activeTab = "code")}>Code</button>
  </div>

  {#if activeTab === "lab"}
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
  {:else if activeTab === "handoff"}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- HANDOFF VIEW — where the upstream DetectionFinding   -->
    <!-- comes from                                           -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="code-view">
      <div class="code-inner">
        <header class="cv-hero">
          <span class="cv-eyebrow">Upstream</span>
          <h2>Where the detection finding comes from</h2>
          <p>
            An assessment skill is <strong>never self-contained</strong> — it judges an upstream
            <code>DetectionFinding</code> produced by a detection skill. So before this lab can run,
            it needs a finding to assess. It gets one in two ways, and <strong>both are real</strong>
            (a genuine detection model call) — never a stub.
          </p>
          <div class="cv-mental-model">
            <ListMagnifyingGlassIcon size={20} weight="duotone" />
            <span>Lab 06 detection</span>
            <span class="cv-mm-sep">→</span>
            <FileTextIcon size={20} weight="duotone" />
            <span>DetectionFinding</span>
            <span class="cv-mm-sep">→</span>
            <ScalesIcon size={20} weight="duotone" />
            <span>Lab 07 assessment</span>
          </div>
        </header>

        <!-- A · Two ways it arrives -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">A</span> Two ways the finding arrives<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <div class="cv-cards">
            <article class="cv-card">
              <div class="cv-card-head"><LinkIcon size={26} weight="duotone" /><h4>Path 1 — handoff from Lab 06</h4></div>
              <p>When you run a detection in <strong>Lab 06</strong>, that page saves the resulting <code>DetectionFinding</code> to the browser (<code>localStorage</code>). Open Lab 07 and it picks that finding up automatically — so you're assessing the <em>exact</em> finding you just produced. This is the real detection → assessment pipeline.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><RobotIcon size={26} weight="duotone" /><h4>Path 2 — self-contained fallback</h4></div>
              <p>Open Lab 07 directly (no handoff in storage) and it <strong>runs the Lab 06 detection itself</strong> — it calls the detection endpoint for <code>hunt-c2-over-https</code>, which makes a real model call, and uses that finding. So the lab always has a genuine finding, even standalone.</p>
            </article>
          </div>
          <p class="cv-note">Either way you land on a real <code>DetectionFinding</code> — the assessment never reasons over an invented one.</p>
        </details>

        <!-- B · What gets handed over -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">B</span> What gets handed over<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">The finding is a structured object. The assessment harness reads specific fields from it to gather evidence:</p>
          <pre class="cv-code"><code>&#123;
  <span class="c-key">"kind"</span>: <span class="c-str">"DetectionFinding"</span>,
  <span class="c-key">"skill"</span>: <span class="c-str">"hunt-c2-over-https"</span>,
  <span class="c-key">"verdict"</span>: <span class="c-str">"Produced"</span>,
  <span class="c-key">"compositeScore"</span>: 0.90,
  <span class="c-key">"candidateId"</span>: <span class="c-str">"BEA-001"</span>,              <span class="c-cm">// → resolve the trigger candidate</span>
  <span class="c-key">"triggerCandidate"</span>: &#123; <span class="c-key">"id"</span>: <span class="c-str">"BEA-001"</span>, &#8230; &#125;,
  <span class="c-key">"evidenceRefs"</span>: &#123;
    <span class="c-key">"relatedCandidateIds"</span>: [<span class="c-str">"TLS-001"</span>, <span class="c-str">"INTEL-001"</span>, <span class="c-str">"DT-001"</span>]  <span class="c-cm">// → pull supporting evidence</span>
  &#125;,
  <span class="c-key">"findingText"</span>: <span class="c-str">"## BEA-001 — the model's detection write-up…"</span>  <span class="c-cm">// → read in the prompt</span>
&#125;</code></pre>
          <p class="cv-note">The harness uses <code>candidateId</code> / <code>triggerCandidate.id</code> to re-load the candidate, and <code>evidenceRefs.relatedCandidateIds</code> to pull its correlated evidence — then runs the assessment over all of it plus the injected org context.</p>
        </details>

        <!-- C · Why hand it off -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">C</span> Why a handoff, not a re-run<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <div class="cv-cards">
            <article class="cv-card">
              <div class="cv-card-head"><GitBranchIcon size={26} weight="duotone" /><h4>Separation of layers</h4></div>
              <p>Detection answers <em>"is this malicious?"</em>. Assessment answers <em>"how severe is it, in our environment?"</em>. They're different jobs with different inputs — so detection runs once, and its finding flows downstream rather than being re-derived.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><ScalesIcon size={26} weight="duotone" /><h4>The assessment must not re-score</h4></div>
              <p>The assessment system prompt is explicit: <em>"an upstream detection skill already produced the DetectionFinding — do NOT re-run detection scoring."</em> Its job is the severity/context layer, grounded in the injected org context — not to second-guess the detection.</p>
            </article>
          </div>
        </details>

        <!-- Callout -->
        <aside class="cv-callout">
          <LinkIcon size={22} weight="duotone" />
          <p>
            <strong>This is the pipeline taking shape.</strong> Detection → assessment is the first link;
            later labs add the graph, the narrative, and the report. Each layer consumes the previous
            one's structured output instead of starting over — which is exactly how a real multi-skill
            agent composes.
          </p>
        </aside>
      </div>
    </div>
  {:else}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- CODE VIEW  (architectural reference, non-interactive)-->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="code-view">
      <div class="code-inner">
        <!-- Intro -->
        <header class="cv-hero">
          <span class="cv-eyebrow">Under the Hood</span>
          <h2>How the agent uses your organization's context</h2>
          <p>
            Optional reading for the curious. Lab 06 answered "is this malicious?". This lab asks
            the harder question — "how bad is it, <em>in our environment</em>?" — which a detection
            alone can't answer. The assessment skill declares exactly which organizational context
            it needs (asset records, compliance policy, incident history); the harness loads those
            files and <strong>injects</strong> them, alongside the upstream <code>DetectionFinding</code>,
            into the model's prompt.
          </p>
          <div class="cv-mental-model">
            <ShieldCheckIcon size={20} weight="duotone" />
            <span>upstream DetectionFinding</span>
            <span class="cv-mm-sep">+</span>
            <BuildingsIcon size={20} weight="duotone" />
            <span>injected org context</span>
            <span class="cv-mm-sep">→</span>
            <ScalesIcon size={20} weight="duotone" />
            <span>AssessmentFinding</span>
          </div>
        </header>

        <!-- A · Journey -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">A</span> The journey of one assessment<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            Five phases. The new one is <em>context</em> — resolving the exact files the skill asked
            for. As in Lab 06, only the last phase calls the model.
          </p>

          <ol class="flow">
            <li class="flow-step" style="--d: 0ms">
              <span class="flow-rail"><ListMagnifyingGlassIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Discover assessment skills</span><span class="flow-where">server · skill-loader.ts</span></div>
                <p>The harness lists skills and keeps the <code>layer: assessment</code> ones with static context. (Retrieval-backed skills are Lab 08.)</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 90ms">
              <span class="flow-rail"><BracketsCurlyIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Inspect inputs &amp; context requirements</span><span class="flow-where">server · api/skills</span></div>
                <p>The frontmatter declares its input (a <code>DetectionFinding</code>) and a list of <code>contextRequirements</code> — each with an <code>id</code>, a <code>mode</code>, and a file <code>path</code>.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 180ms">
              <span class="flow-rail"><FoldersIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Resolve &amp; inject the context</span><span class="flow-badge">the key step</span><span class="flow-where">server · api/skills</span></div>
                <p><code>resolveContextBundle()</code> reads each declared file — asset record, escalation policy, incident history — plus the shared field guide. These become the injected context bundle.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 270ms">
              <span class="flow-rail"><FunnelIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Resolve the upstream evidence</span><span class="flow-where">server · api/skills</span></div>
                <p>The DetectionFinding names the candidate that fired; the harness pulls that trigger plus its related candidates so the model can cite real evidence.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 360ms">
              <span class="flow-rail"><RobotIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Execute — the model assesses</span><span class="flow-where">server · providers/*</span></div>
                <p>Skill body = system prompt; the DetectionFinding + injected context + evidence = user prompt. The model judges severity and streams back an <code>AssessmentFinding</code>, citing the context line behind every claim.</p>
              </div>
            </li>
          </ol>
        </details>

        <!-- B · What the model is given -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">B</span> What the model is given<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            "Context injection" just means: the harness assembles a precise bundle and hands it to
            the model. Here is exactly what goes in this turn.
          </p>

          <div class="assembly">
            <div class="asm-inputs">
              <div class="asm-row asm-sys">
                <FileTextIcon size={18} weight="duotone" />
                <div><strong>Skill body</strong><small>→ system prompt: the assessment procedure</small></div>
              </div>
              <div class="asm-row asm-user">
                <ShieldCheckIcon size={18} weight="duotone" />
                <div><strong>Upstream DetectionFinding</strong><small>→ user prompt: what Lab 06 concluded</small></div>
              </div>
              <div class="asm-row asm-user">
                <BuildingsIcon size={18} weight="duotone" />
                <div><strong>Injected context</strong><small>→ user prompt: the resolved org files</small></div>
              </div>
              <div class="asm-row asm-user">
                <DatabaseIcon size={18} weight="duotone" />
                <div><strong>Supporting evidence</strong><small>→ user prompt: the candidate records</small></div>
              </div>
            </div>
            <div class="asm-arrow"><ArrowRightIcon size={20} weight="bold" /></div>
            <div class="asm-out">
              <RobotIcon size={22} weight="duotone" />
              <strong>model</strong>
              <ScalesIcon size={16} weight="duotone" />
              <span>AssessmentFinding</span>
            </div>
          </div>
          <p class="cv-note">
            Every contextual claim the model makes must name the injected file it came from — so the
            assessment is grounded and auditable, never a guess.
          </p>
        </details>

        <!-- C · Four ideas -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">C</span> Four ideas worth understanding<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <div class="cv-cards">
            <article class="cv-card">
              <div class="cv-card-head"><LinkIcon size={26} weight="duotone" /><h4>Skills compose into a pipeline</h4></div>
              <p>Lab 06's <code>DetectionFinding</code> is this lab's input. Detection asks "malicious?"; assessment asks "how severe, given our org?". One skill's output is the next skill's input.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><SyringeIcon size={26} weight="duotone" /><h4>Context is injected explicitly</h4></div>
              <p>The skill names the exact files it needs in <code>contextRequirements</code>. The harness loads precisely those and nothing else — the model can't reach for hidden context.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><StackIcon size={26} weight="duotone" /><h4>Organizational context is layered</h4></div>
              <p>Context lives in layers — assets, compliance, incident history — under <code>context/layers/</code>. A skill pulls only the layers its assessment actually needs.</p>
              <div class="cv-chain">
                <span class="cv-chip">assets</span>
                <span class="cv-chip">compliance</span>
                <span class="cv-chip">incidents</span>
              </div>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><GitBranchIcon size={26} weight="duotone" /><h4>Static now, retrieval next</h4></div>
              <p>Each requirement has a <code>mode</code>. This lab only resolves <code>static</code> — fixed file paths. When the right context isn't known in advance, you retrieve it instead — that's Lab 08 (RAG).</p>
            </article>
          </div>
        </details>

        <!-- D · File tree -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">D</span> Where each piece lives<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">Assessment skills and the org context they pull from are both just files.</p>
          <pre class="cv-tree"><code><span class="tr-dir">hunting-agent/</span>
│
├─ <span class="tr-dir">skills/assessment/</span>            <span class="tr-cm">← assessment skills (Markdown + YAML)</span>
│  ├─ <span class="tr-file">assess-severity.md</span>
│  └─ <span class="tr-file">assess-behavioral-context.md</span>
│
├─ <span class="tr-dir">context/layers/</span>               <span class="tr-cm">← the organizational context, in layers</span>
│  ├─ <span class="tr-dir">layer_1_assets/</span>           <span class="tr-cm">← host roles, owners, blast radius</span>
│  ├─ <span class="tr-dir">layer_2_compliance/</span>       <span class="tr-cm">← escalation policy, evidence rules</span>
│  └─ <span class="tr-dir">layer_5_incidents/</span>        <span class="tr-cm">← prior incident history</span>
│
└─ <span class="tr-dir">src/routes/lab/07/api/skills/</span>
   └─ <span class="tr-file">+server.ts</span>             <span class="tr-cm">← resolve context · inject · call the model</span></code></pre>
        </details>

        <!-- Callout -->
        <aside class="cv-callout">
          <SyringeIcon size={22} weight="duotone" />
          <p>
            <strong>Why inject context explicitly?</strong> An assessment is only trustworthy if you
            can see what it was based on. By declaring the exact files up front, every severity
            judgement traces to a named source — the asset's criticality, the escalation deadline,
            the prior incident. No hidden inputs, no ungrounded claims. When the needed context
            <em>isn't</em> known ahead of time, you retrieve it — which is exactly where Lab 08 goes.
          </p>
        </aside>
      </div>
    </div>
  {/if}
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

    {#if detectionBaseline}
      <div class="layering">
        <div class="lyr lyr-base">
          <span class="lyr-tag">Detection established</span>
          <strong>{detectionBaseline.candidateId}{detectionBaseline.score ? ` · ${detectionBaseline.score}` : ""}</strong>
          <small>technical confidence — <em>is</em> it malicious</small>
        </div>
        <div class="lyr-join">
          <span class="lyr-join-label">+ injected context</span>
          {#if injectedContextIds.length}
            <div class="lyr-chips">
              {#each injectedContextIds as id}<span class="lyr-chip">{id}</span>{/each}
            </div>
          {/if}
        </div>
        <div class="lyr lyr-add">
          <span class="lyr-tag">Assessment adds</span>
          <div class="lyr-adds">
            {#each assessmentAdds as a}<span class="lyr-add-chip">{a}</span>{/each}
          </div>
          <small>new, contextual judgement — <em>how bad for us</em></small>
        </div>
      </div>
      <p class="layering-note">
        Everything below is <strong>net-new from this layer</strong> — produced only because the
        context above was injected. Detection said <em>whether</em> it's malicious; the assessment
        adds <em>how severe it is in your environment</em>, grounding each claim in a named context file.
      </p>
    {/if}

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

  /* Layering strip: detection baseline → injected context → assessment adds */
  .layering {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: stretch;
    gap: .6rem;
    margin-top: 1rem;
  }
  .lyr {
    display: flex;
    flex-direction: column;
    gap: .3rem;
    border: 1px solid rgba(98, 114, 164, .4);
    border-radius: 8px;
    padding: .7rem .8rem;
    background: rgba(25, 26, 33, .7);
  }
  .lyr-base { border-left: 3px solid rgba(139, 233, 253, .65); }
  .lyr-add { border-left: 3px solid var(--dracula-green, #50fa7b); background: rgba(80, 250, 123, .06); }
  .lyr-tag {
    font-family: var(--font-heading);
    font-size: .68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: var(--brand-muted, rgba(255,255,255,.6));
  }
  .lyr-base .lyr-tag { color: #8be9fd; }
  .lyr-add .lyr-tag { color: var(--dracula-green, #50fa7b); }
  .lyr strong { color: var(--dracula-fg, #f8f8f2); font-size: 1rem; }
  .lyr small { color: var(--brand-muted, rgba(255,255,255,.58)); font-size: .76rem; }
  .lyr small em { color: var(--brand-yellow, #f5e663); font-style: normal; }
  .lyr-join {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .4rem;
    min-width: 9rem;
    text-align: center;
  }
  .lyr-join-label {
    font-family: var(--font-heading);
    font-size: .72rem;
    font-weight: 800;
    color: var(--brand-purple-light, #bd93f9);
  }
  .lyr-chips, .lyr-adds { display: flex; flex-wrap: wrap; gap: .3rem; }
  .lyr-adds { justify-content: flex-start; }
  .lyr-chip {
    font-family: var(--font-heading);
    font-size: .68rem;
    color: var(--brand-purple-light, #bd93f9);
    background: rgba(189, 147, 249, .1);
    border: 1px solid rgba(189, 147, 249, .35);
    border-radius: 999px;
    padding: .1rem .45rem;
  }
  .lyr-add-chip {
    font-size: .72rem;
    color: var(--dracula-green, #50fa7b);
    background: rgba(80, 250, 123, .08);
    border: 1px solid rgba(80, 250, 123, .35);
    border-radius: 5px;
    padding: .12rem .45rem;
  }
  .layering-note {
    margin-top: .75rem;
    font-size: .84rem;
    line-height: 1.6;
    color: var(--brand-muted, rgba(255,255,255,.66));
  }
  .layering-note strong { color: var(--dracula-green, #50fa7b); }
  .layering-note em { color: var(--brand-yellow, #f5e663); font-style: normal; }
  @media (max-width: 760px) {
    .layering { grid-template-columns: 1fr; }
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

  /* ═══ Top tab bar ══════════════════════════════════════ */
  .tab-bar-top {
    display: flex;
    gap: 0;
    border-bottom: 1px solid #1a1a2e;
    margin-bottom: 1rem;
  }
  .tab-btn-top {
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
  .tab-btn-top:hover { color: #c0c0d0; }
  .tab-btn-top.active { color: #f5e663; border-bottom-color: #f5e663; }

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
    background: linear-gradient(180deg, #bd93f9, #50fa7b, #bd93f9);
    background-size: 100% 140px;
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

  /* Prompt assembly diagram */
  .assembly {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.8rem;
    border: 1px solid #1c1c30;
    border-radius: 10px;
    background: rgba(18, 18, 26, 0.6);
    padding: 1.1rem 1.2rem;
  }
  .asm-inputs { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; min-width: 240px; }
  .asm-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    border: 1px solid #2a2a40;
    border-radius: 8px;
    background: #0d0d14;
    padding: 0.5rem 0.7rem;
  }
  .asm-row :global(svg) { flex-shrink: 0; }
  .asm-row strong { color: #e8e8f0; font-size: 0.85rem; display: block; }
  .asm-row small { color: #8a8a9a; font-size: 0.73rem; }
  .asm-sys { border-left: 3px solid #bd93f9; }
  .asm-sys :global(svg) { color: #bd93f9; }
  .asm-user { border-left: 3px solid #8be9fd; }
  .asm-user :global(svg) { color: #8be9fd; }
  .asm-arrow { color: #6f6f86; flex-shrink: 0; }
  .asm-out {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    border: 1px solid rgba(80, 250, 123, 0.4);
    border-radius: 8px;
    background: #0d0d14;
    padding: 0.85rem 1rem;
    min-width: 130px;
    text-align: center;
  }
  .asm-out strong { color: #e8e8f0; font-size: 0.85rem; }
  .asm-out span { color: #50fa7b; font-size: 0.78rem; }
  .asm-out :global(svg) { color: #50fa7b; }
  .cv-note {
    margin: 1rem 0 0;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.7;
  }

  /* Chips */
  .cv-chain {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .cv-chip {
    font-size: 0.8rem;
    color: #cfcfe0;
    background: #0d0d14;
    border: 1px solid #2a2a40;
    border-radius: 5px;
    padding: 0.3rem 0.6rem;
    white-space: nowrap;
  }

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
    margin: 0 0 0.9rem;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.65;
  }
  .cv-card p:last-child { margin-bottom: 0; }

  .cv-code {
    margin: 0;
    padding: 0.85rem 1rem;
    background: #0d0d14;
    border: 1px solid #1a1a2e;
    border-radius: 8px;
    overflow-x: auto;
    white-space: pre;
    color: #d6d6e2;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.82rem;
    line-height: 1.6;
  }
  .cv-code code { background: none; border: none; padding: 0; color: inherit; font-size: inherit; }
  .cv-code .c-key { color: #8be9fd; }
  .cv-code .c-str { color: #f1fa8c; }
  .cv-code .c-cm { color: #6272a4; }

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
    to { background-position: 0 140px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .flow-step,
    .cv-hero { animation: none; opacity: 1; }
    .flow-step::before { animation: none; }
  }
</style>
