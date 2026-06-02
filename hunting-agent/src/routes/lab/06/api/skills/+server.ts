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
  process_guid?: string;
  process_name?: string;
  image?: string;
  parent_image?: string;
  compositeScore?: number;
  constituent_event_ids?: string[];
};

type CorrelationSpec = {
  type?: string;
  scope?: string;
};

type TraceStep = {
  step: number;
  phase: "discover" | "inspect" | "query" | "bundle" | "execute";
  title: string;
  status: "ok" | "warning";
  detail: string;
  result: string;
};

const DATA_PATH = "src/lib/data/workshop/candidates_enriched.json";
const FIELD_GUIDE_PATH = "context/schema/candidate-field-guide.md";

// Human-readable meaning of each correlation scope (the logic lives in matchesScope()).
// Surfaced in the Reference tab so the correlatingCandidates frontmatter is not a black box.
const SCOPE_DESCRIPTIONS: Record<string, string> = {
  same_network_tuple: "Same source IP + destination IP pair as the triggering candidate.",
  destination: "Same destination IP / domain as the triggering candidate.",
  same_process_secondary_flow: "Emitted by the same process (or same host + process name) as the trigger.",
  same_host: "Observed on the same host as the triggering candidate.",
};

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

function normalizeSkillPath(skillPath: string): string {
  const normalized = path.normalize(skillPath).replaceAll("\\", "/");
  if (!normalized.startsWith("skills/") || normalized.includes("../")) {
    throw error(400, "Skill path must point to a workshop skill under skills/.");
  }
  return normalized;
}

function assertDetectionSkill(skill: SkillDocument) {
  if (skill.metadata.layer !== "detection") {
    throw error(400, "Lab 06 only executes detection skills. Assessment skills are introduced in Lab 07.");
  }
}

function skillSummary(skill: SkillDocument) {
  return {
    path: skill.path,
    metadata: skill.metadata,
    frontmatter: skill.frontmatter,
    bodyPreview: skill.body.slice(0, 520),
    body: skill.body,
  };
}

function correlationSpecs(metadata: SkillMetadata): CorrelationSpec[] {
  return asArray(metadata.correlatingCandidates).map((item) => {
    const record = asRecord(item);
    return {
      type: asString(record.type),
      scope: asString(record.scope),
    };
  });
}

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

// For one skill: the reference for its trigger candidate type + each correlating type, with the
// scope explained. Turns the frontmatter's candidate-type names into self-contained teaching.
function buildCandidateReference(skill: SkillDocument, guide: Record<string, CandidateTypeDoc>): CandidateRef[] {
  const fallback: CandidateTypeDoc = { description: "No field-guide entry for this candidate type.", fields: [] };
  const refs: CandidateRef[] = [];

  const triggerType = asString(skill.metadata.invocationTriggerCandidate);
  if (triggerType) {
    refs.push({ type: triggerType, role: "trigger", ...(guide[triggerType] ?? fallback) });
  }

  for (const spec of correlationSpecs(skill.metadata)) {
    const type = spec.type ?? "";
    if (!type) continue;
    refs.push({
      type,
      role: "correlating",
      scope: spec.scope || undefined,
      scopeDescription: spec.scope ? SCOPE_DESCRIPTIONS[spec.scope] ?? "Custom correlation scope." : undefined,
      ...(guide[type] ?? fallback),
    });
  }

  return refs;
}

