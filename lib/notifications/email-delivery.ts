import "server-only";

import { sendNotificationEmail } from "@/lib/email/send-notification-email";
import {
  mergeNotificationPreferences,
  notificationEmailIsDue,
  notificationTopics,
  type AppNotification,
  type NotificationTopic
} from "@/lib/notifications/notifications";
import type { CoreAccount, CoreState } from "@/lib/server/core-state";

const validTopics = new Set<NotificationTopic>(notificationTopics.map((item) => item.topic));
const retryDelays = [5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000];

function isNotification(value: unknown): value is AppNotification {
  if (!value || typeof value !== "object") return false;
  const candidate = value as AppNotification;
  return typeof candidate.id === "string" &&
    typeof candidate.userId === "string" &&
    typeof candidate.topic === "string" &&
    validTopics.has(candidate.topic as NotificationTopic);
}

export async function deliverNotificationEmails(
  state: CoreState,
  account: CoreAccount,
  candidates: AppNotification[],
  now = Date.now()
) {
  const preferences = mergeNotificationPreferences(
    account.id,
    Array.isArray(state.notificationPreferences) ? state.notificationPreferences : []
  );
  const candidateIds = new Set(candidates.map((item) => item.id));
  const eligible = (Array.isArray(state.notifications) ? state.notifications : [])
    .filter(isNotification)
    .filter((item) => item.userId === account.id && candidateIds.has(item.id))
    .filter((item) => {
      const preference = preferences.find((value) => value.topic === item.topic);
      return Boolean(preference && notificationEmailIsDue(item, preference, now));
    })
    .slice(0, 3);

  if (!eligible.length) return { changed: false, sent: 0, failed: 0 };

  const updates = new Map<string, AppNotification>();
  let sent = 0;
  let failed = 0;

  for (const notification of eligible) {
    const result = await sendNotificationEmail({
      notificationId: notification.id,
      userId: account.id,
      topic: notification.topic,
      to: account.email,
      name: account.name,
      title: notification.title,
      summary: notification.summary,
      actionUrl: notification.actionUrl
    });
    const attemptedAt = new Date().toISOString();
    const attempts = (notification.emailAttempts ?? 0) + 1;
    const nextDelay = retryDelays[Math.min(attempts - 1, retryDelays.length - 1)];
    const updated: AppNotification = {
      ...notification,
      emailDeliveryStatus: result.status,
      emailAttempts: attempts,
      emailLastAttemptAt: attemptedAt,
      emailSentAt: result.sent ? attemptedAt : notification.emailSentAt,
      emailNextAttemptAt: result.sent || attempts >= 4
        ? undefined
        : new Date(now + nextDelay).toISOString()
    };
    updates.set(notification.id, updated);
    if (result.sent) sent += 1;
    else failed += 1;

    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: result.sent ? "email_notificacao_enviado" : "email_notificacao_pendente",
      userId: account.id,
      userName: account.name,
      details: result.sent
        ? `Notificação por e-mail enviada: ${notification.topic}.`
        : `Notificação por e-mail não enviada: ${notification.topic}. Nova tentativa programada.`,
      createdAt: attemptedAt,
      risk: result.sent ? "baixo" : "medio"
    }, ...(state.auditLogs || [])].slice(0, 5000);
  }

  state.notifications = (Array.isArray(state.notifications) ? state.notifications : [])
    .map((item) => isNotification(item) && updates.has(item.id) ? updates.get(item.id)! : item);

  return { changed: true, sent, failed };
}
