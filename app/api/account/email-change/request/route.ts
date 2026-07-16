import { NextResponse } from "next/server";
import { z } from "zod";
import {
  EMAIL_CHANGE_TTL_MS,
  createEmailChangeToken,
  isEmailChangeRateEvent,
  isEmailChangeToken,
  normalizeEmail,
  type EmailChangeRateEvent,
  type EmailChangeTokenRecord
} from "@/lib/account/change-email";
import { verifyPassword } from "@/lib/auth/password";
import { hashRateLimitValue } from "@/lib/auth/password-reset";
import { authErrorResponse, requireAccount } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/email-service";
import { emailChangeConfirmationEmail } from "@/lib/email/templates/account";
import { officialAppUrl } from "@/lib/email/templates/base";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.object({
  newEmail: z.string().trim().email().max(254),
  confirmEmail: z.string().trim().email().max(254),
  currentPassword: z.string().min(1).max(256)
}).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await requireAccount(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Revise os dados informados." }, { status: 422 });
    const newEmail = normalizeEmail(parsed.data.newEmail);
    if (newEmail !== normalizeEmail(parsed.data.confirmEmail)) {
      return NextResponse.json({ error: "Os e-mails informados não são iguais." }, { status: 422 });
    }
    if (newEmail === normalizeEmail(account.email)) {
      return NextResponse.json({ error: "O novo e-mail deve ser diferente do atual." }, { status: 422 });
    }
    if (!await verifyPassword(parsed.data.currentPassword, account.passwordHash)) {
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 403 });
    }

    const state = await readCoreState();
    if (state.accounts.some((item) => item.id !== account.id && normalizeEmail(item.email) === newEmail)) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }
    const now = new Date();
    const cutoff = now.getTime() - 60 * 60 * 1000;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const pepper = process.env.SESSION_SECRET || "email-change";
    const ipHash = hashRateLimitValue(`${pepper}|ip|${ip}`);
    const events = (Array.isArray(state.emailChangeRateEvents) ? state.emailChangeRateEvents : [])
      .filter(isEmailChangeRateEvent)
      .filter((item) => new Date(item.createdAt).getTime() > cutoff);
    if (events.filter((item) => item.userId === account.id).length >= 3 || events.filter((item) => item.ipHash === ipHash).length >= 10) {
      return NextResponse.json(
        { error: "Muitas solicitações. Aguarde antes de tentar novamente." },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    const generated = createEmailChangeToken();
    const record: EmailChangeTokenRecord = {
      id: crypto.randomUUID(),
      userId: account.id,
      newEmail,
      tokenHash: generated.tokenHash,
      expiresAt: new Date(now.getTime() + EMAIL_CHANGE_TTL_MS).toISOString(),
      requestedAt: now.toISOString(),
      requestIpHash: ipHash,
      createdAt: now.toISOString()
    };
    const rateEvent: EmailChangeRateEvent = {
      id: crypto.randomUUID(),
      userId: account.id,
      ipHash,
      createdAt: now.toISOString()
    };
    const tokens = (Array.isArray(state.emailChangeTokens) ? state.emailChangeTokens : []).filter(isEmailChangeToken);
    state.emailChangeTokens = [
      record,
      ...tokens.map((item) => item.userId === account.id && !item.usedAt ? { ...item, usedAt: now.toISOString() } : item)
    ].slice(0, 2000);
    state.emailChangeRateEvents = [rateEvent, ...events].slice(0, 5000);
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "troca_email_solicitada",
      userId: account.id,
      userName: account.name,
      details: `Solicitação para alterar ${account.email} para ${newEmail}.`,
      origin: "account_settings",
      ipHash,
      userAgent: (request.headers.get("user-agent") || "").slice(0, 300),
      result: "pending_confirmation",
      createdAt: now.toISOString(),
      risk: "alto"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);

    const confirmationUrl = `${officialAppUrl()}/confirmar-novo-email?token=${encodeURIComponent(generated.token)}`;
    const template = emailChangeConfirmationEmail({ name: account.name, newEmail, confirmationUrl });
    const delivery = await sendEmail({ to: newEmail, ...template });
    if (!delivery.sent) {
      const latest = await readCoreState();
      latest.emailChangeTokens = (Array.isArray(latest.emailChangeTokens) ? latest.emailChangeTokens : []).map((item) =>
        isEmailChangeToken(item) && item.id === record.id ? { ...item, usedAt: new Date().toISOString() } : item
      );
      latest.auditLogs = [{
        id: crypto.randomUUID(),
        action: "troca_email_envio_falhou",
        userId: account.id,
        userName: account.name,
        details: "O e-mail de confirmação não pôde ser enviado.",
        result: delivery.status,
        createdAt: new Date().toISOString(),
        risk: "medio"
      }, ...(latest.auditLogs || [])];
      await writeCoreState(latest);
      return NextResponse.json({ error: "Não foi possível enviar a confirmação agora. Tente novamente mais tarde." }, { status: 503 });
    }
    return NextResponse.json(
      { ok: true, message: "Enviamos um link de confirmação para o novo e-mail. Ele expira em 30 minutos." },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
