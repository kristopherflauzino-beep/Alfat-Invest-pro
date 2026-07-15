import { sendEmail } from "./email-service";
import { emailLayout, officialAppUrl } from "./templates/base";

export async function sendNotificationEmail(input: { to: string; name: string; title: string; summary: string; actionUrl?: string }) {
  return sendEmail({
    to: input.to,
    subject: input.title + " — AlfaTec Invest Pro",
    text: "Olá, " + input.name + ".\n\n" + input.summary + "\n\n" + (input.actionUrl || officialAppUrl()),
    html: emailLayout({
      preheader: input.summary,
      title: input.title,
      greeting: "Olá, " + input.name + ".",
      paragraphs: [input.summary],
      actionLabel: "Abrir AlfaTec Invest Pro",
      actionUrl: input.actionUrl || officialAppUrl()
    })
  });
}