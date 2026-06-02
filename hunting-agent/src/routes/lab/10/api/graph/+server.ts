import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { loadWorkshopGraph } from "../../../../../framework/graph.js";

export const GET: RequestHandler = async () => {
  return json(await loadWorkshopGraph());
};
