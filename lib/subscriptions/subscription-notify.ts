import { enqueuePlanEmail } from "@/lib/email/email-jobs";
import type { PlanEmailEvent } from "@/lib/email/templates/plan";
import { createNotification, preferenceFor, type NotificationPriority, type NotificationTopic } from "@/lib/notifications/notifications";
import type { CoreAccount, CoreState } from "@/lib/server/core-state";
import { subscriptionStatusLabels, type ManualSubscriptionRequest } from "./manual-subscription";

export function addSubscriptionNotification(
  state: CoreState,
  account: CoreAccount,
  request: ManualSubscriptionRequest,
  input: {
    topic: NotificationTopic;
    title: string;
    summary: string;
    priority: NotificationPriority;
    emailEvent?: PlanEmailEvent;
  }
) {
  const preferences = Array.isArray(state.notificationPreferences) ? state.notificationPreferences : [];
  const preference = preferenceFor(preferences, account.id, input.topic);
  if (preference.inAppEnabled) {
    state.notifications = [
      createNotification({
        userId: account.id,
        topic: input.topic,
        title: input.title,
        summary: input.summary,
        priority: input.priority,
        category: input.topic === "payment_status" ? "payments" : "plan",
        actionUrl: "/?menu=plano"
      }),
      ...(Array.isArray(state.notifications) ? state.notifications : [])
    ].slice(0, 2000);
  }
  if (input.emailEvent && preference.emailEnabled && preference.frequency !== "in_app_only") {
    return enqueuePlanEmail(state, account.id, {
      event: input.emailEvent,
      to: account.email,
      name: account.name,
      planName: request.planName,
      amountInCents: request.amountInCents,
      statusLabel: subscriptionStatusLabels[request.status],
      publicNote: request.publicNote,
      updatedAt: request.updatedAt,
      expiresAt: request.expiresAt
    }, {
      deliverAfter: preference.frequency === "daily" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : preference.frequency === "weekly" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined
    });
  }
  return null;
}