import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { runInvestigationState } from "../../../../../framework/orchestrator.js";
import { runWorkshopEvals } from "../../../../../framework/evals.js";
import { getVerdictTable } from "../../../../../framework/feedback.js";
import { buildVerdictNotification, createNotifier } from "../../../../../framework/notifications.js";
import { buildFinalReport, saveFinalReport } from "../../../../../framework/report.js";

export const POST: RequestHandler = async () => {
  // The full hunt, end to end, on REAL model output: fan-out detection findings,
  // shared entity graph, graph-grounded narrative, evals over that real state, and
  // the assembled report + notification.
  const { state, findings, narrative, graph } = await runInvestigationState("capstone");
  const evals = runWorkshopEvals(state);
  const verdicts = getVerdictTable();
  const report = await saveFinalReport(buildFinalReport({ verdicts, evals, narrative }));
  const event = buildVerdictNotification({ verdicts, report });
  const notification = await createNotifier({
    NOTIFIER: env.NOTIFIER,
    SLACK_WEBHOOK_URL: env.SLACK_WEBHOOK_URL,
    NOTIFICATION_WEBHOOK_URL: env.NOTIFICATION_WEBHOOK_URL,
  }).notify(event);

  return json({ graph, findings, narrative, evals, report, event, notification, verdicts });
};
