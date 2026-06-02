import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  listSkills,
  loadSkill,
  type SkillDocument,
  type SkillMetadata,
} from "../../../../../framework/skill-loader.js";
import { selectProvider } from "$lib/server/provider.js";

type JsonRecord = Record<string, unknown>;

type Candidate = JsonRecord & {
  candidate_id?: string;
  type?: string;
  host?: string;
  src_ip?: string;
  dest_ip?: string;
  dest_port?: number;
  matched_value?: string;
  process_guid?: string;
  process_name?: string;
  image?: string;
  parent_image?: string;
  compositeScore?: number;
  constituent_event_ids?: string[];
};

type EventRecord = JsonRecord & {
  event_id?: string;
  event_type?: string;
  host?: string;
  timestamp?: string;
  raw?: JsonRecord;
};

type CorrelationSpec = {
  type?: string;
  scope?: string;
};

type ContextRequirement = {
  id: string;
  mode: "static" | "retrieval" | string;
  path: string;
  reason: string;
};

type ResolvedContext = ContextRequirement & {
  content: string;
  approxTokens: number;
};

type TraceStep = {
  step: number;
  phase: "discover" | "inspect" | "context" | "query" | "execute";
  title: string;
  status: "ok" | "warning";
  detail: string;
  result: string;
};

const DATA_PATH = "src/lib/data/workshop/candidates_enriched.json";
const EVENT_PATH = "src/lib/data/workshop/events_enriched.json";
const FIELD_GUIDE_PATH = "context/schema/candidate-field-guide.md";

const ASSESSMENT_CORRELATIONS: CorrelationSpec[] = [
  { type: "tls_anomaly", scope: "same_network_tuple" },
  { type: "intel_match", scope: "destination" },
  { type: "data_transfer", scope: "same_process_secondary_flow" },
  { type: "powershell_invocation_anomaly", scope: "same_host" },
  { type: "unusual_parent_child_anomaly", scope: "same_host" },
];

// Human-readable meaning of each correlation scope (logic lives in matchesScope()).
const SCOPE_DESCRIPTIONS: Record<string, string> = {
  same_network_tuple: "Same source IP + destination IP pair as the upstream finding.",
  destination: "Same destination IP / domain as the upstream finding.",
  same_process_secondary_flow: "Emitted by the same process (or same host + process name) as the upstream finding.",
  same_host: "Observed on the same host as the upstream finding.",
};

type CandidateTypeDoc = { description: string; fields: string[]; scoreNote?: string };

type CandidateRef = CandidateTypeDoc & {
  type: string;
  role: "trigger" | "correlating";
  scope?: string;
  scopeDescription?: string;
};

