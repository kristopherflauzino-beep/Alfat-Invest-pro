import { NextResponse } from "next/server";
import { z } from "zod";
import { passwordChangedEmail } from "@/lib/email/templates/password";
import { sendEmail } from "@/lib/email/email-service";
import { hashPassword, passwordPolicy, verifyPassword } from "@/lib/auth/password";
import { hashResetToken, resetTokenState, type PasswordResetTokenRecord } from "@/lib/auth/password-reset";
import { revokeUserSessions } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications/notifications";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.object({
  token: z.string().min(32).max(200),
  newPassword: z.string().min(1).max(256),
  confirmPassword: z.string().min(1).max(256)
}).strict();
function isToken(value: unknown): value is PasswordResetTokenRecord {
  return Boolean(value && typeof value === "object" && typeof (value as PasswordResetTokenRecord).tokenHash === "string");
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Confira os dados informados." }, { status: 422 });
    if (parsed.data.newPassword !== parsed.data.confirmPassword) {
      return NextResponse.json({ error: "As senhas informadas não são iguais." }, { status: 422 });
    }
    const state = await readCoreState();
    const tokens = (Array.isArray(state.passwordResetTokens) ? state.passwordResetTokens : []).filter(isToken);
    const tokenHash = hashResetToken(parsed.data.token);
    const index = tokens.findIndex((item) => item.tokenHash === tokenHash);
    const record = index >= 0 ? tokens[index] : undefined;
    if (resetTokenState(record) !== "valid" || !record) {
      return NextResponse.json({ error: "Link inválido, expirado ou já utilizado." }, { status: 410 });
    }
    const accountIndex = state.accounts.findIndex((item) => item.id === record.userId);
    if (accountIndex < 0) return NextResponse.json({ error: "Não foi possível concluir a solicitação." }, { status: 404 });
    const account = state.accounts[accountIndex];
    if (account.status === "pendente") return NextResponse.json({ error: "Não foi possível concluir a solicitação." }, { status: 403 });
    const policy = passwordPolicy(parsed.data.newPassword, account);
    if (policy) return NextResponse.json({ error: policy }, { status: 422 });
    if (await verifyPassword(parsed.data.newPassword, account.passwordHash)) {
      return NextResponse.json({ error: "A nova senha deve ser diferente da senha atual." }, { status: 422 });
    }
    const passwordHistory = Array.isArray(account.passwordHistory) ? account.passwordHistory.filter((item): item is string => typeof item === "string") : [];
    for (const oldHash of passwordHistory.slice(0, 5)) {
      if (await verifyPassword(parsed.data.newPassword, oldHash)) {
        return NextResponse.json({ error: "Esta senha foi utilizada recentemente. Escolha outra." }, { status: 422 });
      }
    }
    const now = new Date().toISOString();
    const newHash = await hashPassword(parsed.data.newPassword);
    state.accounts[accountIndex] = {
      ...account,
      passwordHash: newHash,
      passwordHistory: [account.passwordHash, ...passwordHistory].slice(0, 5),
      passwordChangedAt: now,
      failedLoginAttempts: 0,
      loginLockedUntil: null
    };
    state.passwordResetTokens = tokens.map((item) =>
      item.userId === account.id && !item.usedAt ? { ...item, usedAt: now } : item
    );
    state.notifications = [
      createNotification({
        userId: account.id,
        topic: "security",
        title: "Senha alterada",
        summary: "Sua senha foi redefinida e todas as sessões anteriores foram encerradas.",
        priority: "critical",
        category: "system",
        actionUrl: "/"
      }),
      ...(Array.isArray(state.notifications) ? state.notifications : [])
    ];
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "senha_redefinida",
      userId: account.id,
      userName: account.name,
      details: "Senha redefinida por token de uso único; sessões anteriores revogadas.",
      createdAt: now,
      risk: "alto"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    await revokeUserSessions(account.id);
    const template = passwordChangedEmail({ name: account.name, changedAt: now });
    const emailResult = await sendEmail({ to: account.email, ...template });
    const latest = await readCoreState();
    latest.auditLogs = [{
      id: crypto.randomUUID(),
      action: emailResult.sent ? "email_senha_alterada_enviado" : "email_senha_alterada_falhou",
      userId: account.id,
      userName: account.name,
      details: emailResult.sent ? "Confirmação de alteração de senha enviada." : "Confirmação de alteração de senha não enviada.",
      createdAt: new Date().toISOString(),
      risk: emailResult.sent ? "baixo" : "medio"
    }, ...(latest.auditLogs || [])];
    await writeCoreState(latest);
    return NextResponse.json({
      ok: true,
      message: "Sua senha foi atualizada e todas as sessões anteriores foram encerradas."
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestErrorResponse(error);
  }
}