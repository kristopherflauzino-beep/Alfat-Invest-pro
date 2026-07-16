import { NextResponse } from "next/server";
import { z } from "zod";
import {
  emailChangeTokenState,
  hashEmailChangeToken,
  isEmailChangeToken,
  normalizeEmail
} from "@/lib/account/change-email";
import { clearSession, revokeUserSessions } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/email-service";
import { newEmailChangedNotice, previousEmailChangedNotice } from "@/lib/email/templates/account";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.object({ token: z.string().min(32).max(200) }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Link inválido ou incompleto." }, { status: 422 });
    const state = await readCoreState();
    const tokens = (Array.isArray(state.emailChangeTokens) ? state.emailChangeTokens : []).filter(isEmailChangeToken);
    const tokenHash = hashEmailChangeToken(parsed.data.token);
    const record = tokens.find((item) => item.tokenHash === tokenHash);
    if (emailChangeTokenState(record) !== "valid" || !record) {
      return NextResponse.json({ error: "Link inválido, expirado ou já utilizado." }, { status: 410 });
    }
    const accountIndex = state.accounts.findIndex((item) => item.id === record.userId);
    if (accountIndex < 0) return NextResponse.json({ error: "Não foi possível concluir a solicitação." }, { status: 404 });
    const account = state.accounts[accountIndex];
    const newEmail = normalizeEmail(record.newEmail);
    if (state.accounts.some((item) => item.id !== account.id && normalizeEmail(item.email) === newEmail)) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const previousEmail = normalizeEmail(account.email);
    state.accounts[accountIndex] = {
      ...account,
      email: newEmail,
      username: normalizeEmail(account.username) === previousEmail ? newEmail : account.username,
      emailChangedAt: now
    };
    state.emailChangeTokens = tokens.map((item) =>
      item.userId === account.id && !item.usedAt ? { ...item, usedAt: now } : item
    );
    state.passwordResetTokens = (Array.isArray(state.passwordResetTokens) ? state.passwordResetTokens : []).map((item) =>
      item && typeof item === "object" && (item as { userId?: string }).userId === account.id && !(item as { usedAt?: string }).usedAt
        ? { ...(item as Record<string, unknown>), usedAt: now }
        : item
    );
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "email_alterado",
      userId: account.id,
      userName: account.name,
      details: `E-mail alterado de ${previousEmail} para ${newEmail} após confirmação por token de uso único.`,
      origin: "email_confirmation",
      result: "success",
      createdAt: now,
      risk: "alto"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    await revokeUserSessions(account.id);

    const oldTemplate = previousEmailChangedNotice({ name: account.name, newEmail, changedAt: now });
    const newTemplate = newEmailChangedNotice({ name: account.name, changedAt: now });
    const [oldDelivery, newDelivery] = await Promise.all([
      sendEmail({ to: previousEmail, ...oldTemplate }),
      sendEmail({ to: newEmail, ...newTemplate })
    ]);
    const latest = await readCoreState();
    latest.auditLogs = [{
      id: crypto.randomUUID(),
      action: "avisos_troca_email_processados",
      userId: account.id,
      userName: account.name,
      details: `Aviso ao e-mail anterior: ${oldDelivery.status}; confirmação ao novo e-mail: ${newDelivery.status}.`,
      result: oldDelivery.sent && newDelivery.sent ? "success" : "partial",
      createdAt: new Date().toISOString(),
      risk: "medio"
    }, ...(latest.auditLogs || [])];
    await writeCoreState(latest);

    const response = NextResponse.json(
      { ok: true, message: "E-mail alterado com sucesso. Entre novamente com o novo endereço." },
      { headers: { "Cache-Control": "no-store" } }
    );
    return clearSession(request, response);
  } catch (error) {
    return requestErrorResponse(error);
  }
}
