import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireAccount } from "@/lib/auth/session";
import { deliverPlanEmailJob } from "@/lib/email/email-jobs";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";
import {
  appendSubscriptionHistory,
  canRequestVerification,
  normalizeSubscriptionRequests,
  operationalSubscriptionStatuses
} from "@/lib/subscriptions/manual-subscription";
import { addSubscriptionNotification } from "@/lib/subscriptions/subscription-notify";

export const runtime = "nodejs";
const schema = z.object({
  confirmedPayment: z.literal(true),
  paymentName: z.string().trim().min(3).max(120).optional(),
  approximatePaymentDate: z.string().date().optional(),
  transactionReference: z.string().trim().max(100).optional(),
  customerNote: z.string().trim().max(500).optional()
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const account = await requireAccount(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Confirme o pagamento e confira os dados informados." }, { status: 422 });
    const { id } = await params;
    const state = await readCoreState();
    const requests = normalizeSubscriptionRequests(state.subscriptionRequests);
    const index = requests.findIndex((item) => item.id === id && item.userId === account.id);
    if (index < 0) return NextResponse.json({ error: "Intenção de assinatura não encontrada." }, { status: 404 });
    const current = requests[index];
    const plan = state.plans.find((item) => item.id === current.planId && item.status === "ativo");
    if (!plan) return NextResponse.json({ error: "O plano não está mais disponível." }, { status: 409 });
    const currentPriceInCents = Math.round(Number(plan.value) * 100);
    if (!canRequestVerification(current, currentPriceInCents)) {
      return NextResponse.json({ error: "A intenção expirou ou o valor do plano mudou. Acesse novamente o Mercado Pago." }, { status: 409 });
    }
    const duplicate = requests.find((item) =>
      item.id !== current.id &&
      item.userId === account.id &&
      item.planId === current.planId &&
      operationalSubscriptionStatuses.includes(item.status)
    );
    if (duplicate) return NextResponse.json({ error: "Já existe uma solicitação de verificação em andamento para este plano." }, { status: 409 });
    const now = new Date().toISOString();
    let updated = appendSubscriptionHistory(current, {
      newStatus: "awaiting_verification",
      actorId: account.id,
      actorName: account.name,
      origin: "client",
      action: "verificacao_solicitada"
    });
    updated = {
      ...updated,
      verificationRequestedAt: now,
      paymentName: parsed.data.paymentName || account.name,
      approximatePaymentDate: parsed.data.approximatePaymentDate,
      transactionReference: parsed.data.transactionReference || undefined,
      customerNote: parsed.data.customerNote || undefined
    };
    requests[index] = updated;
    state.subscriptionRequests = requests;
    const emailJob = addSubscriptionNotification(state, account, updated, {
      topic: "payment_status",
      title: "Solicitação de verificação recebida",
      summary: "O pagamento informado será analisado manualmente pelo administrador.",
      priority: "informative",
      emailEvent: "request_created"
    });
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "verificacao_pagamento_solicitada",
      userId: account.id,
      userName: account.name,
      details: "Solicitação criada após acesso registrado ao link oficial; nenhuma ativação automática foi realizada.",
      createdAt: now,
      risk: "baixo"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    if (emailJob && (!emailJob.nextAttemptAt || new Date(emailJob.nextAttemptAt).getTime() <= Date.now())) await deliverPlanEmailJob(emailJob.id).catch(() => undefined);
    const { internalNote: _internalNote, idempotencyKey: _idempotencyKey, history, ...safeRequest } = updated;
    const safe = { ...safeRequest, history: history.map(({ internalNote: _historyInternal, ...entry }) => entry) };
    return NextResponse.json({
      request: safe,
      message: "Sua solicitação foi registrada. O pagamento será verificado pelo administrador antes da ativação do plano."
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}