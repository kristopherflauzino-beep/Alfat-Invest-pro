import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { officialEmailLogoUrl } from "@/lib/email/templates/base";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  userId?: string;
  type?: string;
  idempotencyKey?: string;
};

export type EmailDeliveryResult = {
  sent: boolean;
  status: "sent" | "not_configured" | "failed";
  providerMessageId?: string;
  accepted?: string[];
  rejected?: string[];
  response?: string;
  errorCode?: string;
  errorMessage?: string;
};

type SmtpConfig = {
  provider: "smtp";
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  fromName: string;
  fromAddress: string;
};

let cachedTransporter: Transporter | null = null;
let cachedFingerprint = "";

function safeError(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown; responseCode?: unknown };
  const code = typeof candidate?.code === "string"
    ? candidate.code.slice(0, 80)
    : typeof candidate?.responseCode === "number"
      ? String(candidate.responseCode)
      : "SMTP_ERROR";
  const message = error instanceof Error ? error.message : "Falha desconhecida no provedor SMTP.";
  return { code, message: message.replace(/(pass(word)?|token|secret|auth)=?[^ ,;]*/giu, "$1=[redacted]").slice(0, 500) };
}

function smtpConfig(): { config: SmtpConfig | null; errors: string[] } {
  const provider = (process.env.EMAIL_PROVIDER || "smtp").trim().toLowerCase();
  const host = (process.env.EMAIL_SMTP_HOST || "").trim();
  const port = Number(process.env.EMAIL_SMTP_PORT || 0);
  const secure = String(process.env.EMAIL_SMTP_SECURE || "").toLowerCase() === "true";
  const user = (process.env.EMAIL_SMTP_USER || "").trim();
  const password = process.env.EMAIL_SMTP_PASSWORD || "";
  const fromName = (process.env.EMAIL_FROM_NAME || "AlfaTec Invest Pro").trim();
  const fromAddress = (process.env.EMAIL_FROM_ADDRESS || user).trim().toLowerCase();
  const errors: string[] = [];

  if (provider !== "smtp") errors.push("EMAIL_PROVIDER deve estar configurado como smtp.");
  if (!host) errors.push("EMAIL_SMTP_HOST ausente.");
  if (!Number.isInteger(port) || port <= 0 || port > 65535) errors.push("EMAIL_SMTP_PORT inválida.");
  if (!user) errors.push("EMAIL_SMTP_USER ausente.");
  if (!password) errors.push("EMAIL_SMTP_PASSWORD ausente.");
  if (!fromAddress) errors.push("EMAIL_FROM_ADDRESS ausente.");
  if (port === 465 && !secure) errors.push("A porta 465 exige EMAIL_SMTP_SECURE=true.");
  if (port === 587 && secure) errors.push("A porta 587 exige EMAIL_SMTP_SECURE=false para STARTTLS.");
  if (user && fromAddress && user.toLowerCase() !== fromAddress) errors.push("O remetente deve corresponder ao usuário SMTP autenticado.");

  return {
    config: errors.length ? null : {
      provider: "smtp",
      host,
      port,
      secure,
      auth: { user, pass: password },
      fromName,
      fromAddress
    },
    errors
  };
}

function transporterFor(config: SmtpConfig) {
  const fingerprint = [config.host, config.port, config.secure, config.auth.user, config.auth.pass.length].join("|");
  if (cachedTransporter && fingerprint === cachedFingerprint) return cachedTransporter;
  cachedFingerprint = fingerprint;
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: config.auth,
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2", servername: config.host }
  });
  return cachedTransporter;
}

