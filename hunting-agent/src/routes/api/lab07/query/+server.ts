import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { runRagInvestigation } from "../../../../framework/demo.js";

export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json()) as { query?: string };
  return json(await runRagInvestigation(body.query ?? ""));
};
