import { NextResponse } from "next/server";
import { z } from "zod";
import { attachSessionCookie, createSession, requireAccount, revokeUserSessions, authErrorResponse } from "@/lib/auth/session";
import { hashPassword, passwordPolicy, verifyPassword } from "@/lib/auth/password";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.object({ currentPassword: z.string().min(1).max(256), newPassword: z.string().min(1).max(256) }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await requireAccount(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Dados de senha inválidos." }, { status: 422 });
    if (!await verifyPassword(parsed.data.currentPassword, account.passwordHash)) return NextResponse.json({ error: "Senha atual incorreta." }, { status: 403 });
    const policy = passwordPolicy(parsed.data.newPassword, account);
    if (policy) return NextResponse.json({ error: policy }, { status: 422 });
    if (await verifyPassword(parsed.data.newPassword, account.passwordHash)) return NextResponse.json({ error: "A nova senha deve ser diferente da atual." }, { status: 422 });
    const history = Array.isArray(account.passwordHistory) ? account.passwordHistory.filter((item): item is string => typeof item === "string") : [];
    for (const oldHash of history.slice(0, 5)) {
      if (await verifyPassword(parsed.data.newPassword, oldHash)) return NextResponse.json({ error: "Esta senha foi utilizada recentemente. Escolha outra." }, { status: 422 });
    }
    const state = await readCoreState();
    const index = state.accounts.findIndex((item) => item.id === account.id);
    if (index < 0) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    const now = new Date().toISOString();
    state.accounts[index] = { ...state.accounts[index], passwordHash: await hashPassword(parsed.data.newPassword), passwordHistory: [account.passwordHash, ...history].slice(0, 5), passwordChangedAt: now };
    state.auditLogs = [{ id: crypto.randomUUID(), action: "senha_alterada", userId: account.id, userName: account.name, details: "Senha alterada pelo titular; sessões anteriores revogadas.", createdAt: now, risk: "alto" }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    await revokeUserSessions(account.id);
    const session = await createSession(account.id, request);
    return attachSessionCookie(NextResponse.json({ ok: true, message: "Senha alterada com sucesso." }), session.token, session.expiresAt);
  } catch (error) { return authErrorResponse(error); }
}