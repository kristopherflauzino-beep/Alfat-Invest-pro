import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireAccount } from "@/lib/auth/session";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";
import {
  MERCADO_PAGO_PAYMENT_LINK,
  PAYMENT_INTENT_TTL_MS,
  appendSubscriptionHistory,
  isIntentExpired,
  normalizeSubscriptionRequests,
  operationalSubscriptionStatuses,
  type ManualSubscriptionRequest
} from "@/lib/subscriptions/manual-subscription";

export const runtime = "nodejs";
const schema = z.object({ planId: z.string().min(1).max(50) }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await requireAccount(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Plano inválido." }, { status: 422 });
    const state = await readCoreState();
    const plan = state.plans.find((item) => item.id === parsed.data.planId && item.status === "ativo");
    if (!plan) return NextResponse.json({ error: "Plano indisponível." }, { status: 422 });
    const amountInCents = Math.round(Number(plan.value) * 100);
    const now = new Date();
    let requests = normalizeSubscriptionRequests(state.subscriptionRequests);
    requests = requests.map((item) => {
      if (item.status === "awaiting_payment" && isIntentExpired(item, now.getTime())) {
        const expired = appendSubscriptionHistory(item, {
          newStatus: "expired",
          actorId: "system",
          actorName: "Sistema",
          origin: "system",
          action: "intencao_expirada"
        });
        return { ...expired, expiredAt: now.toISOString() };
      }
      return item;
    });
    const duplicate = requests.find((item) =>
      item.userId === account.id &&
      item.planId === plan.id &&
      operationalSubscriptionStatuses.includes(item.status)
    );
    if (duplicate) {
      state.subscriptionRequests = requests;
      await writeCoreState(state);
      return NextResponse.json({ error: "Já existe uma solicitação de verificação em andamento para este plano." }, { status: 409 });
    }
    const existing = requests.find((item) =>
      item.userId === account.id &&
      item.planId === plan.id &&
      item.status === "awaiting_payment" &&
      !isIntentExpired(item, now.getTime()) &&
      item.amountInCents === amountInCents
    );
    let intent: ManualSubscriptionRequest;
    if (existing) {
      intent = appendSubscriptionHistory(existing, {
        newStatus: "awaiting_payment",
        actorId: account.id,
        actorName: account.name,
        origin: "client",
        action: "link_mercado_pago_reaberto"
      });
      intent = {
        ...intent,
        paymentLinkOpenedAt: now.toISOString(),
        intentExpiresAt: new Date(now.getTime() + PAYMENT_INTENT_TTL_MS).toISOString()
      };
      requests = requests.map((item) => item.id === intent.id ? intent : item);
    } else {
      intent = {
        id: crypto.randomUUID(),
        userId: account.id,
        userName: account.name,
        email: account.email,
        planId: plan.id,
        planName: plan.name,
        amountInCents,
        durationDays: Number(plan.durationDays),
        status: "awaiting_payment",
        idempotencyKey: crypto.randomUUID(),
        paymentLinkOpenedAt: now.toISOString(),
        paymentLinkUrl: MERCADO_PAGO_PAYMENT_LINK,
        intentExpiresAt: new Date(now.getTime() + PAYMENT_INTENT_TTL_MS).toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        history: [{
          id: crypto.randomUUID(),
          newStatus: "awaiting_payment",
          actorId: account.id,
          actorName: account.name,
          origin: "client",
          action: "link_mercado_pago_aberto",
          createdAt: now.toISOString()
        }]
      };
      requests = [intent, ...requests];
    }
    state.subscriptionRequests = requests;
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "link_mercado_pago_aberto",
      userId: account.id,
      userName: account.name,
      details: "Acesso ao link oficial registrado para o plano " + plan.name + ". Nenhuma ativação automática foi realizada.",
      createdAt: now.toISOString(),
      risk: "baixo"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    return NextResponse.json({
      intent: { ...intent, internalNote: undefined, idempotencyKey: undefined, history: intent.history.map(({ internalNote: _internalNote, ...entry }) => entry) },
      paymentUrl: MERCADO_PAGO_PAYMENT_LINK
    }, { status: existing ? 200 : 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}