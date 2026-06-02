// ---------------------------------------------------------------------------
// Real detection-skill execution (framework world)
//
// This is the genuine model-calling path that the orchestration labs (fan-out,
// capstone) reuse. Each detection skill is loaded from Markdown, its invocation
// gate + correlation scopes are evaluated deterministically by the harness, and
// then the MODEL — not this code — executes the skill procedure against the
// assembled candidate evidence and returns a DetectionFinding as JSON.
//
// It mirrors the per-skill detection execution students see in Lab 06; here the
// orchestrator runs many of these concurrently (fan-out) and collects the
// structured findings (fan-in).
// ---------------------------------------------------------------------------

import { listSkills, type SkillDocument, type SkillMetadata } from "./skill-loader.js";
import type { LLMProvider } from "./providers/types.js";
import type { Candidate } from "./loaders.js";
import type { DetectionFinding } from "./types.js";

type CorrelationSpec = { type?: string; scope?: string };

const VALID_VERDICTS: ReadonlyArray<DetectionFinding["verdict"]> = [
  "true_positive",
  "false_positive",
  "inconclusive",
];

function asString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function field(candidate: Candidate, key: string): unknown {
  return (candidate as Record<string, unknown>)[key];
}

function candidateScore(candidate: Candidate): number {
  return Math.max(
    numberValue(candidate.compositeScore),
    numberValue(candidate.beacon_score),
    numberValue(field(candidate, "tls_anomaly_score")),
    numberValue(field(candidate, "data_transfer_score")),
    numberValue(field(candidate, "unusual_parent_child_anomaly_score")),
    numberValue(field(candidate, "powershell_invocation_anomaly_score")),
    numberValue(field(candidate, "cert_anomaly_score")),
  );
}

function processName(candidate: Candidate): string {
  return (
    asString(candidate.process_name || field(candidate, "image") || "unknown-process")
      .split("\\")
      .at(-1) ?? "unknown-process"
  );
}

// ── Invocation gate (matches the Lab 06 gate semantics) ─────────────────────

function gatePasses(candidate: Candidate, gate: Record<string, unknown>): boolean {
  if (typeof gate.minBeaconScore === "number") {
    if (numberValue(candidate.beacon_score) < gate.minBeaconScore) return false;
  }
  if (typeof gate.minScore === "number") {
    if (candidateScore(candidate) < gate.minScore) return false;
  }
  if (typeof gate.observedService === "string") {
    // If the candidate carries observed_service, it must match. If absent, leave
    // it to analyst review (do not fail the gate) — same as the Lab 06 harness.
    const observed = asString(field(candidate, "observed_service"));
    if (observed && observed !== gate.observedService) return false;
  }
  if (Array.isArray(gate.parentImageContains)) {
    const parentImage = asString(field(candidate, "parent_image")).toLowerCase();
    const required = gate.parentImageContains.map((item) => String(item).toLowerCase());
    if (!required.some((item) => parentImage.includes(item))) return false;
  }
  return true;
}

// ── Correlation scopes (matches the Lab 06 scope semantics) ─────────────────

function matchesScope(trigger: Candidate, candidate: Candidate, scope = ""): boolean {
  if (trigger.candidate_id === candidate.candidate_id) return false;

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
        (candidate.dest_ip === trigger.dest_ip || field(candidate, "matched_value") === trigger.dest_ip),
    );
  }
  if (scope === "same_process_secondary_flow") {
    return Boolean(
      (field(trigger, "process_guid") && field(candidate, "process_guid") === field(trigger, "process_guid")) ||
        (trigger.host && candidate.host === trigger.host && processName(candidate) === processName(trigger)),
    );
  }
  if (scope === "same_host") {
    return Boolean(trigger.host && candidate.host === trigger.host);
  }
  return true;
}

function correlationSpecs(metadata: SkillMetadata): CorrelationSpec[] {
  const raw = metadata.correlatingCandidates;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const record = (item ?? {}) as Record<string, unknown>;
    return { type: asString(record.type), scope: asString(record.scope) };
  });
}

function collectRelated(trigger: Candidate, specs: CorrelationSpec[], candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const related: Candidate[] = [];
  for (const spec of specs) {
    const matches = candidates
      .filter((candidate) => candidate.type === spec.type)
      .filter((candidate) => matchesScope(trigger, candidate, spec.scope))
      .sort((a, b) => candidateScore(b) - candidateScore(a));
    for (const match of matches) {
      if (seen.has(match.candidate_id)) continue;
      seen.add(match.candidate_id);
      related.push(match);
    }
  }
  return related;
}

// ── Prompts (the skill body is the system prompt; evidence is the user prompt)

function renderDetectionSystemPrompt(skill: SkillDocument): string {
  return [
    "You are a security analyst executing a loaded detection skill.",
    `Skill name: ${skill.metadata.name}`,
    `Skill layer: ${skill.metadata.layer ?? "detection"}`,
    "",
    "## Workshop execution constraints",
    "The harness has already run the candidate-query tool for you and assembled the evidence bundle in the user message.",
    "Use ONLY the supplied candidate evidence. Do not invent candidates, events, payload contents, or external asset / threat-intel context beyond what the candidates carry.",
    "Treat an absent correlating candidate as absent evidence (score 0 on its dimension), not as failure.",
    "",
    "## Loaded skill procedure",
    skill.body,
  ].join("\n");
}

