import { NextResponse } from "next/server";
import { AuthError, authErrorResponse, requireAdmin } from "@/lib/auth/session";
import {
  EMAIL_VERIFICATION_TTL_MS,
  PENDING_REGISTRATION_TTL_MS,
  createEmailVerificationToken,
  isEmailVerificationToken,
  isPendingRegistration,
  pendingRegistrationState,
  type EmailVerificationTokenRecord
} from "@/lib/auth/email-verification";
import { emailConfigurationStatus, sendEmail } from "@/lib/email/email-service";
import { registrationConfirmationEmail } from "@/lib/email/templates/registration";
import { officialAppUrl } from "@/lib/email/templates/base";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";
const RESEND_COOLDOWN_MS = 60_000;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin(request);
    const configuration = emailConfigurationStatus();
    if (!configuration.configured) {
      return NextResponse.json({
        error: "Configuração SMTP incompleta. Configure EMAIL_SMTP_PASSWORD na Vercel antes de reenviar."
      }, { status: 503 });
    }

    const { id } = await params;
    const state = await readCoreState();
    const registrations = (Array.isArray(state.pendingRegistrations) ? state.pendingRegistrations : []).filter(isPendingRegistration);
    const registrationIndex = registrations.findIndex((item) => item.id === id);
    const registration = registrations[registrationIndex];
    if (!registration) return NextResponse.json({ error: "Conta em processo de ativação não encontrada." }, { status: 404 });
    if (pendingRegistrationState(registration) === "expired") {
      return NextResponse.json({ error: "O prazo da conta pendente expirou." }, { status: 410 });
    }
    if (registration.status !== "awaiting_email_confirmation") {
      return NextResponse.json({ error: "O e-mail deste cadastro já foi confirmado ou o cadastro foi encerrado." }, { status: 409 });
    }

    const now = new Date();
    const tokens = (Array.isArray(state.emailVerificationTokens) ? state.emailVerificationTokens : []).filter(isEmailVerificationToken);
    const latest = tokens
      .filter((item) => item.pendingRegistrationId === registration.id)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
    if (latest && now.getTime() - new Date(latest.requestedAt).getTime() < RESEND_COOLDOWN_MS) {
      return NextResponse.json({ error: "Aguarde 60 segundos antes de solicitar outro envio." }, {
        status: 429,
        headers: { "Retry-After": "60" }
      });
    }

    const generated = createEmailVerificationToken();
    const token: EmailVerificationTokenRecord = {
      id: crypto.randomUUID(),
      pendingRegistrationId: registration.id,
      tokenHash: generated.tokenHash,
      expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
      requestedAt: now.toISOString(),
      createdAt: now.toISOString()
    };
    state.emailVerificationTokens = [
      token,
      ...tokens.map((item) =>
        item.pendingRegistrationId === registration.id && !item.usedAt
          ? { ...item, usedAt: now.toISOString() }
          : item
      )
    ].slice(0, 5000);
    registrations[registrationIndex] = {
      ...registration,
      expiresAt: new Date(now.getTime() + PENDING_REGISTRATION_TTL_MS).toISOString(),
      updatedAt: now.toISOString()
    };
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
        registrationStatus: "awaiting_email_confirmation",
        registrationExpiresAt: registrations[registrationIndex].expiresAt
      };
    }
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "confirmacao_email_cadastro_reenviada",
      userId: admin.id,
      userName: admin.name,
      targetUserId: registration.id,
      details: "Administrador solicitou novo e-mail de confirmação para a conta pendente.",
      createdAt: now.toISOString(),
      risk: "baixo"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);

    const confirmationUrl = officialAppUrl() + "/confirmar-email?token=" + encodeURIComponent(generated.token);
    const template = registrationConfirmationEmail({ name: registration.name, confirmationUrl, planName: registration.planName });
    const delivery = await sendEmail({
      to: registration.email,
      ...template,
      userId: accountId,
      type: "registration_confirmation_admin_resend",
      idempotencyKey: "registration-confirmation-admin-resend:" + token.id
    });
    if (!delivery.sent) {
      return NextResponse.json({ error: delivery.errorMessage || "O provedor SMTP não aceitou a mensagem." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, message: "E-mail de confirmação reenviado." });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}
