import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireAdmin, revokeUserSessions } from "@/lib/auth/session";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";
import { isSubscriptionRequest, type ManualSubscriptionRequest, type SubscriptionRequestStatus } from "@/lib/subscriptions/manual-subscription";

export const runtime = "nodejs";
const schema = z.object({
  action: z.enum(["confirm_payment", "activate", "refuse", "cancel", "expire", "edit_expiration", "add_note"]),
  confirmationDate: z.string().date().optional(),
  startDate: z.string().date().optional(),
  expiryDate: z.string().date().optional(),
  transactionId: z.string().max(100).optional(),
  note: z.string().max(500).optional()
}).strict();
const atNoon = (date: string) => new Date(`${date}T12:00:00.000Z`);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Dados administrativos inválidos." }, { status: 422 });
    const { id } = await params;
    const state = await readCoreState();
    const items = (Array.isArray(state.subscriptionRequests) ? state.subscriptionRequests : []).filter(isSubscriptionRequest);
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    const current = items[index];
    const data = parsed.data;
    const now = new Date().toISOString();
    let status: SubscriptionRequestStatus = current.status;
    let actionLabel = data.action;
    const requiresDates = data.action === "confirm_payment" || data.action === "activate";
    if (requiresDates && (!data.confirmationDate || !data.startDate || !data.expiryDate)) return NextResponse.json({ error: "Informe confirmação, início e vencimento." }, { status: 422 });
    if (data.startDate && data.expiryDate && atNoon(data.expiryDate) < atNoon(data.startDate)) return NextResponse.json({ error: "O vencimento não pode ser anterior ao início." }, { status: 422 });
    if (data.action === "activate" && ["recusado", "cancelado", "expirado"].includes(current.status)) return NextResponse.json({ error: "Esta solicitação não pode ser ativada." }, { status: 409 });
    if (data.action === "refuse") status = "recusado";
    if (data.action === "cancel") status = "cancelado";
    if (data.action === "expire") status = "expirado";
    if (data.action === "activate") status = "ativo";
    const updated: ManualSubscriptionRequest = {
      ...current,
      status,
      confirmedAt: requiresDates && data.confirmationDate ? atNoon(data.confirmationDate).toISOString() : current.confirmedAt,
      activatedAt: data.action === "activate" && data.startDate ? atNoon(data.startDate).toISOString() : current.activatedAt,
      expiresAt: ["confirm_payment", "activate", "edit_expiration"].includes(data.action) && data.expiryDate ? atNoon(data.expiryDate).toISOString() : current.expiresAt,
      transactionId: requiresDates && data.transactionId ? data.transactionId : current.transactionId,
      adminNote: data.note ?? current.adminNote,
      updatedAt: now,
      updatedBy: admin.id,
      history: [...current.history, { id: randomUUID(), action: actionLabel, status, actorId: admin.id, actorName: admin.name, createdAt: now, note: data.note }]
    };
    items[index] = updated;
    const accountIndex = state.accounts.findIndex((item) => item.id === current.userId);
    if (data.action === "activate") {
      if (accountIndex < 0) return NextResponse.json({ error: "Usuário da solicitação não encontrado." }, { status: 404 });
      const plan = state.plans.find((item) => item.id === current.planId);
      if (!plan) return NextResponse.json({ error: "Plano da solicitação não encontrado." }, { status: 404 });
      const account = state.accounts[accountIndex];
      state.accounts[accountIndex] = { ...account, planId: plan.id, planValue: current.planValue, planStartedAt: data.startDate, dueDate: data.expiryDate, status: "ativo", permissions: plan.permissions };
      const payments = Array.isArray(state.payments) ? state.payments : [];
      if (!payments.some((item) => item && typeof item === "object" && (item as Record<string, unknown>).id === `manual-${current.id}`)) {
        state.payments = [{ id: `manual-${current.id}`, clientId: current.userId, planId: current.planId, planName: current.planName, value: current.planValue, paymentDate: data.confirmationDate, dueDate: data.expiryDate, status: "pago", method: "mercado_pago_link", transactionId: data.transactionId, notes: data.note, createdBy: admin.id }, ...payments];
      }
    }
    if (data.action === "edit_expiration" && data.expiryDate && current.status === "ativo" && accountIndex >= 0) state.accounts[accountIndex] = { ...state.accounts[accountIndex], dueDate: data.expiryDate };
    if (["cancel", "expire"].includes(data.action) && current.status === "ativo" && accountIndex >= 0) {
      state.accounts[accountIndex] = { ...state.accounts[accountIndex], status: data.action === "expire" ? "vencido" : "bloqueado" };
      await revokeUserSessions(current.userId);
    }
    state.subscriptionRequests = items;
    state.auditLogs = [{ id: randomUUID(), action: `assinatura_${data.action}`, userId: admin.id, userName: admin.name, details: `Solicitação ${current.id} alterada para ${status} por ${admin.name}.`, createdAt: now, risk: data.action === "activate" ? "alto" : "medio" }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    return NextResponse.json({ request: updated }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}
