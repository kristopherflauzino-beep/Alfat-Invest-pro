import { NextResponse } from "next/server";
import { z } from "zod";
import { hashEmailVerificationToken, isPendingRegistration, pendingRegistrationState } from "@/lib/auth/email-verification";
import { sendEmail } from "@/lib/email/email-service";
import { paymentUnderReviewEmail } from "@/lib/email/templates/registration";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { MERCADO_PAGO_PAYMENT_LINK } from "@/lib/subscriptions/manual-subscription";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open"), continuationToken: z.string().min(32).max(256) }).strict(),
  z.object({
    action: z.literal("report"),
    continuationToken: z.string().min(32).max(256),
    paymentName: z.string().trim().min(2).max(120),
    approximatePaymentDate: z.string().date(),
    transactionId: z.string().trim().max(100).optional(),
    customerNote: z.string().trim().max(500).optional()
  }).strict()
]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Dados da solicitação inválidos." }, { status: 422 });
    const state = await readCoreState();
    const registrations = (Array.isArray(state.pendingRegistrations) ? state.pendingRegistrations : []).filter(isPendingRegistration);
    const hash = hashEmailVerificationToken(parsed.data.continuationToken);
    const index = registrations.findIndex((item) => item.continuationTokenHash === hash);
    const current = registrations[index];
    if (!current) return NextResponse.json({ error: "Cadastro não encontrado." }, { status: 404 });
    const status = pendingRegistrationState(current);
    if (status === "expired") return NextResponse.json({ error: "Seu cadastro provisório expirou. Inicie novamente para continuar." }, { status: 410 });
    if (!current.emailVerifiedAt) return NextResponse.json({ error: "Confirme seu e-mail antes de prosseguir." }, { status: 403 });
    if (["activated", "cancelled", "rejected"].includes(status)) return NextResponse.json({ error: "Este cadastro não aceita novas alterações." }, { status: 409 });

    const now = new Date().toISOString();
    const updated = parsed.data.action === "open"
      ? {
          ...current,
          paymentLinkOpenedAt: now,
          updatedAt: now
        }
      : {
          ...current,
          status: "payment_under_review" as const,
          paymentReportedAt: now,
          paymentName: parsed.data.paymentName,
          approximatePaymentDate: parsed.data.approximatePaymentDate,
          transactionId: parsed.data.transactionId,
          customerNote: parsed.data.customerNote,
          updatedAt: now
        };
    registrations[index] = updated;
    state.pendingRegistrations = registrations;
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: parsed.data.action === "open" ? "link_mercado_pago_cadastro_aberto" : "pagamento_cadastro_informado",
      userId: current.id,
      userName: current.name,
      details: parsed.data.action === "open"
        ? "Link oficial do Mercado Pago aberto; nenhuma ativação automática realizada."
        : "Usuário solicitou verificação manual do pagamento.",
      origin: "public_registration",
      result: updated.status,
      createdAt: now,
      risk: "baixo"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);

    if (parsed.data.action === "report") {
      const template = paymentUnderReviewEmail({ name: current.name, planName: current.planName });
      await sendEmail({
        to: current.email,
        ...template,
        userId: current.id,
        type: "registration_payment_under_review",
        idempotencyKey: "registration-payment-review:" + current.id
      });
    }
    return NextResponse.json({
      ok: true,
      status: updated.status,
      paymentUrl: parsed.data.action === "open" ? MERCADO_PAGO_PAYMENT_LINK : undefined,
      message: parsed.data.action === "report"
        ? "Sua solicitação foi registrada. O pagamento será verificado pelo administrador antes da ativação do plano."
        : "Acesso ao Mercado Pago registrado. Sua conta continua inativa até a confirmação administrativa."
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestErrorResponse(error);
  }
}
