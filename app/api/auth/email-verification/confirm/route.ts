import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createEmailVerificationToken,
  emailVerificationTokenState,
  hashEmailVerificationToken,
  isEmailVerificationToken,
  isPendingRegistration,
  pendingRegistrationState
} from "@/lib/auth/email-verification";
import { sendEmail } from "@/lib/email/email-service";
import {
  emailVerifiedAwaitingPaymentEmail,
  pendingRegistrationAdminEmail
} from "@/lib/email/templates/registration";
import { officialAppUrl } from "@/lib/email/templates/base";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.object({ token: z.string().min(32).max(256) }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Link de confirmação inválido." }, { status: 422 });
    const state = await readCoreState();
    const now = new Date();
    const tokens = (Array.isArray(state.emailVerificationTokens) ? state.emailVerificationTokens : []).filter(isEmailVerificationToken);
    const tokenHash = hashEmailVerificationToken(parsed.data.token);
    const tokenIndex = tokens.findIndex((item) => item.tokenHash === tokenHash);
    const token = tokens[tokenIndex];
    const tokenState = emailVerificationTokenState(token, now.getTime());
    if (tokenState === "used") return NextResponse.json({ error: "Este link já foi utilizado." }, { status: 409 });
    if (tokenState === "expired") return NextResponse.json({ error: "Este link expirou. Solicite uma nova confirmação." }, { status: 410 });
    if (tokenState !== "valid") return NextResponse.json({ error: "Link de confirmação inválido." }, { status: 404 });

    const registrations = (Array.isArray(state.pendingRegistrations) ? state.pendingRegistrations : []).filter(isPendingRegistration);
    const registrationIndex = registrations.findIndex((item) => item.id === token.pendingRegistrationId);
    const registration = registrations[registrationIndex];
    if (!registration || pendingRegistrationState(registration, now.getTime()) === "expired") {
      return NextResponse.json({ error: "O prazo para concluir sua conta expirou. Inicie novamente para continuar." }, { status: 410 });
    }
    if (registration.status !== "awaiting_email_confirmation") {
      return NextResponse.json({ error: "O e-mail deste cadastro já foi confirmado." }, { status: 409 });
    }

    const continuation = createEmailVerificationToken();
    const updated = {
      ...registration,
      emailVerifiedAt: now.toISOString(),
      continuationTokenHash: continuation.tokenHash,
      status: "awaiting_payment" as const,
      updatedAt: now.toISOString()
    };
    registrations[registrationIndex] = updated;
    state.pendingRegistrations = registrations;
    const accountIndex = state.accounts.findIndex((item) =>
      item.id === registration.userId ||
      item.email.toLowerCase() === registration.email ||
      item.username.toLowerCase() === registration.username
    );
    const accountId = accountIndex >= 0 ? state.accounts[accountIndex].id : registration.userId || registration.id;
    if (accountIndex >= 0) {
      state.accounts[accountIndex] = {
        ...state.accounts[accountIndex],
        emailVerifiedAt: now.toISOString(),
        registrationStatus: "awaiting_payment",
        registrationWorkflowId: registration.id
      };
    }
    state.emailVerificationTokens = tokens.map((item) =>
      item.pendingRegistrationId === registration.id && !item.usedAt ? { ...item, usedAt: now.toISOString() } : item
    );
    const adminAccounts = state.accounts.filter((item) => item.role === "ADMIN");
    const notifications = Array.isArray(state.notifications) ? state.notifications : [];
    state.notifications = [
      ...adminAccounts.map((admin) => ({
        id: crypto.randomUUID(),
        userId: admin.id,
        topic: "payment_status",
        title: "Novo cadastro aguardando pagamento",
        summary: registration.name + " confirmou o e-mail e selecionou o plano " + registration.planName + ".",
        priority: "attention",
        category: "payments",
        actionUrl: "/",
        createdAt: now.toISOString()
      })),
      ...notifications
    ];
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "email_cadastro_confirmado",
      userId: accountId,
      userName: registration.name,
      details: "E-mail confirmado; conta aguardando pagamento.",
      origin: "public_registration",
      result: "awaiting_payment",
      createdAt: now.toISOString(),
      risk: "baixo"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);

    const continuationUrl = officialAppUrl() + "/cadastro/continuar?token=" + encodeURIComponent(continuation.token);
    const userTemplate = emailVerifiedAwaitingPaymentEmail({ name: registration.name, planName: registration.planName, continuationUrl });
    await sendEmail({
      to: registration.email,
      ...userTemplate,
      userId: accountId,
      type: "registration_email_verified",
      idempotencyKey: "registration-email-verified:" + registration.id
    });
    const adminTemplate = pendingRegistrationAdminEmail({
      name: registration.name,
      email: registration.email,
      planName: registration.planName,
      createdAt: now.toLocaleString("pt-BR")
    });
    await sendEmail({
      to: process.env.ADMIN_EMAIL || "alfatecinvestpro@gmail.com",
      ...adminTemplate,
      type: "registration_admin_notice",
      idempotencyKey: "registration-admin-notice:" + registration.id
    });
    return NextResponse.json({ ok: true, continuationUrl, message: "E-mail confirmado. Agora conclua o pagamento para solicitar a ativação da conta." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestErrorResponse(error);
  }
}
