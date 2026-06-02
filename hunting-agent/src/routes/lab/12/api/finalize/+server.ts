import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { runWorkshopEvals } from "../../../../../framework/evals.js";
import { getVerdictTable, seedFeedback } from "../../../../../framework/feedback.js";
import { runInvestigationState } from "../../../../../framework/orchestrator.js";
import { buildVerdictNotification, createNotifier } from "../../../../../framework/notifications.js";
import { buildFinalReport, saveFinalReport } from "../../../../../framework/report.js";

export const GET: RequestHandler = async () => {
  seedFeedback();
  return json({ verdicts: getVerdictTable() });
};

export const POST: RequestHandler = async () => {
  // Run the REAL investigation: its findings, verdicts, and narrative are produced
  // by model calls (fan-out detection + graph-grounded narrative). The report and
  // notification are then assembled from that real output.
  const { state, narrative } = await runInvestigationState("final-report");
  const evals = runWorkshopEvals(state);
  const verdicts = getVerdictTable();
  const report = await saveFinalReport(buildFinalReport({ verdicts, evals, narrative }));
  const event = buildVerdictNotification({ verdicts, report });
  const notification = await createNotifier({
    NOTIFIER: env.NOTIFIER,
    SLACK_WEBHOOK_URL: env.SLACK_WEBHOOK_URL,
    NOTIFICATION_WEBHOOK_URL: env.NOTIFICATION_WEBHOOK_URL,
  }).notify(event);

  return json({ verdicts, report, event, notification, narrative });
};
