import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { NAME_CHANGE_LIMIT, normalizeAccountName, recentNameChanges } from "@/lib/account/change-email";
import { authErrorResponse, requireAccount } from "@/lib/auth/session";
import { publicAccount, readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.object({ name: z.string().min(1).max(200) }).strict();

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await requireAccount(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Informe um nome válido." }, { status: 422 });
    const normalized = normalizeAccountName(parsed.data.name);
    if (!normalized.ok) return NextResponse.json({ error: normalized.error }, { status: 422 });
    if (normalized.value === account.name) {
      return NextResponse.json({ ok: true, message: "O nome informado já é o nome atual.", user: publicAccount(account) });
    }
    const history = recentNameChanges(account.nameChangeHistory);
    if (account.role !== "ADMIN" && history.length >= NAME_CHANGE_LIMIT) {
      return NextResponse.json(
        { error: "Você atingiu o limite temporário de alterações de nome. Entre em contato com o suporte." },
        { status: 429, headers: { "Retry-After": "86400" } }
      );
    }
    const state = await readCoreState();
    const index = state.accounts.findIndex((item) => item.id === account.id);
    if (index < 0) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    const now = new Date().toISOString();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = createHash("sha256").update(`${process.env.SESSION_SECRET || "audit"}|${ip}`).digest("hex").slice(0, 24);
    const previousName = state.accounts[index].name;
    state.accounts[index] = {
      ...state.accounts[index],
      name: normalized.value,
      nameChangeCount: Number(state.accounts[index].nameChangeCount || 0) + 1,
      nameChangeHistory: [now, ...history].slice(0, NAME_CHANGE_LIMIT),
      nameChangedAt: now
    };
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "nome_alterado",
      userId: account.id,
      userName: normalized.value,
      details: `Nome alterado pelo titular de "${previousName}" para "${normalized.value}".`,
      origin: "account_settings",
      ipHash,
      userAgent: (request.headers.get("user-agent") || "").slice(0, 300),
      result: "success",
      createdAt: now,
      risk: "baixo"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    return NextResponse.json(
      { ok: true, message: "Nome alterado com sucesso.", user: publicAccount(state.accounts[index]) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
