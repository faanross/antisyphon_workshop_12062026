import type { PipelineState, InputEntry, AnalysisEntry } from "./types.js";

// ---------------------------------------------------------------------------
// Create — returns the initial empty state
// ---------------------------------------------------------------------------

export function createPipelineState(sessionId: string): PipelineState {
  return {
    sessionId,
    startedAt: new Date().toISOString(),
    inputs: [],
    analyses: [],
  };
}

// ---------------------------------------------------------------------------
// Transitions — each one takes a state and returns a NEW state
// ---------------------------------------------------------------------------

export function addInput(
  state: PipelineState,
  entry: InputEntry,
): PipelineState {
  return {
    ...state,
    inputs: [...state.inputs, entry],
  };
}

export function addAnalysis(
  state: PipelineState,
  entry: AnalysisEntry,
): PipelineState {
  return {
    ...state,
    analyses: [...state.analyses, entry],
  };
}

// ---------------------------------------------------------------------------
// Query — read accumulated state without modifying it
// ---------------------------------------------------------------------------

export function getAnalysesForInput(
  state: PipelineState,
  inputId: string,
): readonly AnalysisEntry[] {
  return state.analyses.filter((a) => a.basedOnId === inputId);
}
