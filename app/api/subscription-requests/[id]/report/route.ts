import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireAccount } from "@/lib/auth/session";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";
import { isSubscriptionRequest } from "@/lib/subscriptions/manual-subscription";

export const runtime = "nodejs";
const schema = z.object({
  fullName: z.string().min(3).max(120),
  email: z.string().email().max(180),
  planId: z.string().min(1).max(50),
  approximatePaymentDate: z.string().date(),
  transactionId: z.string().max(100).optional().default(""),
  note: z.string().max(500).optional().default("")
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const account = await requireAccount(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Confira os dados informados." }, { status: 422 });
    const { id } = await params;
    const state = await readCoreState();
    const items = (Array.isArray(state.subscriptionRequests) ? state.subscriptionRequests : []).filter(isSubscriptionRequest);
    const index = items.findIndex((item) => item.id === id && item.userId === account.id);
    if (index < 0) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    const current = items[index];
    if (current.status !== "aguardando_confirmacao") return NextResponse.json({ error: "Esta solicitação não aceita novas informações." }, { status: 409 });
    if (current.planId !== parsed.data.planId) return NextResponse.json({ error: "O plano informado não corresponde à solicitação." }, { status: 422 });
    const now = new Date().toISOString();
    items[index] = {
      ...current,
      userName: parsed.data.fullName,
      email: parsed.data.email,
      approximatePaymentDate: parsed.data.approximatePaymentDate,
      transactionId: parsed.data.transactionId || undefined,
      clientNote: parsed.data.note || undefined,
      reportedAt: now,
      updatedAt: now,
      history: [...current.history, { id: randomUUID(), action: "pagamento_informado_pelo_cliente", status: current.status, actorId: account.id, actorName: account.name, createdAt: now }]
    };
    state.subscriptionRequests = items;
    state.auditLogs = [{ id: randomUUID(), action: "pagamento_informado", userId: account.id, userName: account.name, details: `Cliente informou pagamento da solicitação ${current.id}; nenhuma ativação automática foi realizada.`, createdAt: now, risk: "baixo" }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    return NextResponse.json({ request: items[index], message: "Sua solicitação foi registrada. O pagamento será verificado pelo administrador antes da ativação do plano." }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}
