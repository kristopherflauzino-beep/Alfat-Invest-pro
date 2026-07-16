import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeAccountName, normalizeEmail, recentNameChanges } from "@/lib/account/change-email";
import {
  authErrorResponse,
  requireAdminPermission,
  revokeUserSessions
} from "@/lib/auth/session";
import { publicAccount, readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().trim().email().max(254).optional(),
  reason: z.string().trim().min(3).max(500)
}).strict().refine((value) => value.name !== undefined || value.email !== undefined, {
  message: "Informe o nome ou o e-mail."
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Revise os dados e informe o motivo da alteração." }, { status: 422 });
    const admin = await requireAdminPermission(request, parsed.data.email !== undefined ? "manage_user_email" : "manage_user_name");
    if (parsed.data.name !== undefined && parsed.data.email !== undefined) {
      await requireAdminPermission(request, "manage_user_name");
    }
    const { id } = await context.params;
    const state = await readCoreState();
    const index = state.accounts.findIndex((item) => item.id === id);
    if (index < 0) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    const target = state.accounts[index];
    if (target.role !== "CLIENTE") return NextResponse.json({ error: "Esta ação é permitida somente para contas de clientes." }, { status: 403 });

    const nextName = parsed.data.name === undefined ? target.name : normalizeAccountName(parsed.data.name);
    if (typeof nextName !== "string" && !nextName.ok) {
      return NextResponse.json({ error: nextName.error }, { status: 422 });
    }
    const normalizedName = typeof nextName === "string" ? nextName : nextName.value;
    const normalizedEmail = parsed.data.email === undefined ? target.email : normalizeEmail(parsed.data.email);
    if (state.accounts.some((item) => item.id !== target.id && normalizeEmail(item.email) === normalizedEmail)) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }

    const nameChanged = normalizedName !== target.name;
    const emailChanged = normalizedEmail !== normalizeEmail(target.email);
    if (!nameChanged && !emailChanged) {
      return NextResponse.json({ ok: true, message: "Nenhuma alteração necessária.", user: publicAccount(target) });
    }
    const now = new Date().toISOString();
    const history = recentNameChanges(target.nameChangeHistory);
    state.accounts[index] = {
      ...target,
      name: normalizedName,
      email: normalizedEmail,
      username: emailChanged && normalizeEmail(target.username) === normalizeEmail(target.email) ? normalizedEmail : target.username,
      nameChangeCount: nameChanged ? Number(target.nameChangeCount || 0) + 1 : target.nameChangeCount,
      nameChangeHistory: nameChanged ? [now, ...history].slice(0, 20) : target.nameChangeHistory,
      nameChangedAt: nameChanged ? now : target.nameChangedAt,
      emailChangedAt: emailChanged ? now : target.emailChangedAt
    };
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = createHash("sha256").update(`${process.env.SESSION_SECRET || "audit"}|${ip}`).digest("hex").slice(0, 24);
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "identidade_cliente_alterada",
      userId: target.id,
      userName: normalizedName,
      actorId: admin.id,
      actorName: admin.name,
      details: `Administrador alterou nome de "${target.name}" para "${normalizedName}" e e-mail de "${target.email}" para "${normalizedEmail}". Motivo: ${parsed.data.reason}`,
      origin: "admin_clients",
      reason: parsed.data.reason,
      ipHash,
      userAgent: (request.headers.get("user-agent") || "").slice(0, 300),
      result: "success",
      createdAt: now,
      risk: "alto"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    if (emailChanged) await revokeUserSessions(target.id);
    return NextResponse.json({
      ok: true,
      message: emailChanged ? "Dados alterados e sessões do cliente encerradas." : "Nome do cliente alterado.",
      user: publicAccount(state.accounts[index])
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