function buildDetectionUserPrompt(trigger: Candidate, related: Candidate[]): string {
  const bundle = {
    invocationCandidate: trigger,
    correlatingCandidates: related,
  };
  return [
    "Run the loaded detection skill against this candidate evidence bundle and return a DetectionFinding.",
    "",
    "Return ONLY a single JSON object — no prose, no markdown fences — with EXACTLY these keys:",
    '{',
    '  "verdict": "true_positive" | "false_positive" | "inconclusive",',
    '  "compositeScore": number,   // max of the decisive malicious dimensions, never an average',
    '  "evidenceSummary": string,  // one or two sentences naming the decisive evidence',
    '  "attackNarrative": string,  // what the evidence indicates, grounded only in the candidates',
    '  "uncertainty": string,      // what the evidence cannot establish',
    '  "mitreTechniques": string[] // ATT&CK technique IDs supported by the evidence',
    '}',
    "Every claim must trace to a candidate field. Do not add keys beyond those listed.",
    "",
    "## Candidate Evidence Bundle",
    JSON.stringify(bundle, null, 2),
  ].join("\n");
}

// ── Parsing the model's JSON into a typed DetectionFinding ───────────────────

function extractJsonObject(text: string): string | undefined {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return undefined;
  return candidate.slice(start, end + 1);
}

function coerceVerdict(value: unknown): DetectionFinding["verdict"] {
  const normalized = asString(value).toLowerCase().replace(/[\s-]+/g, "_");
  return (VALID_VERDICTS as readonly string[]).includes(normalized)
    ? (normalized as DetectionFinding["verdict"])
    : "inconclusive";
}

function toDetectionFinding(
  rawText: string,
  skill: SkillDocument,
  trigger: Candidate,
  related: Candidate[],
): DetectionFinding {
  const jsonText = extractJsonObject(rawText);
  if (!jsonText) {
    throw new Error(`Model did not return a JSON DetectionFinding. Raw: ${rawText.slice(0, 200)}`);
  }
  const parsed = JSON.parse(jsonText) as Record<string, unknown>;

  const compositeScore = typeof parsed.compositeScore === "number" && Number.isFinite(parsed.compositeScore)
    ? parsed.compositeScore
    : candidateScore(trigger);

  return {
    id: `FIND-${trigger.candidate_id}`,
    candidateId: trigger.candidate_id,
    skillName: skill.metadata.name,
    verdict: coerceVerdict(parsed.verdict),
    compositeScore,
    evidenceSummary: asString(parsed.evidenceSummary) || `${trigger.candidate_id} (${trigger.type})`,
    attackNarrative: asString(parsed.attackNarrative),
    uncertainty: asString(parsed.uncertainty),
    mitreTechniques: Array.isArray(parsed.mitreTechniques) ? parsed.mitreTechniques.map(String) : [],
    evidenceRefs: [
      ...(trigger.constituent_event_ids ?? []),
      ...related.flatMap((candidate) => candidate.constituent_event_ids ?? []),
    ],
  };
}

// ── Public surface ───────────────────────────────────────────────────────────

export interface DetectionInvocation {
  readonly skill: SkillDocument;
  readonly trigger: Candidate;
  readonly related: Candidate[];
}

/** Load detection skills and pair each with every candidate that passes its gate. */
export async function planDetectionInvocations(candidates: Candidate[]): Promise<DetectionInvocation[]> {
  const skills = (await listSkills()).filter((skill) => skill.metadata.layer === "detection");
  const invocations: DetectionInvocation[] = [];

  for (const skill of skills) {
    const triggerType = asString(skill.metadata.invocationTriggerCandidate);
    if (!triggerType) continue;
    const gate = (skill.metadata.invocationGate ?? {}) as Record<string, unknown>;
    const specs = correlationSpecs(skill.metadata);

    for (const candidate of candidates) {
      if (candidate.type !== triggerType) continue;
      if (!gatePasses(candidate, gate)) continue;
      invocations.push({
        skill,
        trigger: candidate,
        related: collectRelated(candidate, specs, candidates),
      });
    }
  }
  return invocations;
}

/** Execute ONE detection skill against ONE trigger via a real model call. */
export async function executeDetectionInvocation(
  provider: LLMProvider,
  invocation: DetectionInvocation,
): Promise<{ finding: DetectionFinding; model: string }> {
  const { skill, trigger, related } = invocation;
  const result = await provider.invoke({
    systemPrompt: renderDetectionSystemPrompt(skill),
    userPrompt: buildDetectionUserPrompt(trigger, related),
  });
  return {
    finding: toDetectionFinding(result.text, skill, trigger, related),
    model: result.model,
  };
}
