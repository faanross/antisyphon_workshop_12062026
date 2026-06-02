export interface VerdictRecord {
  readonly candidateId: string;
  readonly verdict: "true_positive" | "false_positive" | "inconclusive";
  readonly rationale: string;
  readonly updatedAt: string;
}

export interface SkillPerformance {
  readonly skillName: string;
  readonly totalFindings: number;
  readonly truePositive: number;
  readonly falsePositive: number;
  readonly inconclusive: number;
}

const verdicts = new Map<string, VerdictRecord>();
const skillMetrics = new Map<string, SkillPerformance>();
const allowlist = new Set<string>(["CrowdFalcon EDR", "Microsoft 365", "Azure Backup"]);

export function recordVerdict(record: Omit<VerdictRecord, "updatedAt">): VerdictRecord {
  const saved = { ...record, updatedAt: new Date().toISOString() };
  verdicts.set(record.candidateId, saved);
  return saved;
}

export function getVerdictTable(): VerdictRecord[] {
  return [...verdicts.values()].sort((a, b) => a.candidateId.localeCompare(b.candidateId));
}

export function recordSkillFinding(skillName: string, verdict: VerdictRecord["verdict"]): SkillPerformance {
  const current =
    skillMetrics.get(skillName) ??
    { skillName, totalFindings: 0, truePositive: 0, falsePositive: 0, inconclusive: 0 };
  const next: SkillPerformance = {
    skillName,
    totalFindings: current.totalFindings + 1,
    truePositive: current.truePositive + (verdict === "true_positive" ? 1 : 0),
    falsePositive: current.falsePositive + (verdict === "false_positive" ? 1 : 0),
    inconclusive: current.inconclusive + (verdict === "inconclusive" ? 1 : 0),
  };
  skillMetrics.set(skillName, next);
  return next;
}

export function getSkillPerformance(skillName: string): SkillPerformance {
  return (
    skillMetrics.get(skillName) ??
    { skillName, totalFindings: 0, truePositive: 0, falsePositive: 0, inconclusive: 0 }
  );
}

export function getAllowlist(): string[] {
  return [...allowlist].sort();
}

export function seedFeedback(): void {
  if (verdicts.size > 0) return;
  recordVerdict({
    candidateId: "BEA-001",
    verdict: "true_positive",
    rationale: "Threat intel, rare destination, and suspicious process chain corroborate the beacon.",
  });
  recordVerdict({
    candidateId: "BEA-002",
    verdict: "false_positive",
    rationale: "CrowdFalcon EDR heartbeat is a known service pattern.",
  });
  recordSkillFinding("hunt-c2-over-https", "true_positive");
}
