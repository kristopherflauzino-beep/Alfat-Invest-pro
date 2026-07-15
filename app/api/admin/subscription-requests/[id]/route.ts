import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireAdmin, revokeUserSessions } from "@/lib/auth/session";
import { deliverPlanEmailJob } from "@/lib/email/email-jobs";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";
import {
  appendSubscriptionHistory,
  normalizeSubscriptionRequests,
  type ManualSubscriptionRequest,
  type SubscriptionRequestStatus
} from "@/lib/subscriptions/manual-subscription";
import { addSubscriptionNotification } from "@/lib/subscriptions/subscription-notify";
import type { PlanEmailEvent } from "@/lib/email/templates/plan";
import type { NotificationPriority, NotificationTopic } from "@/lib/notifications/notifications";

export const runtime = "nodejs";
const schema = z.object({
  action: z.enum(["start_review", "confirm_payment", "activate", "reject", "cancel", "expire", "edit_expiration", "add_note"]),
  confirmationDate: z.string().date().optional(),
  startDate: z.string().date().optional(),
  expiryDate: z.string().date().optional(),
  transactionReference: z.string().trim().max(100).optional(),
  publicNote: z.string().trim().max(500).optional(),
  internalNote: z.string().trim().max(1000).optional(),
  confirmedAction: z.boolean().optional()
}).strict();

const atNoon = (date: string) => new Date(date + "T12:00:00.000Z");
const criticalActions = new Set(["confirm_payment", "activate", "reject", "cancel", "expire", "edit_expiration"]);

function actionTarget(action: z.infer<typeof schema>["action"], current: SubscriptionRequestStatus): SubscriptionRequestStatus {
  if (action === "start_review") return "under_review";
  if (action === "confirm_payment") return "payment_confirmed";
  if (action === "activate") return "activated";
  if (action === "reject") return "rejected";
  if (action === "cancel") return "cancelled";
  if (action === "expire") return "expired";
  return current;
}

