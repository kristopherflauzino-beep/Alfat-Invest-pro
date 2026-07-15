import nodemailer from "nodemailer";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailDeliveryResult = {
  sent: boolean;
  status: "sent" | "not_configured" | "failed";
  providerMessageId?: string;
};

function smtpConfig() {
  const user = process.env.EMAIL_SMTP_USER || "";
  const password = process.env.EMAIL_SMTP_PASSWORD || "";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || user;
  if (!user || !password || !fromAddress) return null;
  return {
    host: process.env.EMAIL_SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_SMTP_PORT || 465),
    secure: String(process.env.EMAIL_SMTP_SECURE || "true").toLowerCase() === "true",
    auth: { user, pass: password },
    fromName: process.env.EMAIL_FROM_NAME || "AlfaTec Invest Pro",
    fromAddress
  };
}

export function emailIsConfigured() {
  return Boolean(smtpConfig());
}

export async function sendEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
  const config = smtpConfig();
  if (!config) return { sent: false, status: "not_configured" };
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      pool: true,
      maxConnections: 2,
      maxMessages: 50,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000
    });
    const result = await transporter.sendMail({
      from: { name: config.fromName, address: config.fromAddress },
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text
    });
    return { sent: true, status: "sent", providerMessageId: result.messageId };
  } catch {
    return { sent: false, status: "failed" };
  }
}