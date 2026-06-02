// ---------------------------------------------------------------------------
// Entry types — each stage contributes a different kind of entry
// ---------------------------------------------------------------------------

export interface InputEntry {
  readonly id: string;
  readonly value: string;
  readonly timestamp: string;
}

export interface AnalysisEntry {
  readonly id: string;
  readonly insight: string;
  readonly basedOnId: string;
  readonly model: string;
  readonly timestamp: string;
}

export interface DetectionFinding {
  readonly id: string;
  readonly candidateId: string;
  readonly skillName: string;
  readonly verdict: "true_positive" | "false_positive" | "inconclusive";
  readonly compositeScore: number;
  readonly evidenceSummary: string;
  readonly attackNarrative: string;
  readonly uncertainty: string;
  readonly mitreTechniques: readonly string[];
  readonly evidenceRefs: readonly string[];
}

// ---------------------------------------------------------------------------
// Pipeline state — the single container that carries everything forward
// ---------------------------------------------------------------------------

export interface PipelineState {
  readonly sessionId: string;
  readonly startedAt: string;
  readonly inputs: readonly InputEntry[];
  readonly analyses: readonly AnalysisEntry[];
  readonly findings?: readonly DetectionFinding[];
}
