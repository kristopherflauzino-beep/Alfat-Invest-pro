import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireAccount } from "@/lib/auth/session";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";
import { isSubscriptionRequest, type ManualSubscriptionRequest } from "@/lib/subscriptions/manual-subscription";

export const runtime = "nodejs";
const schema = z.object({ planId: z.string().min(1).max(50) }).strict();

export async function GET(request: Request) {
  try {
    const account = await requireAccount(request);
    const state = await readCoreState();
    const requests = (Array.isArray(state.subscriptionRequests) ? state.subscriptionRequests : [])
      .filter(isSubscriptionRequest)
      .filter((item) => item.userId === account.id)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return NextResponse.json({ requests }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await requireAccount(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Plano inválido." }, { status: 422 });
    const idempotencyKey = (request.headers.get("idempotency-key") || randomUUID()).slice(0, 150);
    const state = await readCoreState();
    const plan = state.plans.find((item) => item.id === parsed.data.planId && item.status === "ativo");
    if (!plan) return NextResponse.json({ error: "Plano indisponível." }, { status: 422 });
    const items = (Array.isArray(state.subscriptionRequests) ? state.subscriptionRequests : []).filter(isSubscriptionRequest);
    const existing = items.find((item) => item.userId === account.id && item.idempotencyKey === idempotencyKey);
    if (existing) return NextResponse.json({ request: existing }, { status: 200 });
    const now = new Date().toISOString();
    const item: ManualSubscriptionRequest = {
      id: randomUUID(),
      userId: account.id,
      userName: account.name,
      email: account.email,
      planId: plan.id,
      planName: plan.name,
      planValue: Number(plan.value),
      durationDays: Number(plan.durationDays),
      status: "aguardando_confirmacao",
      idempotencyKey,
      requestedAt: now,
      updatedAt: now,
      history: [{ id: randomUUID(), action: "solicitacao_criada", status: "aguardando_confirmacao", actorId: account.id, actorName: account.name, createdAt: now }]
    };
    state.subscriptionRequests = [item, ...items];
    state.auditLogs = [{ id: randomUUID(), action: "solicitacao_assinatura_criada", userId: account.id, userName: account.name, details: `Solicitação do plano ${plan.name} registrada para conferência manual.`, createdAt: now, risk: "baixo" }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    return NextResponse.json({ request: item }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}
