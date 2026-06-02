import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { loadWorkshopGraph } from "../../../../../framework/graph.js";
import { runInvestigation } from "../../../../../framework/orchestrator.js";

export const POST: RequestHandler = async () => {
  const progress: unknown[] = [];
  const [graph, investigation] = await Promise.all([
    loadWorkshopGraph(),
    runInvestigation((event) => progress.push(event)),
  ]);
  return json({ graph, ...investigation, progress });
};
