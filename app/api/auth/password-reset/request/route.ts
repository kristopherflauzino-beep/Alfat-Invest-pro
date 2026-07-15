import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email/email-service";
import { passwordResetEmail } from "@/lib/email/templates/password";
import {
  PASSWORD_RESET_TTL_MS,
  createPasswordResetToken,
  hashRateLimitValue,
  type PasswordResetRateEvent,
  type PasswordResetTokenRecord
} from "@/lib/auth/password-reset";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.object({ email: z.string().trim().email().max(254) }).strict();
const genericMessage = "Se existir uma conta com esse e-mail, enviaremos as instruções de recuperação.";

function isToken(value: unknown): value is PasswordResetTokenRecord {
  return Boolean(value && typeof value === "object" && typeof (value as PasswordResetTokenRecord).tokenHash === "string");
}
function isRateEvent(value: unknown): value is PasswordResetRateEvent {
  return Boolean(value && typeof value === "object" && typeof (value as PasswordResetRateEvent).emailHash === "string");
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: genericMessage }, { status: 200 });
    const email = parsed.data.email.toLowerCase();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const pepper = process.env.SESSION_SECRET || "rate-limit";
    const emailHash = hashRateLimitValue(pepper + "|email|" + email);
    const ipHash = hashRateLimitValue(pepper + "|ip|" + ip);
    const state = await readCoreState();
    const now = new Date();
    const cutoff = now.getTime() - 60 * 60 * 1000;
    const events = (Array.isArray(state.passwordResetRateEvents) ? state.passwordResetRateEvents : [])
      .filter(isRateEvent)
      .filter((item) => new Date(item.createdAt).getTime() > cutoff);
    const emailCount = events.filter((item) => item.emailHash === emailHash).length;
    const ipCount = events.filter((item) => item.ipHash === ipHash).length;
    if (emailCount >= 3 || ipCount >= 10) {
      return NextResponse.json({ error: "Muitas solicitações. Aguarde antes de tentar novamente." }, {
        status: 429,
        headers: { "Retry-After": "3600" }
      });
    }
    const event: PasswordResetRateEvent = { id: crypto.randomUUID(), emailHash, ipHash, createdAt: now.toISOString() };
    state.passwordResetRateEvents = [event, ...events].slice(0, 5000);
    const account = state.accounts.find((item) => item.email.trim().toLowerCase() === email);
    let rawToken = "";
    let record: PasswordResetTokenRecord | null = null;
    if (account && account.status !== "pendente") {
      const generated = createPasswordResetToken();
      rawToken = generated.token;
      record = {
        id: crypto.randomUUID(),
        userId: account.id,
        tokenHash: generated.tokenHash,
        expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS).toISOString(),
        requestedAt: now.toISOString(),
        requestIpHash: ipHash,
        attempts: 0,
        createdAt: now.toISOString()
      };
      const tokens = (Array.isArray(state.passwordResetTokens) ? state.passwordResetTokens : []).filter(isToken);
      state.passwordResetTokens = [
        record,
        ...tokens.map((item) => item.userId === account.id && !item.usedAt ? { ...item, usedAt: now.toISOString() } : item)
      ].slice(0, 2000);
    }
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "recuperacao_senha_solicitada",
      userId: account?.id,
      userName: account?.name || "Conta não identificada",
      details: "Solicitação de recuperação registrada com resposta pública genérica.",
      createdAt: now.toISOString(),
      risk: "medio"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);

    if (account && record && rawToken) {
      const appUrl = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "https://alfatecinvestpro.vercel.app");
      const resetUrl = appUrl.replace(/\/$/, "") + "/redefinir-senha?token=" + encodeURIComponent(rawToken);
      const template = passwordResetEmail({ name: account.name, resetUrl, expiresInMinutes: 30 });
      const result = await sendEmail({ to: account.email, ...template });
      const latest = await readCoreState();
      latest.auditLogs = [{
        id: crypto.randomUUID(),
        action: result.sent ? "email_recuperacao_enviado" : "email_recuperacao_falhou",
        userId: account.id,
        userName: account.name,
        details: result.sent ? "E-mail de recuperação enviado." : "E-mail de recuperação não enviado; credenciais SMTP ausentes ou indisponíveis.",
        createdAt: new Date().toISOString(),
        risk: result.sent ? "baixo" : "medio"
      }, ...(latest.auditLogs || [])];
      await writeCoreState(latest);
    }
    return NextResponse.json({ message: genericMessage }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestErrorResponse(error);
  }
}