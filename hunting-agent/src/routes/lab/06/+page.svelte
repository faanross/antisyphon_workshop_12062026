<script lang="ts">
  import { onMount } from "svelte";
  import { parseMarkdown, renderInline, type MarkdownBlock } from "$lib/markdown.js";
  import FileMdIcon from "phosphor-svelte/lib/FileMdIcon";
  import BracketsCurlyIcon from "phosphor-svelte/lib/BracketsCurlyIcon";
  import FunnelIcon from "phosphor-svelte/lib/FunnelIcon";
  import StackIcon from "phosphor-svelte/lib/StackIcon";
  import RobotIcon from "phosphor-svelte/lib/RobotIcon";
  import ScalesIcon from "phosphor-svelte/lib/ScalesIcon";
  import ListMagnifyingGlassIcon from "phosphor-svelte/lib/ListMagnifyingGlassIcon";
  import CheckCircleIcon from "phosphor-svelte/lib/CheckCircleIcon";
  import ArrowRightIcon from "phosphor-svelte/lib/ArrowRightIcon";

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
  let activeTab = $state<"lab" | "code">("lab");
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

  <div class="tab-bar-top">
    <button class="tab-btn-top" class:active={activeTab === "lab"} onclick={() => (activeTab = "lab")}>Lab</button>
    <button class="tab-btn-top" class:active={activeTab === "code"} onclick={() => (activeTab = "code")}>Code</button>
  </div>

  {#if activeTab === "lab"}
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
  {:else}
    <!-- ═══════════════════════════════════════════════════ -->
    <!-- CODE VIEW  (architectural reference, non-interactive)-->
    <!-- ═══════════════════════════════════════════════════ -->
    <div class="code-view">
      <div class="code-inner">
        <!-- Intro -->
        <header class="cv-hero">
          <span class="cv-eyebrow">Under the Hood</span>
          <h2>How a detection skill runs</h2>
          <p>
            Optional reading for the curious. A "skill" here is just a <strong>Markdown file</strong>.
            Its frontmatter tells the harness what evidence to gather; its body is the procedure the
            <strong>model</strong> executes. The harness does the deterministic gathering, the model
            does the judgement — and the result is a <code>DetectionFinding</code>. This is a real
            model call.
          </p>
          <div class="cv-mental-model">
            <FileMdIcon size={20} weight="duotone" />
            <span>a Markdown skill</span>
            <span class="cv-mm-sep">→</span>
            <FunnelIcon size={20} weight="duotone" />
            <span>harness gathers evidence</span>
            <span class="cv-mm-sep">→</span>
            <RobotIcon size={20} weight="duotone" />
            <span>model judges</span>
          </div>
        </header>

        <!-- A · Journey -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">A</span> The journey of one detection<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            Five phases turn a skill file plus a pile of candidates into one finding. The first four
            are deterministic harness work; only the last calls the model.
          </p>

          <ol class="flow">
            <li class="flow-step" style="--d: 0ms">
              <span class="flow-rail"><ListMagnifyingGlassIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Discover the skill catalog</span><span class="flow-where">server · skill-loader.ts</span></div>
                <p><code>listSkills()</code> walks the <code>skills/</code> folder and parses each file's YAML frontmatter. Detection skills are the ones marked <code>layer: detection</code>.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 90ms">
              <span class="flow-rail"><BracketsCurlyIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Inspect the invocation metadata</span><span class="flow-where">server · api/skills</span></div>
                <p>The frontmatter declares which candidate type <em>triggers</em> the skill, an <code>invocationGate</code> it must pass, and the related candidate types to correlate.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 180ms">
              <span class="flow-rail"><FunnelIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Query &amp; gate the trigger</span><span class="flow-where">server · api/skills</span></div>
                <p><code>chooseTrigger()</code> finds candidates of the trigger type, applies the gate (e.g. <code>minBeaconScore ≥ 0.85</code>), and ranks them to pick the one that fired.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 270ms">
              <span class="flow-rail"><StackIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Assemble the evidence bundle</span><span class="flow-badge">the key step</span><span class="flow-where">server · api/skills</span></div>
                <p>For each correlation rule, the harness pulls related candidates by <em>scope</em> (same network tuple, same destination, same process, same host) and bundles them with the trigger.</p>
              </div>
            </li>
            <li class="flow-step" style="--d: 360ms">
              <span class="flow-rail"><RobotIcon size={22} weight="duotone" /></span>
              <div class="flow-body">
                <div class="flow-top"><span class="flow-title">Execute — the model runs the procedure</span><span class="flow-where">server · providers/*</span></div>
                <p>The skill's body becomes the <strong>system prompt</strong>; the evidence bundle becomes the <strong>user prompt</strong>. The model reasons over the evidence and streams back a <code>DetectionFinding</code> — scored dimensions, a reasoning chain, and evidence refs.</p>
              </div>
            </li>
          </ol>
        </details>

        <!-- B · Anatomy of a skill -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">B</span> Anatomy of a skill file<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">
            Every skill is one Markdown file in two halves. The harness reads the top; the model
            reads the bottom.
          </p>

          <div class="skillfile">
            <div class="sf-zone sf-front">
              <div class="sf-tag"><BracketsCurlyIcon size={14} weight="bold" /> frontmatter — the contract (the harness reads this)</div>
              <pre><code>name: hunt-c2-over-https
layer: detection
invocationTriggerCandidate: beacon
invocationGate:
  observedService: ssl
  minBeaconScore: 0.85
correlatingCandidates:
  - type: tls_anomaly   scope: same_network_tuple
  - type: intel_match   scope: destination
mitreTechniques: [T1071.001, T1573.002]</code></pre>
            </div>
            <div class="sf-zone sf-body">
              <div class="sf-tag"><FileMdIcon size={14} weight="bold" /> body — the procedure (the model reads this)</div>
              <pre><code># Objective
Determine whether an HTTPS beacon is C2…

# Procedure
Load the trigger beacon, inspect its score,
rarity, intel, and process attribution…

# Scoring
compositeScore = max(beacon, intel, tls)</code></pre>
            </div>
          </div>
          <p class="cv-note">
            The split is the whole idea: machine-readable frontmatter drives the deterministic
            gathering, human-readable body drives the model's judgement.
          </p>
        </details>

        <!-- C · Four ideas -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">C</span> Four ideas worth understanding<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <div class="cv-cards">
            <article class="cv-card">
              <div class="cv-card-head"><FileMdIcon size={26} weight="duotone" /><h4>Skills are data, not code</h4></div>
              <p>A detection is a Markdown file. To add one, you drop a <code>.md</code> into <code>skills/detection/</code> — no code change, no redeploy of logic. The harness discovers it automatically.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><BracketsCurlyIcon size={26} weight="duotone" /><h4>Frontmatter is the contract; body is the procedure</h4></div>
              <p>The YAML is machine-read: trigger type, gate, correlation scopes, MITRE techniques. The prose body is model-read: the actual detection reasoning. One file, two audiences.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><ScalesIcon size={26} weight="duotone" /><h4>The harness gathers; the model judges</h4></div>
              <p>Gating, correlation, and bundling are deterministic code — repeatable and auditable. Only the final judgement is the model's. Evidence selection never depends on the model's mood.</p>
            </article>
            <article class="cv-card">
              <div class="cv-card-head"><RobotIcon size={26} weight="duotone" /><h4>The body becomes the system prompt</h4></div>
              <p>At runtime the skill's procedure is handed to the model verbatim as its system prompt, with the evidence bundle as the user prompt. The Markdown you wrote <em>is</em> the instructions.</p>
            </article>
          </div>
        </details>

        <!-- D · File tree -->
        <details class="cv-section" open>
          <summary class="cv-h3"><span class="cv-num">D</span> Where each piece lives<span class="cv-chev" aria-hidden="true">▸</span></summary>
          <p class="cv-lead">Skills are content; the loader and endpoint are the machinery that runs them.</p>
          <pre class="cv-tree"><code><span class="tr-dir">hunting-agent/</span>
│
├─ <span class="tr-dir">skills/detection/</span>             <span class="tr-cm">← the detection skills (Markdown + YAML)</span>
│  ├─ <span class="tr-file">hunt-c2-over-https.md</span>
│  ├─ <span class="tr-file">hunt-data-exfiltration.md</span>
│  ├─ <span class="tr-file">hunt-suspicious-process-chain.md</span>
│  └─ <span class="tr-file">hunt-ai-tool-execution-anomaly.md</span>
│
└─ <span class="tr-dir">src/</span>
   ├─ <span class="tr-dir">routes/lab/06/api/skills/</span>
   │  └─ <span class="tr-file">+server.ts</span>          <span class="tr-cm">← gate · correlate · bundle · call the model</span>
   └─ <span class="tr-dir">framework/</span>
      └─ <span class="tr-file">skill-loader.ts</span>     <span class="tr-cm">← walk skills/, split frontmatter from body</span></code></pre>
        </details>

        <!-- Callout -->
        <aside class="cv-callout">
          <FileMdIcon size={22} weight="duotone" />
          <p>
            <strong>Why skills as files?</strong> A detection team can author, review, and version
            detections as plain Markdown — like documentation — and the agent picks them up with no
            code change. The frontmatter keeps the gathering deterministic; the body lets an expert
            write the reasoning in prose. That's how you scale an agent's capabilities safely.
          </p>
        </aside>
      </div>
    </div>
  {/if}
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

  /* Skill-file anatomy */
  .skillfile { display: grid; gap: 0.6rem; }
  .sf-zone {
    border: 1px solid #1c1c30;
    border-radius: 10px;
    background: rgba(18, 18, 26, 0.6);
    padding: 0.7rem 0.9rem 0.85rem;
  }
  .sf-front { border-left: 3px solid #8be9fd; }
  .sf-body { border-left: 3px solid #50fa7b; }
  .sf-tag {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.5rem;
  }
  .sf-front .sf-tag { color: #8be9fd; }
  .sf-body .sf-tag { color: #50fa7b; }
  .sf-zone pre {
    margin: 0;
    overflow-x: auto;
    font-size: 0.8rem;
    line-height: 1.6;
    color: #c8c8d6;
  }
  .sf-zone pre code {
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }
  .cv-note {
    margin: 1rem 0 0;
    color: #aeaebe;
    font-size: 0.9rem;
    line-height: 1.7;
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