function evaluateGate(candidate: Candidate, gate: JsonRecord): { pass: boolean; notes: string[] } {
  const notes: string[] = [];
  let pass = true;

  if (typeof gate.minBeaconScore === "number") {
    const score = numberValue(candidate.beacon_score);
    const ok = score >= gate.minBeaconScore;
    notes.push(`beacon_score ${score.toFixed(2)} ${ok ? ">=" : "<"} ${gate.minBeaconScore}`);
    pass = pass && ok;
  }

  if (typeof gate.minScore === "number") {
    const score = candidateScore(candidate);
    const ok = score >= gate.minScore;
    notes.push(`compositeScore ${score.toFixed(2)} ${ok ? ">=" : "<"} ${gate.minScore}`);
    pass = pass && ok;
  }

  if (typeof gate.observedService === "string") {
    const observed = asString(candidate.observed_service);
    if (observed) {
      const ok = observed === gate.observedService;
      notes.push(`observed_service ${observed} ${ok ? "matches" : "does not match"} ${gate.observedService}`);
      pass = pass && ok;
    } else {
      notes.push(`observed_service not present on candidate, gate left as analyst review`);
    }
  }

  if (Array.isArray(gate.parentImageContains)) {
    const parentImage = asString(candidate.parent_image).toLowerCase();
    const required = gate.parentImageContains.map((item) => String(item).toLowerCase());
    const ok = required.some((item) => parentImage.includes(item));
    notes.push(`parent image ${ok ? "matches" : "does not match"} ${required.join(", ")}`);
    pass = pass && ok;
  }

  return { pass, notes };
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

function chooseTrigger(skill: SkillDocument, candidates: Candidate[]) {
  const triggerType = asString(skill.metadata.invocationTriggerCandidate);
  const gate = asRecord(skill.metadata.invocationGate);
  const specs = correlationSpecs(skill.metadata);

  if (!triggerType) {
    throw error(400, "Detection skills must declare invocationTriggerCandidate.");
  }

  const gated = candidates
    .filter((candidate) => candidateType(candidate) === triggerType)
    .map((candidate) => {
      const gateResult = evaluateGate(candidate, gate);
      const relatedGroups = collectRelated(candidate, specs, candidates);
      const relatedCount = relatedGroups.reduce((count, group) => count + group.matches.length, 0);
      const lotsPenalty = candidateLots(candidate) !== "false" && candidateLots(candidate) !== "none" ? 1.5 : 0;
      return {
        candidate,
        gateResult,
        relatedGroups,
        rank: relatedCount * 2 + candidateScore(candidate) - lotsPenalty,
      };
    })
    .filter((entry) => entry.gateResult.pass)
    .sort((a, b) => b.rank - a.rank);

  const selected = gated[0];
  if (!selected) {
    const fallback = candidates.find((candidate) => candidateType(candidate) === triggerType) ?? candidates[0];
    return {
      trigger: fallback,
      gateNotes: [`No ${triggerType} candidate fully passed the invocation gate; falling back to top available candidate.`],
      relatedGroups: collectRelated(fallback, specs, candidates),
    };
  }

  return {
    trigger: selected.candidate,
    gateNotes: selected.gateResult.notes,
    relatedGroups: selected.relatedGroups,
  };
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

// The harness wraps the loaded skill body as the model's SYSTEM prompt. The model — not this
// code — executes the procedure. This mirrors how detection skills run in the real framework.
function renderDetectionSkillSystemPrompt(skill: SkillDocument): string {
  return [
    "You are a security analyst executing a loaded detection skill.",
    `Skill name: ${skill.metadata.name}`,
    `Skill layer: ${skill.metadata.layer ?? "detection"}`,
    "",
    "## Workshop execution constraints",
    "The harness has already run the candidate-query tool for you and assembled the evidence bundle in the user message.",
    "Use ONLY the supplied candidate evidence bundle. Do not invent candidates, events, payload contents, or external asset / threat-intel context beyond what the candidates carry.",
    "If the skill references production graph writes or an output-shape document, represent the finding as Markdown text in this workshop run.",
    "",
    "## Loaded skill procedure",
    skill.body,
  ].join("\n");
}

// The evidence bundle the harness assembled (deterministically, via the invocation gate +
// correlation scopes) becomes the model's USER prompt, alongside the output instructions.
function buildDetectionUserPrompt(evidenceBundle: unknown): string {
  return [
    "Run the loaded detection skill against this candidate evidence bundle.",
    "Treat an absent correlating candidate as absent evidence (score 0 on its dimension), not as failure.",
    "Return a DetectionFinding as concise Markdown. For teaching clarity, include:",
    "- which candidate categories were present vs absent",
    "- each scored dimension as a passthrough of the source candidate's compositeScore, with the decisive evidence",
    "- compositeScore = max(statistical_beacon_pattern, infrastructure_reputation, tls_anomaly_signature)",
    "- process-mediated secondary transfer reported as RELATED activity, kept OUT of the composite",
    "- benignFallbackRuledOut",
    "- a short reasoningChain where every claim traces to a candidate field",
    "- evidenceRefs: the candidate IDs that fired and their constituent event IDs",
    "",
    "## Candidate Evidence Bundle",
    JSON.stringify(evidenceBundle, null, 2),
  ].join("\n");
}

// Full candidate records (not the compact display view) so the model can cite real fields.
function buildEvidenceBundle(
  skill: SkillDocument,
  trigger: Candidate,
  relatedGroups: ReturnType<typeof collectRelated>,
) {
  const correlatingCandidates: Record<string, Candidate[]> = {};
  for (const group of relatedGroups) {
    const type = group.spec.type ?? "unknown";
    correlatingCandidates[type] = (correlatingCandidates[type] ?? []).concat(group.matches);
  }

  return {
    skill: {
      name: skill.metadata.name,
      layer: skill.metadata.layer,
      invocationTriggerCandidate: skill.metadata.invocationTriggerCandidate,
      invocationGate: skill.metadata.invocationGate,
      correlatingCandidates: skill.metadata.correlatingCandidates,
    },
    invocationCandidate: trigger,
    correlatingCandidates,
    querySummary: {
      [candidateType(trigger)]: 1,
      ...Object.fromEntries(
        Object.entries(correlatingCandidates).map(([type, list]) => [type, list.length]),
      ),
    },
  };
}

function buildTrace(
  skill: SkillDocument,
  trigger: Candidate,
  relatedGroups: ReturnType<typeof collectRelated>,
  bundle: Candidate[],
  gateNotes: string[],
): TraceStep[] {
  return [
    {
      step: 1,
      phase: "discover",
      title: "Discover skill catalog",
      status: "ok",
      detail: "The harness loaded Markdown skills from the skills/ directory and parsed YAML frontmatter.",
      result: `Selected ${skill.metadata.name} from catalog.`,
    },
    {
      step: 2,
      phase: "inspect",
      title: "Inspect invocation metadata",
      status: "ok",
      detail: `Trigger: ${skill.metadata.invocationTriggerCandidate ?? "DetectionFinding"}; layer: ${skill.metadata.layer ?? "unknown"}.`,
      result: gateNotes.length ? gateNotes.join("; ") : "No invocation gate declared.",
    },
    {
      step: 3,
      phase: "query",
      title: "Query triggering candidate",
      status: "ok",
      detail: `Matched trigger evidence from ${DATA_PATH}.`,
      result: summarizeCandidate(trigger),
    },
    {
      step: 4,
      phase: "bundle",
      title: "Assemble correlated evidence",
      status: bundle.length > 1 ? "ok" : "warning",
      detail: relatedGroups
        .map((group) => `${group.spec.type ?? "unknown"} via ${group.spec.scope ?? "any"}: ${group.matches.length}`)
        .join("; "),
      result: `${bundle.length} candidate(s) in the evidence bundle.`,
    },
    {
      step: 5,
      phase: "execute",
      title: "Invoke the model to execute the skill",
      status: "ok",
      detail: "The harness sends the skill procedure (system prompt) + the candidate evidence bundle (user prompt) to the model. The model reasons over the evidence and produces the DetectionFinding.",
      result: "Streaming the model's DetectionFinding below.",
    },
  ];
}

async function loadWorkshopState() {
  const [allSkills, candidates] = await Promise.all([
    listSkills(),
    readJsonFile<Candidate[]>(DATA_PATH),
  ]);
  const skills = allSkills.filter((skill) => skill.metadata.layer === "detection");

  return { skills, candidates };
}

export const GET: RequestHandler = async () => {
  const { skills, candidates } = await loadWorkshopState();
  const guide = parseFieldGuide(await readTextFile(FIELD_GUIDE_PATH));
  const byType = candidates.reduce<Record<string, number>>((counts, candidate) => {
    const type = candidateType(candidate);
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});

  return json({
    skills: skills.map((skill) => ({
      ...skillSummary(skill),
      candidateReference: buildCandidateReference(skill, guide),
    })),
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

// Streams the full lab lifecycle as NDJSON: skill -> trace -> evidence -> prompt -> live model
// tokens -> finding -> done. The DetectionFinding is produced by a REAL model call, not by code.
export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json()) as { skillPath?: string };
  const skillPath = normalizeSkillPath(body.skillPath ?? "");
  const [skill, candidates] = await Promise.all([
    loadSkill(skillPath),
    readJsonFile<Candidate[]>(DATA_PATH),
  ]);
  assertDetectionSkill(skill);

  const { trigger, relatedGroups, gateNotes } = chooseTrigger(skill, candidates);
  const related = uniqueCandidates(relatedGroups.flatMap((group) => group.matches));
  const bundle = uniqueCandidates([trigger, ...related]);
  const trace = buildTrace(skill, trigger, relatedGroups, bundle, gateNotes);
  const evidenceBundle = buildEvidenceBundle(skill, trigger, relatedGroups);
  const systemPrompt = renderDetectionSkillSystemPrompt(skill);
  const userPrompt = buildDetectionUserPrompt(evidenceBundle);

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
          send({
            type: "evidence",
            evidenceBundle: {
              trigger: compactCandidate(trigger),
              related: related.map(compactCandidate),
              querySummary: evidenceBundle.querySummary,
            },
          });
          send({ type: "prompt", systemPrompt, userPrompt });
          send({ type: "model-start", message: "Invoking the model to execute the detection skill..." });

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
          });
          send({ type: "done" });
        } catch (error) {
          send({
            type: "error",
            message: error instanceof Error ? error.message : "Unknown detection-execution error",
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
