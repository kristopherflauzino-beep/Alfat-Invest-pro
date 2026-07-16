import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, passwordPolicy } from "@/lib/auth/password";
import { hashRateLimitValue } from "@/lib/auth/password-reset";
import {
  EMAIL_VERIFICATION_TTL_MS,
  PENDING_REGISTRATION_TTL_MS,
  createEmailVerificationToken,
  isEmailVerificationRateEvent,
  isEmailVerificationToken,
  isPendingRegistration,
  pendingRegistrationState,
  type EmailVerificationRateEvent,
  type EmailVerificationTokenRecord,
  type PendingRegistration
} from "@/lib/auth/email-verification";
import { sendEmail } from "@/lib/email/email-service";
import { registrationConfirmationEmail } from "@/lib/email/templates/registration";
import { officialAppUrl } from "@/lib/email/templates/base";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9._-]+$/u),
  email: z.string().trim().email().max(254),
  confirmEmail: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional().default(""),
  password: z.string().min(1).max(256),
  confirmPassword: z.string().min(1).max(256),
  planId: z.string().trim().min(1).max(50),
  acceptTerms: z.literal(true),
  acceptPrivacy: z.literal(true),
  acceptMarketing: z.boolean().optional().default(false)
}).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Revise os dados, o plano e os aceites obrigatórios." }, { status: 422 });
    const input = parsed.data;
    const email = input.email.toLowerCase();
    const username = input.username.toLowerCase();
    if (email !== input.confirmEmail.toLowerCase()) return NextResponse.json({ error: "Os e-mails informados não são iguais." }, { status: 422 });
    if (input.password !== input.confirmPassword) return NextResponse.json({ error: "As senhas informadas não são iguais." }, { status: 422 });
    const policy = passwordPolicy(input.password, { name: input.name, email, username });
    if (policy) return NextResponse.json({ error: policy }, { status: 422 });

    const state = await readCoreState();
    const now = new Date();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const pepper = process.env.SESSION_SECRET || "registration";
    const ipHash = hashRateLimitValue(pepper + "|registration-ip|" + ip);
    const emailHash = hashRateLimitValue(pepper + "|registration-email|" + email);
    const cutoff = now.getTime() - 60 * 60 * 1000;
    const rateEvents = (Array.isArray(state.emailVerificationRateEvents) ? state.emailVerificationRateEvents : [])
      .filter(isEmailVerificationRateEvent)
      .filter((item) => new Date(item.createdAt).getTime() > cutoff);
    if (rateEvents.filter((item) => item.ipHash === ipHash).length >= 5) {
      return NextResponse.json({ error: "Muitas tentativas de cadastro. Aguarde antes de tentar novamente." }, { status: 429, headers: { "Retry-After": "3600" } });
    }

    const pending = (Array.isArray(state.pendingRegistrations) ? state.pendingRegistrations : []).filter(isPendingRegistration);
    const activePending = pending.filter((item) => pendingRegistrationState(item, now.getTime()) !== "expired");
    if (state.accounts.some((item) => item.email.toLowerCase() === email || item.username.toLowerCase() === username)) {
      return NextResponse.json({ error: "E-mail ou nome de usuário já cadastrado." }, { status: 409 });
    }
    if (activePending.some((item) => item.email === email || item.username === username)) {
      return NextResponse.json({ error: "Já existe um cadastro provisório para este e-mail ou usuário. Use a opção de reenviar confirmação." }, { status: 409 });
    }
    const plan = state.plans.find((item) => item.id === input.planId && item.status === "ativo");
    if (!plan) return NextResponse.json({ error: "Plano indisponível." }, { status: 422 });

    const registration: PendingRegistration = {
      id: crypto.randomUUID(),
      name: input.name,
      username,
      email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      acceptedTermsAt: now.toISOString(),
      acceptedPrivacyAt: now.toISOString(),
      acceptedMarketingAt: input.acceptMarketing ? now.toISOString() : undefined,
      planId: plan.id,
      planName: plan.name,
      planPriceInCents: Math.round(plan.value * 100),
      durationDays: plan.durationDays,
      permissions: plan.permissions,
      status: "awaiting_email_confirmation",
      paymentProvider: "mercado_pago",
      expiresAt: new Date(now.getTime() + PENDING_REGISTRATION_TTL_MS).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    const generated = createEmailVerificationToken();
    const tokenRecord: EmailVerificationTokenRecord = {
      id: crypto.randomUUID(),
      pendingRegistrationId: registration.id,
      tokenHash: generated.tokenHash,
      expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
      requestedAt: now.toISOString(),
      createdAt: now.toISOString()
    };
    const tokens = (Array.isArray(state.emailVerificationTokens) ? state.emailVerificationTokens : []).filter(isEmailVerificationToken);
    state.pendingRegistrations = [
      registration,
      ...pending.map((item) => pendingRegistrationState(item, now.getTime()) === "expired" && item.status !== "expired" ? { ...item, status: "expired", updatedAt: now.toISOString() } : item)
    ].slice(0, 5000);
    state.emailVerificationTokens = [tokenRecord, ...tokens].slice(0, 5000);
    const rateEvent: EmailVerificationRateEvent = { id: crypto.randomUUID(), pendingRegistrationId: registration.id, emailHash, ipHash, createdAt: now.toISOString() };
    state.emailVerificationRateEvents = [rateEvent, ...rateEvents].slice(0, 5000);
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "cadastro_provisorio_criado",
      userId: registration.id,
      userName: registration.name,
      details: "Cadastro provisório criado para o plano " + plan.name + "; aguardando confirmação de e-mail.",
      origin: "public_registration",
      result: "awaiting_email_confirmation",
      createdAt: now.toISOString(),
      risk: "baixo"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);

    const confirmationUrl = officialAppUrl() + "/confirmar-email?token=" + encodeURIComponent(generated.token);
    const template = registrationConfirmationEmail({ name: registration.name, confirmationUrl, planName: plan.name });
    const delivery = await sendEmail({
      to: email,
      ...template,
      userId: registration.id,
      type: "registration_confirmation",
      idempotencyKey: "registration-confirmation:" + tokenRecord.id
    });
    return NextResponse.json({
      ok: true,
      pendingRegistrationId: registration.id,
      emailStatus: delivery.status,
      message: delivery.sent
        ? "Cadastro provisório criado. Verifique seu e-mail para continuar."
        : "Cadastro provisório criado, mas o e-mail ainda não foi entregue. Use a opção de reenviar confirmação."
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestErrorResponse(error);
  }
}
