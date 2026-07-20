import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, passwordPolicy, verifyPassword } from "@/lib/auth/password";
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
import { freePlanDisplayName, isActiveFreePlan, isFreePlan } from "@/lib/plans/access";
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

    const workflows = (Array.isArray(state.pendingRegistrations) ? state.pendingRegistrations : []).filter(isPendingRegistration);
    const activeWorkflows = workflows.filter((item) => pendingRegistrationState(item, now.getTime()) !== "expired");
    const existingAccountIndex = state.accounts.findIndex((item) => item.email.toLowerCase() === email || item.username.toLowerCase() === username);
    const existingAccount = state.accounts[existingAccountIndex];
    if (existingAccount) {
      const workflowIndex = workflows.findIndex((item) =>
        item.userId === existingAccount.id ||
        item.id === existingAccount.registrationWorkflowId
      );
      const workflow = workflows[workflowIndex];
      const canResume = existingAccount.email.toLowerCase() === email &&
        existingAccount.username.toLowerCase() === username &&
        existingAccount.registrationStatus === "awaiting_email_confirmation" &&
        workflow?.status === "awaiting_email_confirmation" &&
        pendingRegistrationState(workflow, now.getTime()) !== "expired" &&
        await verifyPassword(input.password, existingAccount.passwordHash);

      if (!canResume) {
        return NextResponse.json({ error: "E-mail ou nome de usuário já cadastrado. Entre na conta ou solicite o reenvio da confirmação." }, { status: 409 });
      }

      const generated = createEmailVerificationToken();
      const tokenRecord: EmailVerificationTokenRecord = {
        id: crypto.randomUUID(),
        pendingRegistrationId: workflow.id,
        tokenHash: generated.tokenHash,
        expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
        requestedAt: now.toISOString(),
        createdAt: now.toISOString()
      };
      const expiresAt = new Date(now.getTime() + PENDING_REGISTRATION_TTL_MS).toISOString();
      workflows[workflowIndex] = { ...workflow, expiresAt, updatedAt: now.toISOString() };
      const tokens = (Array.isArray(state.emailVerificationTokens) ? state.emailVerificationTokens : []).filter(isEmailVerificationToken);
      state.pendingRegistrations = workflows;
      state.emailVerificationTokens = [
        tokenRecord,
        ...tokens.map((item) =>
          item.pendingRegistrationId === workflow.id && !item.usedAt ? { ...item, usedAt: now.toISOString() } : item
        )
      ].slice(0, 5000);
      state.accounts[existingAccountIndex] = { ...existingAccount, registrationExpiresAt: expiresAt };
      const rateEvent: EmailVerificationRateEvent = { id: crypto.randomUUID(), pendingRegistrationId: workflow.id, emailHash, ipHash, createdAt: now.toISOString() };
      state.emailVerificationRateEvents = [rateEvent, ...rateEvents].slice(0, 5000);
      state.auditLogs = [{
        id: crypto.randomUUID(),
        action: "confirmacao_email_retentada",
        userId: existingAccount.id,
        userName: existingAccount.name,
        details: "A criação da conta foi retomada e um novo e-mail de confirmação foi solicitado.",
        origin: "public_registration",
        result: "awaiting_email_confirmation",
        createdAt: now.toISOString(),
        risk: "baixo"
      }, ...(state.auditLogs || [])];
      await writeCoreState(state);

      const confirmationUrl = officialAppUrl() + "/confirmar-email?token=" + encodeURIComponent(generated.token);
      const template = registrationConfirmationEmail({ name: workflow.name, confirmationUrl, planName: workflow.planName, isFree: isFreePlan(workflow.planId, workflow.planName) });
      const delivery = await sendEmail({
        to: workflow.email,
        ...template,
        userId: existingAccount.id,
        type: "registration_confirmation_retry",
        idempotencyKey: "registration-confirmation-retry:" + tokenRecord.id
      });
      return NextResponse.json({
        ok: true,
        userId: existingAccount.id,
        email,
        emailStatus: delivery.status,
        message: delivery.sent
          ? "Sua conta já estava criada. Enviamos uma nova confirmação para o seu e-mail."
          : "Sua conta já existe, mas o e-mail ainda não foi entregue. Use a opção de reenviar confirmação."
      }, { status: 202, headers: { "Cache-Control": "no-store" } });
    }
    const legacyWorkflowIndex = workflows.findIndex((item) =>
      pendingRegistrationState(item, now.getTime()) !== "expired" &&
      (item.email === email || item.username === username)
    );
    if (legacyWorkflowIndex >= 0) {
      const workflow = workflows[legacyWorkflowIndex];
      const validOwner = workflow.email === email &&
        workflow.username === username &&
        await verifyPassword(input.password, workflow.passwordHash);
      if (!validOwner) {
        return NextResponse.json({ error: "E-mail ou nome de usuário já cadastrado. Solicite o reenvio da confirmação." }, { status: 409 });
      }

      const accountId = crypto.randomUUID();
      const expiresAt = new Date(now.getTime() + PENDING_REGISTRATION_TTL_MS).toISOString();
      workflows[legacyWorkflowIndex] = { ...workflow, userId: accountId, expiresAt, updatedAt: now.toISOString() };
      state.accounts = [{
        id: accountId,
        role: "CLIENTE",
        username: workflow.username,
        email: workflow.email,
        name: workflow.name,
        phone: workflow.phone,
        passwordHash: workflow.passwordHash,
        planId: workflow.planId,
        planValue: workflow.planPriceInCents / 100,
        status: "pendente",
        permissions: workflow.permissions,
        registrationStatus: "awaiting_email_confirmation",
        registrationWorkflowId: workflow.id,
        registrationExpiresAt: expiresAt,
        selectedPlanName: workflow.planName,
        selectedPlanDurationDays: workflow.durationDays,
        acceptedTermsAt: workflow.acceptedTermsAt,
        acceptedPrivacyAt: workflow.acceptedPrivacyAt,
        acceptedMarketingAt: workflow.acceptedMarketingAt,
        createdAt: workflow.createdAt
      }, ...state.accounts];

      const generated = createEmailVerificationToken();
      const tokenRecord: EmailVerificationTokenRecord = {
        id: crypto.randomUUID(),
        pendingRegistrationId: workflow.id,
        tokenHash: generated.tokenHash,
        expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
        requestedAt: now.toISOString(),
        createdAt: now.toISOString()
      };
      const tokens = (Array.isArray(state.emailVerificationTokens) ? state.emailVerificationTokens : []).filter(isEmailVerificationToken);
      state.pendingRegistrations = workflows;
      state.emailVerificationTokens = [
        tokenRecord,
        ...tokens.map((item) =>
          item.pendingRegistrationId === workflow.id && !item.usedAt ? { ...item, usedAt: now.toISOString() } : item
        )
      ].slice(0, 5000);
      const rateEvent: EmailVerificationRateEvent = { id: crypto.randomUUID(), pendingRegistrationId: workflow.id, emailHash, ipHash, createdAt: now.toISOString() };
      state.emailVerificationRateEvents = [rateEvent, ...rateEvents].slice(0, 5000);
      state.auditLogs = [{
        id: crypto.randomUUID(),
        action: "conta_pendente_migrada",
        userId: accountId,
        userName: workflow.name,
        details: "Registro anterior convertido em conta real bloqueada; nova confirmação de e-mail solicitada.",
        origin: "public_registration",
        result: "awaiting_email_confirmation",
        createdAt: now.toISOString(),
        risk: "baixo"
      }, ...(state.auditLogs || [])];
      await writeCoreState(state);

      const confirmationUrl = officialAppUrl() + "/confirmar-email?token=" + encodeURIComponent(generated.token);
      const template = registrationConfirmationEmail({ name: workflow.name, confirmationUrl, planName: workflow.planName, isFree: isFreePlan(workflow.planId, workflow.planName) });
      const delivery = await sendEmail({
        to: workflow.email,
        ...template,
        userId: accountId,
        type: "registration_confirmation_migrated",
        idempotencyKey: "registration-confirmation-migrated:" + tokenRecord.id
      });
      return NextResponse.json({
        ok: true,
        userId: accountId,
        email,
        emailStatus: delivery.status,
        message: delivery.sent
          ? "Sua conta foi atualizada. Enviamos uma nova confirmação para o seu e-mail."
          : "Sua conta foi atualizada, mas o e-mail ainda não foi entregue. Use a opção de reenviar confirmação."
      }, { status: 202, headers: { "Cache-Control": "no-store" } });
    }
    const plan = state.plans.find((item) => item.id === input.planId && item.status === "ativo");
    if (!plan) return NextResponse.json({ error: "Plano indisponível." }, { status: 422 });

    const free = isFreePlan(plan.id, plan.name);
    if (free ? !isActiveFreePlan(plan) : !Number.isFinite(plan.value) || plan.value <= 0) {
      return NextResponse.json({ error: "O valor ou o status do plano selecionado é inválido." }, { status: 422 });
    }

    const accountId = crypto.randomUUID();
    const workflowId = crypto.randomUUID();
    const passwordHash = await hashPassword(input.password);
    const expiresAt = new Date(now.getTime() + PENDING_REGISTRATION_TTL_MS).toISOString();
    const registration: PendingRegistration = {
      id: workflowId,
      userId: accountId,
      name: input.name,
      username,
      email,
      phone: input.phone,
      passwordHash,
      acceptedTermsAt: now.toISOString(),
      acceptedPrivacyAt: now.toISOString(),
      acceptedMarketingAt: input.acceptMarketing ? now.toISOString() : undefined,
      planId: plan.id,
      planName: freePlanDisplayName(plan.name),
      planPriceInCents: Math.round(plan.value * 100),
      durationDays: plan.durationDays,
      permissions: plan.permissions,
      status: "awaiting_email_confirmation",
      paymentProvider: free ? "none" : "mercado_pago",
      isFree: free,
      requiresPayment: !free,
      expiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    state.accounts = [{
      id: accountId,
      role: "CLIENTE",
      username,
      email,
      name: input.name,
      phone: input.phone,
      passwordHash,
      planId: plan.id,
      planValue: registration.planPriceInCents / 100,
      status: "pendente",
      permissions: plan.permissions,
      registrationStatus: "awaiting_email_confirmation",
      registrationWorkflowId: workflowId,
      registrationExpiresAt: expiresAt,
      selectedPlanName: freePlanDisplayName(plan.name),
      selectedPlanDurationDays: plan.durationDays,
      acceptedTermsAt: registration.acceptedTermsAt,
      acceptedPrivacyAt: registration.acceptedPrivacyAt,
      acceptedMarketingAt: registration.acceptedMarketingAt,
      createdAt: now.toISOString()
    }, ...state.accounts];

    const generated = createEmailVerificationToken();
    const tokenRecord: EmailVerificationTokenRecord = {
      id: crypto.randomUUID(),
      pendingRegistrationId: workflowId,
      tokenHash: generated.tokenHash,
      expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
      requestedAt: now.toISOString(),
      createdAt: now.toISOString()
    };
    const tokens = (Array.isArray(state.emailVerificationTokens) ? state.emailVerificationTokens : []).filter(isEmailVerificationToken);
    state.pendingRegistrations = [
      registration,
      ...workflows.map((item) => pendingRegistrationState(item, now.getTime()) === "expired" && item.status !== "expired" ? { ...item, status: "expired", updatedAt: now.toISOString() } : item)
    ].slice(0, 5000);
    state.emailVerificationTokens = [tokenRecord, ...tokens].slice(0, 5000);
    const rateEvent: EmailVerificationRateEvent = { id: crypto.randomUUID(), pendingRegistrationId: workflowId, emailHash, ipHash, createdAt: now.toISOString() };
    state.emailVerificationRateEvents = [rateEvent, ...rateEvents].slice(0, 5000);
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "conta_criada_aguardando_email",
      userId: accountId,
      userName: input.name,
      details: "Conta criada sem acesso para o plano " + plan.name + "; aguardando confirmação de e-mail.",
      origin: "public_registration",
      result: "awaiting_email_confirmation",
      createdAt: now.toISOString(),
      risk: "baixo"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);

    const confirmationUrl = officialAppUrl() + "/confirmar-email?token=" + encodeURIComponent(generated.token);
    const template = registrationConfirmationEmail({ name: input.name, confirmationUrl, planName: freePlanDisplayName(plan.name), isFree: free });
    const delivery = await sendEmail({
      to: email,
      ...template,
      userId: accountId,
      type: "registration_confirmation",
      idempotencyKey: "registration-confirmation:" + tokenRecord.id
    });
    return NextResponse.json({
      ok: true,
      userId: accountId,
      email,
      emailStatus: delivery.status,
      message: delivery.sent
        ? "Conta criada. Enviamos a confirmação para o seu e-mail."
        : "Conta criada e bloqueada, mas o e-mail ainda não foi entregue. Use a opção de reenviar confirmação."
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestErrorResponse(error);
  }
}