function notificationFor(action: z.infer<typeof schema>["action"], request: ManualSubscriptionRequest) {
  const values: Partial<Record<z.infer<typeof schema>["action"], {
    topic: NotificationTopic;
    title: string;
    summary: string;
    priority: NotificationPriority;
    emailEvent: PlanEmailEvent;
  }>> = {
    start_review: { topic: "payment_status", title: "Solicitação em análise", summary: "O administrador iniciou a verificação do pagamento informado.", priority: "informative", emailEvent: "under_review" },
    confirm_payment: { topic: "payment_status", title: "Pagamento confirmado", summary: "O pagamento foi localizado e a assinatura aguarda ativação.", priority: "important", emailEvent: "payment_confirmed" },
    activate: { topic: "subscription_status", title: "Assinatura ativada", summary: "O plano " + request.planName + " foi ativado.", priority: "important", emailEvent: "subscription_activated" },
    reject: { topic: "payment_status", title: "Solicitação recusada", summary: request.publicNote || "Não foi possível confirmar o pagamento.", priority: "important", emailEvent: "request_rejected" },
    cancel: { topic: "subscription_status", title: "Assinatura cancelada", summary: request.publicNote || "O cancelamento da assinatura foi registrado.", priority: "important", emailEvent: "subscription_cancelled" },
    expire: { topic: "plan_expiration", title: "Solicitação expirada", summary: request.publicNote || "O prazo da solicitação chegou ao fim.", priority: "attention", emailEvent: "plan_expired" },
    edit_expiration: { topic: "subscription_status", title: "Vencimento atualizado", summary: "A data de vencimento da assinatura foi atualizada pelo administrador.", priority: "important", emailEvent: "plan_renewed" },
    add_note: { topic: "admin_messages", title: "Nova observação do administrador", summary: request.publicNote || "Existe uma nova orientação na sua solicitação.", priority: "attention", emailEvent: "public_note" }
  };
  return values[action];
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Dados administrativos inválidos." }, { status: 422 });
    const data = parsed.data;
    if (criticalActions.has(data.action) && data.confirmedAction !== true) {
      return NextResponse.json({ error: "Confirme a ação administrativa antes de continuar." }, { status: 422 });
    }
    if (data.action === "confirm_payment" && !data.confirmationDate) {
      return NextResponse.json({ error: "Informe a data da confirmação." }, { status: 422 });
    }
    if (["activate", "edit_expiration"].includes(data.action) && !data.expiryDate) {
      return NextResponse.json({ error: "Informe o vencimento da assinatura." }, { status: 422 });
    }
    if (data.action === "activate" && !data.startDate) {
      return NextResponse.json({ error: "Informe início e vencimento da assinatura." }, { status: 422 });
    }
    if (data.action === "reject" && (!data.publicNote || data.publicNote.length < 3)) {
      return NextResponse.json({ error: "Informe ao cliente o motivo da recusa." }, { status: 422 });
    }
    if (data.action === "add_note" && !data.publicNote && !data.internalNote) {
      return NextResponse.json({ error: "Informe uma observação pública ou interna." }, { status: 422 });
    }
    if (data.startDate && data.expiryDate && atNoon(data.expiryDate) < atNoon(data.startDate)) {
      return NextResponse.json({ error: "O vencimento não pode ser anterior ao início." }, { status: 422 });
    }

    const { id } = await params;
    const state = await readCoreState();
    const requests = normalizeSubscriptionRequests(state.subscriptionRequests);
    const index = requests.findIndex((item) => item.id === id);
    if (index < 0) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    const current = requests[index];
    const accountIndex = state.accounts.findIndex((item) => item.id === current.userId);
    if (accountIndex < 0) return NextResponse.json({ error: "Usuário da solicitação não encontrado." }, { status: 404 });
    const account = state.accounts[accountIndex];

    if (data.action === "start_review" && current.status !== "awaiting_verification") {
      return NextResponse.json({ error: "Somente solicitações aguardando verificação podem entrar em análise." }, { status: 409 });
    }
    if (data.action === "confirm_payment" && !["awaiting_verification", "under_review"].includes(current.status)) {
      return NextResponse.json({ error: "A solicitação não está disponível para confirmação." }, { status: 409 });
    }
    if (data.action === "activate" && current.status !== "payment_confirmed") {
      return NextResponse.json({ error: "Confirme o pagamento antes de ativar a assinatura." }, { status: 409 });
    }
    if (["rejected", "cancelled", "expired"].includes(current.status) && !["add_note"].includes(data.action)) {
      return NextResponse.json({ error: "Esta solicitação já foi encerrada." }, { status: 409 });
    }

    const nextStatus = actionTarget(data.action, current.status);
    let updated = appendSubscriptionHistory(current, {
      newStatus: nextStatus,
      actorId: admin.id,
      actorName: admin.name,
      origin: "admin",
      action: data.action,
      publicNote: data.publicNote,
      internalNote: data.internalNote
    });
    const now = updated.updatedAt;
    updated = {
      ...updated,
      publicNote: data.publicNote || current.publicNote,
      internalNote: data.internalNote || current.internalNote,
      transactionReference: data.transactionReference || current.transactionReference,
      confirmedAt: data.action === "confirm_payment" && data.confirmationDate ? atNoon(data.confirmationDate).toISOString() : current.confirmedAt,
      activatedAt: data.action === "activate" && data.startDate ? atNoon(data.startDate).toISOString() : current.activatedAt,
      expiresAt: ["activate", "edit_expiration"].includes(data.action) && data.expiryDate ? atNoon(data.expiryDate).toISOString() : current.expiresAt,
      rejectedAt: data.action === "reject" ? now : current.rejectedAt,
      cancelledAt: data.action === "cancel" ? now : current.cancelledAt,
      expiredAt: data.action === "expire" ? now : current.expiredAt,
      reviewedByUserId: admin.id
    };

    if (data.action === "activate") {
      const plan = state.plans.find((item) => item.id === current.planId && item.status === "ativo");
      if (!plan) return NextResponse.json({ error: "Plano da solicitação não encontrado ou inativo." }, { status: 404 });
      state.accounts[accountIndex] = {
        ...account,
        planId: plan.id,
        planValue: current.amountInCents / 100,
        planStartedAt: data.startDate,
        dueDate: data.expiryDate,
        status: "ativo",
        permissions: plan.permissions
      };
      const payments = Array.isArray(state.payments) ? state.payments : [];
      if (!payments.some((item) => item && typeof item === "object" && (item as Record<string, unknown>).id === "manual-" + current.id)) {
        state.payments = [{
          id: "manual-" + current.id,
          clientId: current.userId,
          planId: current.planId,
          planName: current.planName,
          value: current.amountInCents / 100,
          paymentDate: data.confirmationDate || current.confirmedAt?.slice(0, 10) || data.startDate,
          dueDate: data.expiryDate,
          status: "pago",
          method: "mercado_pago_link",
          transactionId: data.transactionReference || current.transactionReference,
          notes: data.publicNote,
          createdBy: admin.id
        }, ...payments];
      }
    }

    if (data.action === "edit_expiration" && data.expiryDate) {
      if (current.status !== "activated") return NextResponse.json({ error: "Somente assinaturas ativadas aceitam alteração de vencimento." }, { status: 409 });
      state.accounts[accountIndex] = { ...account, dueDate: data.expiryDate };
    }
    if (["cancel", "expire"].includes(data.action) && current.status === "activated") {
      state.accounts[accountIndex] = { ...account, status: data.action === "expire" ? "vencido" : "bloqueado" };
      await revokeUserSessions(current.userId);
    }

    requests[index] = updated;
    state.subscriptionRequests = requests;
    const notification = notificationFor(data.action, updated);
    const emailJob = notification && (data.action !== "add_note" || Boolean(data.publicNote))
      ? addSubscriptionNotification(state, account, updated, notification)
      : null;
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "assinatura_" + data.action,
      userId: admin.id,
      userName: admin.name,
      details: "Solicitação " + current.id + " alterada de " + current.status + " para " + nextStatus + ".",
      createdAt: now,
      risk: ["activate", "confirm_payment", "reject"].includes(data.action) ? "alto" : "medio"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    if (emailJob && (!emailJob.nextAttemptAt || new Date(emailJob.nextAttemptAt).getTime() <= Date.now())) await deliverPlanEmailJob(emailJob.id).catch(() => undefined);
    return NextResponse.json({ request: updated }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}