import { NextResponse } from "next/server";
import { z } from "zod";
import { attachSessionCookie, createSession } from "@/lib/auth/session";
import { findAccount, publicAccount, readCoreState, writeCoreState } from "@/lib/server/core-state";
import { hashPassword, needsPasswordUpgrade, verifyPassword } from "@/lib/auth/password";
import { isPendingRegistration, pendingRegistrationState } from "@/lib/auth/email-verification";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";

const schema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(256)
}).strict();
const attempts = new Map<string, { count: number; resetAt: number }>();

function limited(key: string) {
  const now = Date.now();
  const item = attempts.get(key);
  if (!item || item.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return false;
  }
  item.count += 1;
  return item.count > 5;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 400 });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const identifier = input.data.identifier.toLowerCase();
    const key = ip + ":" + identifier;
    if (limited(key)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos.", retryAfter: 900 }, { status: 429, headers: { "Retry-After": "900" } });
    }

    const account = await findAccount(input.data.identifier).catch(() => null);
    if (!account) {
      const state = await readCoreState();
      const pending = (Array.isArray(state.pendingRegistrations) ? state.pendingRegistrations : [])
        .filter(isPendingRegistration)
        .find((item) => [item.id, item.username, item.email, item.name].some((value) => String(value).toLowerCase() === identifier));
      if (pending && await verifyPassword(input.data.password, pending.passwordHash)) {
        const status = pendingRegistrationState(pending);
        if (status === "awaiting_email_confirmation") {
          return NextResponse.json({ error: "Confirme seu e-mail antes de acessar a plataforma." }, { status: 403 });
        }
        if (["awaiting_payment", "payment_under_review", "paid"].includes(status)) {
          return NextResponse.json({ error: "Seu cadastro ainda aguarda a confirmação do pagamento e a ativação pelo administrador." }, { status: 403 });
        }
        if (status === "expired") {
          return NextResponse.json({ error: "Seu cadastro provisório expirou. Inicie novamente para continuar." }, { status: 403 });
        }
      }
      return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
    }
    if (!await verifyPassword(input.data.password, account.passwordHash)) {
      return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
    }
    if (account.status === "pendente") {
      return NextResponse.json({ error: "Conta criada e aguardando liberação do administrador." }, { status: 403 });
    }
    if (needsPasswordUpgrade(account.passwordHash)) {
      const state = await readCoreState();
      const index = state.accounts.findIndex((item) => item.id === account.id);
      if (index >= 0) {
        state.accounts[index] = { ...state.accounts[index], passwordHash: await hashPassword(input.data.password) };
        await writeCoreState(state);
      }
    }
    attempts.delete(key);
    const session = await createSession(account.id, request);
    return attachSessionCookie(NextResponse.json({ user: publicAccount(account) }), session.token, session.expiresAt);
  } catch {
    return NextResponse.json({ error: "Não foi possível validar o acesso." }, { status: 500 });
  }
}
