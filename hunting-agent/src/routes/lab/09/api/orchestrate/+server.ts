import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { runDetectionFanOut } from "../../../../../framework/orchestrator.js";

export const POST: RequestHandler = async () => {
  const progress: unknown[] = [];
  const result = await runDetectionFanOut((event) => progress.push(event));
  return json({ ...result, progress });
};
