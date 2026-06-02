import type { VerdictRecord } from "./feedback.js";
import type { SavedFinalReport } from "./report.js";

export type NotificationSeverity = "info" | "warning" | "high" | "critical";

export interface NotificationEvent {
  readonly id: string;
  readonly type: "verdict.true_positive" | "report.generated";
  readonly severity: NotificationSeverity;
  readonly title: string;
  readonly message: string;
  readonly candidateId?: string;
  readonly reportPath?: string;
  readonly createdAt: string;
}

export interface NotificationResult {
  readonly channel: "ui" | "slack" | "webhook";
  readonly delivered: boolean;
  readonly detail: string;
}

export interface Notifier {
  notify(event: NotificationEvent): Promise<NotificationResult>;
}

export class UiNotifier implements Notifier {
  async notify(): Promise<NotificationResult> {
    return {
      channel: "ui",
      delivered: true,
      detail: "Returned event to the browser for in-app and browser notification display.",
    };
  }
}

export class SlackWebhookNotifier implements Notifier {
  constructor(private readonly webhookUrl: string) {}

  async notify(event: NotificationEvent): Promise<NotificationResult> {
    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `*${event.title}*\n${event.message}\n${event.reportPath ? `Report: ${event.reportPath}` : ""}`,
      }),
    });

    return {
      channel: "slack",
      delivered: response.ok,
      detail: response.ok ? "Slack webhook accepted the notification." : `Slack webhook returned ${response.status}.`,
    };
  }
}

export class GenericWebhookNotifier implements Notifier {
  constructor(private readonly webhookUrl: string) {}

  async notify(event: NotificationEvent): Promise<NotificationResult> {
    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });

    return {
      channel: "webhook",
      delivered: response.ok,
      detail: response.ok ? "Webhook accepted the notification event." : `Webhook returned ${response.status}.`,
    };
  }
}

export function createNotifier(env: {
  readonly NOTIFIER?: string;
  readonly SLACK_WEBHOOK_URL?: string;
  readonly NOTIFICATION_WEBHOOK_URL?: string;
}): Notifier {
  if ((env.NOTIFIER === "slack" || !env.NOTIFIER) && env.SLACK_WEBHOOK_URL) {
    return new SlackWebhookNotifier(env.SLACK_WEBHOOK_URL);
  }

  if ((env.NOTIFIER === "webhook" || !env.NOTIFIER) && env.NOTIFICATION_WEBHOOK_URL) {
    return new GenericWebhookNotifier(env.NOTIFICATION_WEBHOOK_URL);
  }

  return new UiNotifier();
}

export function buildVerdictNotification(input: {
  readonly verdicts: readonly VerdictRecord[];
  readonly report: SavedFinalReport;
}): NotificationEvent {
  const finding = input.verdicts.find((row) => row.verdict === "true_positive");
  return {
    id: `notification-${Date.now()}`,
    type: finding ? "verdict.true_positive" : "report.generated",
    severity: finding ? "high" : "info",
    title: finding ? `Confirmed threat: ${finding.candidateId}` : "Investigation report generated",
    message: finding
      ? `${finding.candidateId} was confirmed as a true positive. Final report generated and ready for analyst review.`
      : "Final investigation report generated.",
    candidateId: finding?.candidateId,
    reportPath: input.report.path,
    createdAt: new Date().toISOString(),
  };
}