// Parse the candidate field guide (## type → description, "Key fields:", "Score interpretation:")
// into a per-type map so the lab can show students what each candidate type actually is.
function parseFieldGuide(text: string): Record<string, CandidateTypeDoc> {
  const docs: Record<string, CandidateTypeDoc> = {};
  for (const section of text.split(/^##\s+/m).slice(1)) {
    const lines = section.split("\n");
    const type = (lines[0] ?? "").trim();
    if (!type) continue;
    const body = lines.slice(1);
    const descriptionLines: string[] = [];
    for (const line of body) {
      const trimmedLine = line.trim();
      if (/^(Key fields|Score interpretation)/.test(trimmedLine)) break;
      if (trimmedLine) descriptionLines.push(trimmedLine);
    }
    const description = descriptionLines.join(" ");
    const fieldsLine = body.find((line) => line.trim().startsWith("Key fields:")) ?? "";
    const fields = [...fieldsLine.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    const scoreLine = body.find((line) => line.trim().startsWith("Score interpretation:"));
    const scoreNote = scoreLine ? scoreLine.replace(/^Score interpretation:\s*/, "").trim() : undefined;
    docs[type] = { description, fields, scoreNote };
  }
  return docs;
}

// The assessment skill consumes an upstream DetectionFinding plus the correlating candidate
// types in ASSESSMENT_CORRELATIONS. The reference explains each so the evidence is not a black box.
function buildAssessmentCandidateReference(guide: Record<string, CandidateTypeDoc>): CandidateRef[] {
  const fallback: CandidateTypeDoc = { description: "No field-guide entry for this candidate type.", fields: [] };
  return ASSESSMENT_CORRELATIONS.map((spec) => {
    const type = spec.type ?? "";
    return {
      type,
      role: "correlating" as const,
      scope: spec.scope || undefined,
      scopeDescription: spec.scope ? SCOPE_DESCRIPTIONS[spec.scope] ?? "Custom correlation scope." : undefined,
      ...(guide[type] ?? fallback),
    };
  });
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const content = await readFile(path.join(process.cwd(), relativePath), "utf8");
  return JSON.parse(content) as T;
}

async function readTextFile(relativePath: string): Promise<string> {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function candidateScore(candidate: Candidate): number {
  return Math.max(
    numberValue(candidate.compositeScore),
    numberValue(candidate.beacon_score),
    numberValue(candidate.tls_anomaly_score),
    numberValue(candidate.data_transfer_score),
    numberValue(candidate.unusual_parent_child_anomaly_score),
    numberValue(candidate.powershell_invocation_anomaly_score),
    numberValue(candidate.cert_anomaly_score),
  );
}

function candidateId(candidate: Candidate): string {
  return asString(candidate.candidate_id || "unknown-candidate");
}

function candidateType(candidate: Candidate): string {
  return asString(candidate.type || "unknown");
}

function processName(candidate: Candidate): string {
  return asString(candidate.process_name || candidate.image || candidate.process || "unknown-process")
    .split("\\")
    .at(-1) ?? "unknown-process";
}

function candidateLots(candidate: Candidate): string {
  const lotsMatch = candidate.lots_match;
  const enrichment = asRecord(candidate.enrichment);
  const lots = asString(
    candidate.lots_service ||
      candidate.lots_name ||
      candidate.service_name ||
      enrichment.lots_service ||
      enrichment.owner ||
      enrichment.service,
  );

  if (lots) return lots;
  if (lotsMatch === false) return "false";
  if (lotsMatch === true) return "true";
  return "none";
}

function eventIds(candidate: Candidate): string[] {
  return asArray(candidate.constituent_event_ids).map(String);
}

function compactCandidate(candidate: Candidate) {
  return {
    id: candidateId(candidate),
    type: candidateType(candidate),
    host: asString(candidate.host),
    srcIp: asString(candidate.src_ip),
    destIp: asString(candidate.dest_ip || candidate.matched_value),
    destPort: candidate.dest_port ?? "",
    processName: processName(candidate),
    processGuid: asString(candidate.process_guid),
    score: Number(candidateScore(candidate).toFixed(2)),
    lots: candidateLots(candidate),
    eventIds: eventIds(candidate),
  };
}

function summarizeCandidate(candidate: Candidate): string {
  const compact = compactCandidate(candidate);
  const destination = compact.destIp ? ` -> ${compact.destIp}` : "";
  return `${compact.id} (${compact.type}) on ${compact.host}${destination} via ${compact.processName}, score ${compact.score}`;
}

function summarizeEvent(event: EventRecord): string {
  const raw = asRecord(event.raw);
  const image = raw.Image || raw.image || raw.ProcessName || "";
  const dest = raw.DestinationIp || raw.dest_ip || event.dest_ip || "";
  const extra = image ? ` | ${image}` : dest ? ` | ${dest}` : "";
  return `${event.event_id ?? "event"} (${event.event_type ?? "unknown"})${extra}`;
}

function normalizeSkillPath(skillPath: string): string {
  const normalized = path.normalize(skillPath).replaceAll("\\", "/");
  if (!normalized.startsWith("skills/") || normalized.includes("../")) {
    throw error(400, "Skill path must point to a workshop skill under skills/.");
  }
  return normalized;
}

function normalizeContextPath(contextPath: string): string {
  const normalized = path.normalize(contextPath).replaceAll("\\", "/");
  if ((!normalized.startsWith("context/") && !normalized.startsWith("data/")) || normalized.includes("../")) {
    throw error(400, "Context path must point to a workshop context or data file.");
  }
  return normalized;
}

function contextRequirements(metadata: SkillMetadata): ContextRequirement[] {
  return asArray(metadata.contextRequirements).map((item, index) => {
    const record = asRecord(item);
    return {
      id: asString(record.id || `context-${index + 1}`),
      mode: asString(record.mode || "static"),
      path: asString(record.path),
      reason: asString(record.reason || "Required by skill frontmatter."),
    };
  });
}

function isLab06AssessmentSkill(skill: SkillDocument): boolean {
  const requirements = contextRequirements(skill.metadata);
  return (
    skill.metadata.layer === "assessment" &&
    skill.path.startsWith("skills/assessment/") &&
    requirements.length > 0 &&
    requirements.every((requirement) => requirement.mode === "static")
  );
}

function assertLab06AssessmentSkill(skill: SkillDocument) {
  if (skill.metadata.layer !== "assessment") {
    throw error(400, "Lab 07 only executes assessment skills.");
  }
  if (!isLab06AssessmentSkill(skill)) {
    throw error(400, "Lab 07 only runs assessment skills with static context requirements. Retrieval-backed skills move to Lab 08.");
  }
}

function approxTokens(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.35));
}

async function resolveContextRequirement(requirement: ContextRequirement): Promise<ResolvedContext> {
  if (requirement.mode !== "static") {
    throw error(400, `Lab 07 cannot resolve ${requirement.mode} context. Use Lab 08 for retrieval-backed context.`);
  }

  const normalizedPath = normalizeContextPath(requirement.path);
  const content = await readTextFile(normalizedPath);
  return {
    ...requirement,
    path: normalizedPath,
    content,
    approxTokens: approxTokens(content),
  };
}

async function resolveContextBundle(skill: SkillDocument) {
  const schema = await resolveContextRequirement({
    id: "schema.candidate-field-guide",
    mode: "static",
    path: FIELD_GUIDE_PATH,
    reason: "Shared candidate field definitions used by all assessment skills.",
  });

  const requirements = await Promise.all(contextRequirements(skill.metadata).map(resolveContextRequirement));
  return { schema, requirements };
}

function skillSummary(skill: SkillDocument) {
  return {
    path: skill.path,
    metadata: {
      ...skill.metadata,
      contextRequirements: contextRequirements(skill.metadata),
    },
    frontmatter: skill.frontmatter,
    bodyPreview: skill.body.slice(0, 520),
    body: skill.body,
  };
}

function metadataArray(metadata: SkillMetadata, key: string): string[] {
  return asArray(metadata[key]).map(String);
}

function matchesScope(trigger: Candidate, candidate: Candidate, scope = ""): boolean {
  if (candidateId(trigger) === candidateId(candidate)) return false;

  if (scope === "same_network_tuple") {
    return Boolean(
      trigger.src_ip &&
        candidate.src_ip === trigger.src_ip &&
        trigger.dest_ip &&
        candidate.dest_ip === trigger.dest_ip,
    );
  }

  if (scope === "destination") {
    return Boolean(
      trigger.dest_ip &&
        (candidate.dest_ip === trigger.dest_ip || candidate.matched_value === trigger.dest_ip),
    );
  }

  if (scope === "same_process_secondary_flow") {
    return Boolean(
      (trigger.process_guid && candidate.process_guid === trigger.process_guid) ||
        (trigger.host && candidate.host === trigger.host && processName(candidate) === processName(trigger)),
    );
  }

  if (scope === "same_host") {
    return Boolean(trigger.host && candidate.host === trigger.host);
  }

  return true;
}

function collectRelated(trigger: Candidate, specs: CorrelationSpec[], candidates: Candidate[]) {
  return specs.map((spec) => {
    const matches = candidates
      .filter((candidate) => candidateType(candidate) === spec.type)
      .filter((candidate) => matchesScope(trigger, candidate, spec.scope))
      .sort((a, b) => candidateScore(b) - candidateScore(a));

    return {
      spec,
      matches,
    };
  });
}

function uniqueCandidates(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const id = candidateId(candidate);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function collectEvents(bundle: Candidate[], events: EventRecord[]) {
  const ids = new Set(bundle.flatMap(eventIds));
  return events.filter((event) => event.event_id && ids.has(event.event_id));
}

function upstreamCandidateId(upstreamFinding: JsonRecord): string {
  const trigger = asRecord(upstreamFinding.triggerCandidate);
  return asString(trigger.id || trigger.candidate_id || upstreamFinding.candidateId);
}

function upstreamRelatedIds(upstreamFinding: JsonRecord): string[] {
  const refs = asRecord(upstreamFinding.evidenceRefs);
  return asArray(refs.relatedCandidateIds).map(String);
}

function chooseAssessmentEvidence(upstreamFinding: JsonRecord, candidates: Candidate[]) {
  const requestedId = upstreamCandidateId(upstreamFinding);
  const trigger =
    candidates.find((candidate) => candidateId(candidate) === requestedId) ??
    candidates.find((candidate) => candidateId(candidate) === "BEA-001") ??
    candidates[0];

  if (!trigger) {
    throw error(500, "No candidates are available for assessment.");
  }

  const relatedGroups = collectRelated(trigger, ASSESSMENT_CORRELATIONS, candidates);
  const relatedFromRefs = upstreamRelatedIds(upstreamFinding)
    .map((id) => candidates.find((candidate) => candidateId(candidate) === id))
    .filter((candidate): candidate is Candidate => Boolean(candidate));

  return {
    trigger,
    relatedGroups,
    related: uniqueCandidates([...relatedFromRefs, ...relatedGroups.flatMap((group) => group.matches)]),
    resolutionNote: requestedId
      ? `Resolved upstream trigger ${requestedId} to ${candidateId(trigger)}.`
      : `No upstream trigger id was present; fallback generated from ${candidateId(trigger)}.`,
  };
}

function contextText(contextBundle: { schema: ResolvedContext; requirements: ResolvedContext[] }): string {
  return [contextBundle.schema, ...contextBundle.requirements]
    .map((context) => `# ${context.id}\n${context.content}`)
    .join("\n\n");
}

// The harness wraps the loaded assessment skill body as the model's SYSTEM prompt. The model —
// not this code — executes the procedure. This mirrors how assessment skills run in the real
// framework, and matches the detection-skill execution students saw in Lab 06.
function renderAssessmentSkillSystemPrompt(skill: SkillDocument): string {
  return [
    "You are a security analyst executing a loaded assessment skill.",
    `Skill name: ${skill.metadata.name}`,
    `Skill layer: ${skill.metadata.layer ?? "assessment"}`,
    "",
    "## Workshop execution constraints",
    "An upstream detection skill (Lab 06) already produced the DetectionFinding in the user message. Your job is the assessment layer: judge severity / behavioral context using the injected organization context — do NOT re-run detection scoring.",
    "Reason ONLY from the supplied DetectionFinding, the injected context files, and the supporting candidate evidence. Do not invent assets, owners, policies, prior incidents, or threat-intel beyond what the context and candidates carry.",
    "Every claim about business impact, baseline, or history must trace to a line in the injected context — quote or name the source. If the context does not establish something, say so rather than assuming.",
    "If the skill references production graph writes or an output-shape document, represent the AssessmentFinding as Markdown text in this workshop run.",
    "",
    "## Loaded skill procedure",
    skill.body,
  ].join("\n");
}

// The upstream DetectionFinding + the resolved (injected) context bundle + the supporting
// candidate evidence become the model's USER prompt, alongside the output instructions.
function buildAssessmentUserPrompt(
  skill: SkillDocument,
  upstreamFinding: JsonRecord,
  contextBundle: { schema: ResolvedContext; requirements: ResolvedContext[] },
  evidenceBundle: unknown,
): string {
  const isBehavioral = skill.metadata.name === "assess-behavioral-context";
  const sections = isBehavioral
    ? [
        "- behavioralVerdict (e.g. \"Baseline plausible\" or \"Materially anomalous\")",
        "- what is baseline-consistent (cite the user/host context line)",
        "- what is a material deviation from the established baseline",
        "- a contextJudgement: does the context strengthen or weaken the detection, and why",
        "- uncertainty: what the local context cannot establish on its own",
      ]
    : [
        "- severity (Low / Medium / High / Critical) with the reasoning",
        "- operationalBottomLine: the one-line decision this drives",
        "- businessImpact (cite the asset/owner/role context lines)",
        "- escalationRationale (cite the escalation / evidence-preservation policy)",
        "- recommendedResponse: evidence-preserving actions before cleanup",
        "- uncertainty: what the workshop dataset cannot establish",
      ];

  return [
    "Run the loaded assessment skill against the upstream DetectionFinding using the injected context.",
    "Separate technical confidence (already established upstream) from business/behavioral judgement (your job here).",
    "Return an AssessmentFinding as concise Markdown. For teaching clarity, include:",
    ...sections,
    "Name the injected context file behind each contextual claim so the grounding is visible.",
    "",
    "## Upstream DetectionFinding",
    JSON.stringify(upstreamFinding, null, 2),
    "",
    "## Injected Context (resolved from the skill's contextRequirements)",
    contextText(contextBundle),
    "",
    "## Supporting Candidate Evidence",
    JSON.stringify(evidenceBundle, null, 2),
  ].join("\n");
}

function buildTrace(
  skill: SkillDocument,
  trigger: Candidate,
  relatedGroups: ReturnType<typeof collectRelated>,
  contextBundle: { schema: ResolvedContext; requirements: ResolvedContext[] },
  bundle: Candidate[],
  events: EventRecord[],
  resolutionNote: string,
): TraceStep[] {
  return [
    {
      step: 1,
      phase: "discover",
      title: "Discover assessment catalog",
      status: "ok",
      detail: "The harness loaded Markdown skills and filtered to static-context assessment skills for Lab 07.",
      result: `Selected ${skill.metadata.name}.`,
    },
    {
      step: 2,
      phase: "inspect",
      title: "Inspect upstream DetectionFinding",
      status: "ok",
      detail: "The selected assessment skill consumes the DetectionFinding produced by Lab 06.",
      result: resolutionNote,
    },
    {
      step: 3,
      phase: "context",
      title: "Resolve declared context",
      status: "ok",
      detail: contextRequirements(skill.metadata)
        .map((requirement) => `${requirement.id} -> ${requirement.path}`)
        .join("; "),
      result: `${contextBundle.requirements.length} task context file(s), ${contextBundle.schema.approxTokens} schema-token estimate, ${contextBundle.requirements.reduce((sum, item) => sum + item.approxTokens, 0)} task-token estimate.`,
    },
    {
      step: 4,
      phase: "query",
      title: "Load supporting candidate evidence",
      status: bundle.length > 1 ? "ok" : "warning",
      detail: relatedGroups
        .map((group) => `${group.spec.type ?? "unknown"} via ${group.spec.scope ?? "any"}: ${group.matches.length}`)
        .join("; "),
      result: `${summarizeCandidate(trigger)}; ${bundle.length} candidate(s), ${events.length} raw event(s) available.`,
    },
    {
      step: 5,
      phase: "execute",
      title: "Invoke the model to execute the skill",
      status: "ok",
      detail: "The harness sends the assessment procedure (system prompt) + the upstream finding, injected context, and supporting evidence (user prompt) to the model. The model reasons over them and writes the AssessmentFinding.",
      result: "Streaming the model's AssessmentFinding below.",
    },
  ];
}

async function loadWorkshopState() {
  const [allSkills, candidates, events] = await Promise.all([
    listSkills(),
    readJsonFile<Candidate[]>(DATA_PATH),
    readJsonFile<EventRecord[]>(EVENT_PATH),
  ]);
  const skills = allSkills.filter(isLab06AssessmentSkill);
  return { skills, candidates, events };
}

export const GET: RequestHandler = async () => {
  const { skills, candidates } = await loadWorkshopState();
  const schema = await resolveContextRequirement({
    id: "schema.candidate-field-guide",
    mode: "static",
    path: FIELD_GUIDE_PATH,
    reason: "Shared candidate field definitions used by all assessment skills.",
  });
  const guide = parseFieldGuide(await readTextFile(FIELD_GUIDE_PATH));
  const candidateReference = buildAssessmentCandidateReference(guide);
  const byType = candidates.reduce<Record<string, number>>((counts, candidate) => {
    const type = candidateType(candidate);
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});

  return json({
    skills: skills.map((skill) => ({ ...skillSummary(skill), candidateReference })),
    schemaContext: schema,
    candidateStats: {
      total: candidates.length,
      byType,
      topCandidates: candidates
        .slice()
        .sort((a, b) => candidateScore(b) - candidateScore(a))
        .slice(0, 6)
        .map(compactCandidate),
    },
  });
};

// Streams the full assessment lifecycle as NDJSON: skill -> trace -> context -> evidence ->
// prompt -> live model tokens -> finding -> done. The AssessmentFinding is produced by a REAL
// model call (the assessment procedure executed against the injected context), not by code.
export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json()) as { skillPath?: string; upstreamFinding?: JsonRecord };
  const skillPath = normalizeSkillPath(body.skillPath ?? "");
  const [skill, candidates, events] = await Promise.all([
    loadSkill(skillPath),
    readJsonFile<Candidate[]>(DATA_PATH),
    readJsonFile<EventRecord[]>(EVENT_PATH),
  ]);
  assertLab06AssessmentSkill(skill);

  const upstreamFinding = asRecord(body.upstreamFinding);
  const contextBundle = await resolveContextBundle(skill);
  const { trigger, relatedGroups, related, resolutionNote } = chooseAssessmentEvidence(upstreamFinding, candidates);
  const bundle = uniqueCandidates([trigger, ...related]);
  const rawEvents = collectEvents(bundle, events);
  const trace = buildTrace(skill, trigger, relatedGroups, contextBundle, bundle, rawEvents, resolutionNote);

  // Full candidate records (not the compact display view) so the model can cite real fields.
  const modelEvidenceBundle = {
    invocationCandidate: trigger,
    supportingCandidates: related,
    rawEvents: rawEvents.slice(0, 12),
    rawEventCount: rawEvents.length,
  };
  const displayEvidenceBundle = {
    trigger: compactCandidate(trigger),
    related: related.map(compactCandidate),
    candidates: bundle.map(compactCandidate),
    rawEvents: rawEvents.slice(0, 12).map((event) => ({
      id: event.event_id,
      type: event.event_type,
      host: event.host,
      timestamp: event.timestamp,
      summary: summarizeEvent(event),
    })),
    rawEventCount: rawEvents.length,
  };

  const systemPrompt = renderAssessmentSkillSystemPrompt(skill);
  const userPrompt = buildAssessmentUserPrompt(skill, upstreamFinding, contextBundle, modelEvidenceBundle);

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        const send = (event: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          send({ type: "skill", skill: skillSummary(skill) });
          for (const step of trace) send({ type: "trace", step });
          send({ type: "context", contextBundle });
          send({ type: "evidence", evidenceBundle: displayEvidenceBundle });
          send({ type: "prompt", systemPrompt, userPrompt });
          send({ type: "model-start", message: "Invoking the model to execute the assessment skill..." });

          const provider = selectProvider();
          const result = await provider.invoke({
            systemPrompt,
            userPrompt,
            onToken: (token) => send({ type: "token", value: token }),
          });

          send({
            type: "finding",
            text: result.text,
            model: result.model,
            usage: result.usage ?? null,
            assessmentType: skill.metadata.name === "assess-behavioral-context" ? "behavioral_context" : "severity",
            skill: skill.metadata.name,
          });
          send({ type: "done" });
        } catch (err) {
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Unknown assessment-execution error",
          });
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-cache",
      },
    },
  );
};
