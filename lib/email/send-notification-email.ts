import "server-only";

import { sendEmail } from "./email-service";
import { emailLayout, officialAppUrl } from "./templates/base";
import type { NotificationTopic } from "@/lib/notifications/notifications";

function safeNotificationActionUrl(actionUrl?: string) {
  const appUrl = officialAppUrl();
  if (!actionUrl) return appUrl;
  try {
    const resolved = new URL(actionUrl, appUrl);
    return resolved.origin === new URL(appUrl).origin ? resolved.href : appUrl;
  } catch {
    return appUrl;
  }
}

export async function sendNotificationEmail(input: {
  notificationId: string;
  userId: string;
  topic: NotificationTopic;
  to: string;
  name: string;
  title: string;
  summary: string;
  actionUrl?: string;
}) {
  const actionUrl = safeNotificationActionUrl(input.actionUrl);
  return sendEmail({
    to: input.to,
    subject: input.title + " — AlfaTec Invest Pro",
    text: "Olá, " + input.name + ".\n\n" + input.summary + "\n\n" + actionUrl,
    html: emailLayout({
      preheader: input.summary,
      title: input.title,
      greeting: "Olá, " + input.name + ".",
      paragraphs: [input.summary],
      actionLabel: "Abrir AlfaTec Invest Pro",
      actionUrl
    }),
    userId: input.userId,
    type: "notification:" + input.topic,
    idempotencyKey: "notification:" + input.notificationId
  });
}
