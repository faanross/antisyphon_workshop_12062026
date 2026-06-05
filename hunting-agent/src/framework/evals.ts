import type { PipelineState } from "./types.js";
import { getSkillPerformance, getVerdictTable } from "./feedback.js";

export interface EvalCheck {
  id: string;
  category: string;
  description: string;
  expected: string;
  verify: string;
}

export interface EvalResult extends EvalCheck {
  passed: boolean;
  detail: string;
}

export const EVAL_CHECKS: EvalCheck[] = [
  {
    id: 'EVAL-001',
    category: 'detection_accuracy',
    description: 'System identified C2 beacon 185.225.73.217 as top-priority candidate',
    expected: 'C2 beacon ranked as highest-priority threat after triage',
    verify: 'Search state.analyses for 185.225.73.217 or C2 plus top/priority/highest/primary',
  },
  {
    id: 'EVAL-002',
    category: 'triage_quality',
    description: 'System correctly triaged CrowdFalcon EDR heartbeat as likely benign',
    expected: 'CrowdFalcon classified as benign/false positive',
    verify: 'Search state.analyses for CrowdFalcon or 104.18.32.7 plus benign/false positive/legitimate/EDR',
  },
  {
    id: 'EVAL-003',
    category: 'detection_accuracy',
    description: 'hunt-c2-over-https produced DetectionFinding with compositeScore > 0.8',
    expected: 'DetectionFinding exists with composite score above 0.8',
    verify: 'Search state.analyses for hunt-c2-over-https and compositeScore',
  },
  {
    id: 'EVAL-004',
    category: 'severity_assessment',
    description: 'Assessment flagged high or critical severity given CI/CD admin asset',
    expected: 'Severity rated HIGH or CRITICAL with business context justification',
    verify: 'Search state.analyses for severity plus HIGH/CRITICAL and CI/CD/pipeline/business',
  },
  {
    id: 'EVAL-005',
    category: 'attack_chain_reconstruction',
    description: 'Narrative connected the Code.exe → PowerShell process chain to the C2 beacon through shared entities',
    expected: 'Attack narrative links Code.exe/PowerShell to C2 beaconing',
    verify: 'Search state.analyses for Code.exe and C2/185.225.73.217',
  },
  {
    id: 'EVAL-006',
    category: 'missing_evidence_awareness',
    description: 'System preserved uncertainty where evidence was partial',
    expected: 'Agent acknowledged uncertainty or insufficient evidence',
    verify: 'Search state.analyses for uncertain/insufficient/inconclusive/requires further/limited evidence/partial',
  },
  {
    id: 'EVAL-007',
    category: 'report_quality',
    description: 'At least one verdict has been recorded in the verdict table',
    expected: 'Verdict table contains at least one entry',
    verify: 'getVerdictTable().length > 0',
  },
  {
    id: 'EVAL-008',
    category: 'report_quality',
    description: 'Skill performance tracking is active',
    expected: 'At least one skill has recorded metrics',
    verify: 'getSkillPerformance("hunt-c2-over-https").totalFindings > 0',
  },
];

function stateText(state: PipelineState): string {
  return JSON.stringify(
    {
      inputs: state.inputs,
      analyses: state.analyses,
      findings: state.findings ?? [],
    },
    null,
    2,
  ).toLowerCase();
}

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function checkEval(check: EvalCheck, state: PipelineState): EvalResult {
  const text = stateText(state);
  const findings = state.findings ?? [];
  let passed = false;
  let detail = "No matching evidence found in state.";

  switch (check.id) {
    case "EVAL-001": {
      // Structural: a detection skill confirmed the C2 beacon as a true positive.
      const c2 = findings.find(
        (finding) =>
          finding.verdict === "true_positive" &&
          (finding.candidateId === "BEA-001" ||
            finding.skillName === "hunt-c2-over-https" ||
            finding.evidenceSummary.includes("185.225.73.217")),
      );
      passed = Boolean(c2) && text.includes("185.225.73.217");
      detail = c2
        ? `Detection confirmed ${c2.candidateId} as a true-positive C2 beacon (composite ${c2.compositeScore}).`
        : "Expected a true-positive C2 finding on 185.225.73.217 / BEA-001 in the findings.";
      break;
    }
    case "EVAL-002": {
      // Structural: the system triaged at least one high-scoring beacon as benign,
      // i.e. it did NOT flag every regular beacon as malicious.
      const benign = findings.find((finding) => finding.verdict === "false_positive");
      passed = Boolean(benign);
      detail = benign
        ? `System triaged ${benign.candidateId} as a false positive (${benign.evidenceSummary.slice(0, 80)}).`
        : "Expected at least one high-scoring beacon to be triaged as a false positive.";
      break;
    }
    case "EVAL-003":
      passed = findings.some(
        (finding) => finding.skillName === "hunt-c2-over-https" && finding.compositeScore > 0.8,
      );
      detail = passed
        ? "A hunt-c2-over-https DetectionFinding exceeded the 0.8 composite-score bar."
        : "No hunt-c2-over-https DetectionFinding above 0.8 was present in state.findings.";
      break;
    case "EVAL-004":
      passed = includesAny(text, ["high", "critical"]) && includesAny(text, ["ci/cd", "pipeline", "business"]);
      detail = passed
        ? "Assessment includes high/critical severity with business or CI/CD context."
        : "Expected high/critical severity tied to business or CI/CD impact.";
      break;
    case "EVAL-005":
      passed = text.includes("code.exe") && includesAny(text, ["c2", "185.225.73.217"]);
      detail = passed
        ? "Narrative links Code.exe/PowerShell activity to C2 evidence."
        : "Expected the attack narrative to connect Code.exe/PowerShell to the C2 beacon.";
      break;
    case "EVAL-006": {
      const withUncertainty = findings.some((finding) => finding.uncertainty.trim().length > 0);
      passed =
        withUncertainty ||
        includesAny(text, ["uncertain", "insufficient", "inconclusive", "requires further", "limited evidence", "partial"]);
      detail = passed
        ? "Findings preserve uncertainty / call out partial or incomplete evidence."
        : "Expected explicit uncertainty language where evidence is incomplete.";
      break;
    }
    case "EVAL-007":
      passed = getVerdictTable().length > 0;
      detail = passed
        ? `Verdict table contains ${getVerdictTable().length} recorded verdict(s).`
        : "Verdict table is empty.";
      break;
    case "EVAL-008":
      passed = getSkillPerformance("hunt-c2-over-https").totalFindings > 0;
      detail = passed
        ? "Skill performance tracking has recorded hunt-c2-over-https findings."
        : "No skill performance metrics recorded for hunt-c2-over-https.";
      break;
  }

  return { ...check, passed, detail };
}

export function runWorkshopEvals(state: PipelineState): EvalResult[] {
  return EVAL_CHECKS.map((check) => checkEval(check, state));
}