async function ensureEmailDeliveryTable() {
  if (!hasDatabaseUrl) return;
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "EmailDelivery" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT,
      "recipient" TEXT NOT NULL,
      "recipientMasked" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "providerMessageId" TEXT,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "lastAttemptAt" TIMESTAMPTZ,
      "sentAt" TIMESTAMPTZ,
      "errorCode" TEXT,
      "errorMessage" TEXT,
      "idempotencyKey" TEXT UNIQUE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "EmailDelivery_status_createdAt_idx" ON "EmailDelivery" ("status", "createdAt")`;
}

function maskRecipient(recipient: string) {
  const [local, domain] = recipient.trim().toLowerCase().split("@");
  if (!local || !domain) return "***";
  return local.slice(0, 1) + "***@" + domain;
}

async function beginDelivery(message: EmailMessage) {
  if (!hasDatabaseUrl) return { id: crypto.randomUUID(), previousSent: false, providerMessageId: undefined as string | undefined };
  await ensureEmailDeliveryTable();
  if (message.idempotencyKey) {
    const existing = await prisma.$queryRaw<Array<{ id: string; status: string; providerMessageId: string | null }>>`
      SELECT "id", "status", "providerMessageId" FROM "EmailDelivery"
      WHERE "idempotencyKey" = ${message.idempotencyKey}
      LIMIT 1
    `;
    if (existing[0]?.status === "sent") {
      return { id: existing[0].id, previousSent: true, providerMessageId: existing[0].providerMessageId || undefined };
    }
  }
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "EmailDelivery" (
      "id", "userId", "recipient", "recipientMasked", "type", "subject",
      "status", "provider", "attempts", "lastAttemptAt", "idempotencyKey", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${message.userId || null}, ${message.to.trim().toLowerCase()}, ${maskRecipient(message.to)},
      ${message.type || "transactional"}, ${message.subject.slice(0, 250)}, 'sending', 'smtp', 1, NOW(),
      ${message.idempotencyKey || null}, NOW(), NOW()
    )
    ON CONFLICT ("idempotencyKey") DO UPDATE SET
      "status" = CASE WHEN "EmailDelivery"."status" = 'sent' THEN 'sent' ELSE 'sending' END,
      "attempts" = "EmailDelivery"."attempts" + 1,
      "lastAttemptAt" = NOW(),
      "updatedAt" = NOW()
  `;
  if (message.idempotencyKey) {
    const row = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "EmailDelivery" WHERE "idempotencyKey" = ${message.idempotencyKey} LIMIT 1
    `;
    return { id: row[0]?.id || id, previousSent: false, providerMessageId: undefined };
  }
  return { id, previousSent: false, providerMessageId: undefined };
}

async function finishDelivery(id: string, result: EmailDeliveryResult) {
  if (!hasDatabaseUrl) return;
  await ensureEmailDeliveryTable();
  await prisma.$executeRaw`
    UPDATE "EmailDelivery"
    SET "status" = ${result.sent ? "sent" : "failed"},
        "providerMessageId" = ${result.providerMessageId || null},
        "sentAt" = ${result.sent ? new Date() : null},
        "errorCode" = ${result.errorCode || null},
        "errorMessage" = ${result.errorMessage || null},
        "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;
}

export function emailConfigurationStatus() {
  const { config, errors } = smtpConfig();
  return {
    provider: "smtp",
    configured: Boolean(config),
    fromName: process.env.EMAIL_FROM_NAME || "AlfaTec Invest Pro",
    fromAddress: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_SMTP_USER || "",
    host: process.env.EMAIL_SMTP_HOST || "",
    port: Number(process.env.EMAIL_SMTP_PORT || 0) || null,
    secure: String(process.env.EMAIL_SMTP_SECURE || "").toLowerCase() === "true",
    errors
  };
}

export function emailIsConfigured() {
  return emailConfigurationStatus().configured;
}

export async function verifyEmailConnection() {
  const { config, errors } = smtpConfig();
  if (!config) return { ok: false, status: "not_configured" as const, errors };
  try {
    await transporterFor(config).verify();
    return { ok: true, status: "connected" as const, errors: [] };
  } catch (error) {
    const safe = safeError(error);
    console.error("SMTP_VERIFY_FAILED", { code: safe.code, message: safe.message });
    return { ok: false, status: "failed" as const, errors: [safe.message], errorCode: safe.code };
  }
}

export async function sendEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
  const delivery = await beginDelivery(message).catch(() => ({ id: crypto.randomUUID(), previousSent: false, providerMessageId: undefined }));
  if (delivery.previousSent) return { sent: true, status: "sent", providerMessageId: delivery.providerMessageId };

  const { config, errors } = smtpConfig();
  if (!config) {
    const result: EmailDeliveryResult = {
      sent: false,
      status: "not_configured",
      errorCode: "EMAIL_CONFIGURATION_INCOMPLETE",
      errorMessage: "Configuração de e-mail incompleta: " + errors.join(" ")
    };
    console.error("EMAIL_CONFIGURATION_INCOMPLETE", { missingOrInvalid: errors });
    await finishDelivery(delivery.id, result).catch(() => undefined);
    return result;
  }

  try {
    const info = await transporterFor(config).sendMail({
      from: { name: config.fromName, address: config.fromAddress },
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text
    });
    const accepted = (info.accepted || []).map(String);
    const rejected = (info.rejected || []).map(String);
    const sent = accepted.length > 0 && rejected.length === 0;
    const result: EmailDeliveryResult = {
      sent,
      status: sent ? "sent" : "failed",
      providerMessageId: info.messageId,
      accepted,
      rejected,
      response: String(info.response || "").slice(0, 500),
      errorCode: sent ? undefined : "SMTP_RECIPIENT_REJECTED",
      errorMessage: sent ? undefined : "O provedor rejeitou um ou mais destinatários."
    };
    await finishDelivery(delivery.id, result).catch(() => undefined);
    return result;
  } catch (error) {
    const safe = safeError(error);
    console.error("SMTP_SEND_FAILED", { code: safe.code, message: safe.message, recipient: maskRecipient(message.to) });
    const result: EmailDeliveryResult = { sent: false, status: "failed", errorCode: safe.code, errorMessage: safe.message };
    await finishDelivery(delivery.id, result).catch(() => undefined);
    return result;
  }
}

