import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EvalResult } from "./evals.js";
import type { VerdictRecord } from "./feedback.js";

export interface FinalReport {
  readonly id: string;
  readonly title: string;
  readonly fileName: string;
  readonly markdown: string;
}

export interface SavedFinalReport {
  readonly id: string;
  readonly title: string;
  readonly fileName: string;
  readonly path: string;
  readonly markdown: string;
}

const REPORT_ID = "INV-2026-POISONED-CODING-ASSISTANT";
const REPORT_TITLE = "Poisoned Coding Assistant Investigation";

function verdictLabel(verdict: VerdictRecord["verdict"]): string {
  switch (verdict) {
    case "true_positive":
      return "True Positive";
    case "false_positive":
      return "False Positive";
    case "inconclusive":
      return "Inconclusive";
  }
}

function renderVerdicts(verdicts: readonly VerdictRecord[]): string {
  return verdicts
    .map((row) => `| ${row.candidateId} | ${verdictLabel(row.verdict)} | ${row.rationale} |`)
    .join("\n");
}

function renderEvals(evals: readonly EvalResult[]): string {
  return evals
    .map((row) => `| ${row.id} | ${row.category} | ${row.passed ? "PASS" : "FAIL"} | ${row.detail} |`)
    .join("\n");
}

export function buildFinalReport(input: {
  readonly verdicts: readonly VerdictRecord[];
  readonly evals: readonly EvalResult[];
  readonly narrative?: string;
  readonly generatedAt?: string;
}): FinalReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const passed = input.evals.filter((row) => row.passed).length;
  const truePositive = input.verdicts.find((row) => row.verdict === "true_positive");
  // Prefer the model-generated campaign narrative; fall back to the static summary
  // only when no narrative was supplied (e.g. report built outside an investigation).
  const executiveSummary = input.narrative?.trim()
    ? input.narrative.trim()
    : `The investigation confirms BEA-001 as the primary malicious finding. The evidence chain links suspicious AI-assisted development activity on DEV-WS03 to PowerShell execution, a user-profile masquerading process, and recurring HTTPS beaconing to 185.225.73.217.

BEA-002 was intentionally retained as a high-scoring false positive. Its CrowdFalcon EDR heartbeat pattern shows why beacon regularity alone is not enough to declare compromise.`;

  const markdown = `# ${REPORT_TITLE}

## Metadata

- **Report ID:** ${REPORT_ID}
- **Generated:** ${generatedAt}
- **Scenario:** Poisoned Coding Assistant
- **Primary candidate:** ${truePositive?.candidateId ?? "None confirmed"}
- **Final verdict:** ${truePositive ? "Confirmed compromise" : "No true positive confirmed"}
- **Eval result:** ${passed}/${input.evals.length} checks passed

## Executive Summary

${executiveSummary}

## Confirmed Finding

- **Candidate:** BEA-001
- **Destination:** 185.225.73.217:443
- **Host:** DEV-WS03 / 10.42.10.45
- **User:** CORP.LOCAL\\jane.roberts
- **Process chain:** Code.exe -> powershell.exe -> svchost-health.exe
- **Verdict:** True Positive

## Attack Timeline

| Time | Event |
|---|---|
| 14:00:00 UTC | AI workflow fetches poisoned vendor documentation from docs.apexlibrary.io. |
| 14:00:12 UTC | Code.exe spawns PowerShell with encoded command content. |
| 14:00:18 UTC | PowerShell downloads payload from attacker infrastructure. |
| 14:00:28 UTC | svchost-health.exe launches from the user's temp directory. |
| 14:00:30-20:00 UTC | svchost-health.exe beacons over HTTPS to 185.225.73.217. |

## Evidence Summary

- Distillation identified regular beacon-like HTTPS traffic with a 0.90 beacon score.
- Tooling separated BEA-001 from the higher-scoring BEA-002 false positive.
- External-intelligence shaped checks enriched the C2 destination and technique context.
- Prior-investigation retrieval showed similar benign cases, but the current process chain and destination rarity materially differ.
- The graph path connected host, user, process, destination, candidate, and finding entities.

## Analyst Verdicts

| Candidate | Verdict | Rationale |
|---|---|---|
${renderVerdicts(input.verdicts)}

## Eval Results

| Check | Category | Status | Detail |
|---|---|---|---|
${renderEvals(input.evals)}

## Recommended Actions

1. Isolate DEV-WS03 and preserve volatile evidence.
2. Block 185.225.73.217 at the egress boundary.
3. Collect Code.exe, PowerShell, and svchost-health.exe execution artifacts.
4. Review recent AI-assistant context, extension, dependency, and documentation fetches.
5. Hunt for the same destination, process path, and PowerShell pattern across developer workstations.
6. Index this report into the RAG corpus after incident review.
`;

  return {
    id: REPORT_ID,
    title: REPORT_TITLE,
    fileName: `${REPORT_ID}.md`,
    markdown,
  };
}

export async function saveFinalReport(
  report: FinalReport,
  outputDir = path.join(process.cwd(), "reports"),
): Promise<SavedFinalReport> {
  await mkdir(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, report.fileName);
  await writeFile(reportPath, report.markdown, "utf8");
  return { ...report, path: reportPath };
}
