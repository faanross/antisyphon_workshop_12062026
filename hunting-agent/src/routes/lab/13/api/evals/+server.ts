import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { EVAL_CHECKS, runWorkshopEvals } from "../../../../../framework/evals.js";
import { getVerdictTable, seedFeedback } from "../../../../../framework/feedback.js";
import { runInvestigationState } from "../../../../../framework/orchestrator.js";

// GET lists the eval definitions in a not-yet-run state so the dashboard can show
// what WILL be checked before the (real, ~model-latency) investigation is run.
export const GET: RequestHandler = async () => {
  seedFeedback();
  const evals = EVAL_CHECKS.map((check) => ({
    ...check,
    passed: false,
    detail: "Not run yet — run the harness to evaluate the live investigation.",
  }));
  return json({ evals, verdicts: getVerdictTable() });
};

// POST runs the REAL investigation (fan-out detection + graph-grounded narrative)
// and evaluates that live output. The eval checks themselves stay deterministic
// (a test oracle should not be probabilistic) but they now grade real model work.
export const POST: RequestHandler = async () => {
  const { state } = await runInvestigationState("eval-harness");
  return json({ evals: runWorkshopEvals(state), verdicts: getVerdictTable() });
};