export async function verifyEmailLogoAsset() {
  const url = officialEmailLogoUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store", redirect: "error", signal: controller.signal });
    const contentType = response.headers.get("content-type") || "";
    const size = Number(response.headers.get("content-length") || 0) || null;
    const ok = response.ok && contentType.toLowerCase().startsWith("image/png");
    return {
      ok,
      url,
      status: response.status,
      contentType,
      size,
      checkedAt: new Date().toISOString(),
      error: ok ? null : "O logo público não respondeu como imagem PNG."
    };
  } catch (error) {
    return {
      ok: false,
      url,
      status: null,
      contentType: "",
      size: null,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error && error.name === "AbortError" ? "Tempo limite ao verificar o logo público." : "Não foi possível verificar o logo público."
    };
  } finally {
    clearTimeout(timeout);
  }
}
export async function emailDeliveryStats() {
  if (!hasDatabaseUrl) return { pending: 0, failed: 0, sent: 0, lastSuccessAt: null, lastErrorAt: null, lastError: null };
  await ensureEmailDeliveryTable();
  const rows = await prisma.$queryRaw<Array<{
    pending: bigint;
    failed: bigint;
    sent: bigint;
    lastSuccessAt: Date | null;
    lastErrorAt: Date | null;
    lastError: string | null;
  }>>`
    SELECT
      COUNT(*) FILTER (WHERE "status" IN ('queued', 'sending')) AS "pending",
      COUNT(*) FILTER (WHERE "status" = 'failed') AS "failed",
      COUNT(*) FILTER (WHERE "status" = 'sent') AS "sent",
      MAX("sentAt") AS "lastSuccessAt",
      MAX("updatedAt") FILTER (WHERE "status" = 'failed') AS "lastErrorAt",
      (ARRAY_AGG("errorMessage" ORDER BY "updatedAt" DESC) FILTER (WHERE "status" = 'failed'))[1] AS "lastError"
    FROM "EmailDelivery"
  `;
  const row = rows[0];
  return {
    pending: Number(row?.pending || 0),
    failed: Number(row?.failed || 0),
    sent: Number(row?.sent || 0),
    lastSuccessAt: row?.lastSuccessAt?.toISOString() || null,
    lastErrorAt: row?.lastErrorAt?.toISOString() || null,
    lastError: row?.lastError || null
  };
}
