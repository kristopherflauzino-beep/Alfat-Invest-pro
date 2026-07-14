import { createHash, randomUUID } from "node:crypto";
import type { OnlinePayment, Prisma } from "@prisma/client";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { readCoreState, writeCoreState, type CoreState } from "@/lib/server/core-state";
import { revokeUserSessions } from "@/lib/auth/session";
import { MercadoPagoProvider } from "./mercado-pago-provider";
import type { PaymentMethod, PaymentProvider, PaymentResult, PaymentStatus, ProviderEvent, SubscriptionResult } from "./payment-provider";
import { PaymentConfigurationError, PaymentProviderError } from "./payment-provider";
import { calculateCheckoutAmounts, calculateExpiration } from "./payment-calculations";
export { calculateCheckoutAmounts, calculateExpiration } from "./payment-calculations";

export type CheckoutRequest = { planId: string; paymentMethod: PaymentMethod; autoRenew?: boolean; renewalMode?: "today" | "extend"; idempotencyKey: string; appUrl: string };
type Settings = { provider: "mercado_pago"; pixDiscountPercent: number; pixExpirationMinutes: number; cardInstallments: number; annualInstallmentsEnabled: boolean; gracePeriodDays: number; renewalMode: "today" | "extend"; testMode: boolean };
const defaultSettings: Settings = { provider: "mercado_pago", pixDiscountPercent: 0, pixExpirationMinutes: 30, cardInstallments: 12, annualInstallmentsEnabled: true, gracePeriodDays: 3, renewalMode: "extend", testMode: true };

function settingsFrom(state: CoreState): Settings {
  const value = state.paymentSettings || {};
  return {
    ...defaultSettings,
    ...(value as Partial<Settings>),
    pixDiscountPercent: Math.min(30, Math.max(0, Number((value as any).pixDiscountPercent ?? 0))),
    pixExpirationMinutes: Math.min(1440, Math.max(10, Math.round(Number((value as any).pixExpirationMinutes ?? 30)))),
    cardInstallments: Math.min(12, Math.max(1, Math.round(Number((value as any).cardInstallments ?? 12)))),
    gracePeriodDays: Math.min(30, Math.max(0, Math.round(Number((value as any).gracePeriodDays ?? 3))))
  };
}
const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const addDays = calculateExpiration;
function safePayload(result: PaymentResult | SubscriptionResult) {
  const raw = result.raw && typeof result.raw === "object" ? result.raw as Record<string, any> : {};
  return { status: raw.status, statusDetail: raw.status_detail, externalReference: raw.external_reference, paymentType: raw.payment_type_id, transactionAmount: raw.transaction_amount, approvedAt: raw.date_approved, subscriptionId: raw.preapproval_id, orderId: raw.order?.id } as Prisma.InputJsonValue;
}
function externalReference(result: PaymentResult | SubscriptionResult) {
  const raw = result.raw && typeof result.raw === "object" ? result.raw as Record<string, any> : {};
  return String(raw.external_reference || raw.metadata?.payment_id || "");
}
function subscriptionReference(result: PaymentResult | SubscriptionResult) {
  const raw = result.raw && typeof result.raw === "object" ? result.raw as Record<string, any> : {};
  return String(raw.preapproval_id || raw.subscription_id || ("providerSubscriptionId" in result ? result.providerSubscriptionId : "") || "");
}
export function paymentConfiguration() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
  const providerConfigured = Boolean(accessToken);
  const webhookConfigured = Boolean(process.env.MERCADO_PAGO_WEBHOOK_SECRET);
  const environment = process.env.PAYMENT_ENVIRONMENT === "production" ? "production" : "sandbox";
  const credentialModeValid = providerConfigured && (environment === "production" ? !accessToken.startsWith("TEST-") : accessToken.startsWith("TEST-"));
  return { configured: hasDatabaseUrl && providerConfigured && webhookConfigured && credentialModeValid, databaseConfigured: hasDatabaseUrl, providerConfigured, webhookConfigured, credentialModeValid, provider: "mercado_pago", environment } as const;
}
function provider(): PaymentProvider { return new MercadoPagoProvider(); }
function requireStorage() { if (!hasDatabaseUrl) throw new PaymentConfigurationError("Pagamentos online exigem PostgreSQL. Configure DATABASE_URL na Vercel."); }
function publicPayment(payment: OnlinePayment) {
  return { id: payment.id, planId: payment.planId, method: payment.method, originalAmountInCents: payment.originalAmountInCents, discountInCents: payment.discountInCents, amountInCents: payment.amountInCents, currency: payment.currency, status: payment.status, pixQrCodeBase64: payment.pixQrCodeBase64, pixCopyPaste: payment.pixCopyPaste, pixTicketUrl: payment.pixTicketUrl, pixExpiresAt: payment.pixExpiresAt, cardBrand: payment.cardBrand, cardLastFour: payment.cardLastFour, installments: payment.installments, paidAt: payment.paidAt, expiresAt: payment.expiresAt, createdAt: payment.createdAt, updatedAt: payment.updatedAt, checkoutUrl: undefined as string | undefined };
}

export async function createCheckout(userId: string, input: CheckoutRequest) {
  requireStorage();
  const config = paymentConfiguration();
  if (!config.configured) throw new PaymentConfigurationError(config.credentialModeValid ? "Mercado Pago nao configurado. Defina banco, token e segredo do webhook na Vercel." : "Credencial do Mercado Pago incompativel com PAYMENT_ENVIRONMENT. Use TEST- no sandbox e credencial oficial somente em production.");
  const state = await readCoreState();
  const account = state.accounts.find((item) => item.id === userId);
  if (!account || account.status === "pendente") throw new PaymentProviderError("Conta sem permissao para contratar plano.", 403);
  const plan = state.plans.find((item) => item.id === input.planId && item.status === "ativo");
  if (!plan) throw new PaymentProviderError("Plano indisponivel.", 422);
  const settings = settingsFrom(state);
  const { originalAmountInCents: original, discountInCents: discount, amountInCents: amount } = calculateCheckoutAmounts(Number(plan.value), input.paymentMethod, settings.pixDiscountPercent);
  const existing = await prisma.onlinePayment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    if (existing.userId !== userId) throw new PaymentProviderError("Chave de idempotencia invalida.", 409);
    return publicPayment(existing);
  }
  const paymentId = randomUUID();
  const autoRenew = input.paymentMethod === "credit_card" && Boolean(input.autoRenew) && plan.id !== "semanal";
  const renewalMode = input.renewalMode || settings.renewalMode;
  await prisma.onlinePayment.create({ data: { id: paymentId, userId, planId: plan.id, provider: "mercado_pago", method: input.paymentMethod, originalAmountInCents: original, discountInCents: discount, amountInCents: amount, currency: "BRL", status: "pending", installments: plan.id === "anual" && settings.annualInstallmentsEnabled ? settings.cardInstallments : 1, idempotencyKey: input.idempotencyKey, renewalMode } });
  const baseUrl = input.appUrl.replace(/\/$/, "");
  const common = { internalPaymentId: paymentId, idempotencyKey: input.idempotencyKey, amountInCents: amount, currency: "BRL" as const, description: `Plano ${plan.name} - AlfaTec Invest Pro`, payer: { id: account.id, name: account.name, email: account.email }, expiresInMinutes: settings.pixExpirationMinutes, returnUrl: `${baseUrl}/?menu=plano`, webhookUrl: `${baseUrl}/api/webhooks/payments/mercado-pago`, installments: plan.id === "anual" && settings.annualInstallmentsEnabled ? settings.cardInstallments : 1 };
  try {
    const gateway = provider();
    let subscriptionResult: SubscriptionResult | null = null;
    let result: PaymentResult | SubscriptionResult;
    if (input.paymentMethod === "pix") result = await gateway.createPixPayment(common);
    else if (autoRenew) { subscriptionResult = await gateway.createSubscription({ ...common, planId: plan.id, frequency: plan.id === "anual" ? 12 : 1, frequencyType: "months" }); result = subscriptionResult; }
    else result = await gateway.createCardCheckout(common);
    let subscriptionId: string | undefined;
    if (subscriptionResult) {
      const subscription = await prisma.onlineSubscription.upsert({ where: { userId }, create: { id: randomUUID(), userId, planId: plan.id, provider: "mercado_pago", providerSubscriptionId: subscriptionResult.providerSubscriptionId, paymentMethod: "credit_card", planName: plan.name, planPriceInCents: amount, durationDays: plan.durationDays, status: "pending", nextBillingAt: subscriptionResult.nextBillingAt, autoRenew: true }, update: { planId: plan.id, providerSubscriptionId: subscriptionResult.providerSubscriptionId, paymentMethod: "credit_card", planName: plan.name, planPriceInCents: amount, durationDays: plan.durationDays, status: "pending", nextBillingAt: subscriptionResult.nextBillingAt, autoRenew: true, cancelledAt: null } });
      subscriptionId = subscription.id;
    }
    const updated = await prisma.onlinePayment.update({ where: { id: paymentId }, data: { subscriptionId, providerPaymentId: result.providerPaymentId, providerCheckoutId: result.providerCheckoutId, status: result.status, pixQrCode: result.pixQrCode, pixQrCodeBase64: result.pixQrCodeBase64, pixCopyPaste: result.pixCopyPaste, pixTicketUrl: result.pixTicketUrl, pixExpiresAt: result.pixExpiresAt, cardBrand: result.cardBrand, cardLastFour: result.cardLastFour, providerPayload: safePayload(result) } });
    await prisma.paymentAuditLog.create({ data: { userId, actorId: userId, action: "online_checkout_created", entityId: paymentId, details: { planId: plan.id, method: input.paymentMethod, amountInCents: amount, autoRenew }, risk: "low" } });
    if (result.status === "paid") await confirmPaidPayment(paymentId, result);
    return { ...publicPayment(updated), checkoutUrl: result.checkoutUrl };
  } catch (error) {
    await prisma.onlinePayment.update({ where: { id: paymentId }, data: { status: "failed" } }).catch(() => undefined);
    throw error;
  }
}

export async function confirmPaidPayment(paymentId: string, result: PaymentResult) {
  requireStorage();
  return prisma.$transaction(async (tx) => {
    const payment = await tx.onlinePayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new PaymentProviderError("Pagamento nao encontrado.", 404);
    if (payment.status === "paid" && payment.paidAt && payment.expiresAt) return payment;
    const stateRow = await tx.persistentAppState.findUnique({ where: { key: "default" } });
    if (!stateRow) throw new PaymentConfigurationError("Estado persistente nao encontrado no PostgreSQL.");
    const state = stateRow.value as unknown as CoreState;
    const accountIndex = state.accounts.findIndex((item) => item.id === payment.userId);
    const plan = state.plans.find((item) => item.id === payment.planId);
    if (accountIndex < 0 || !plan) throw new PaymentProviderError("Conta ou plano nao encontrado.", 404);
    const account = state.accounts[accountIndex];
    const now = result.paidAt || new Date();
    const due = account.dueDate ? new Date(`${account.dueDate}T12:00:00.000Z`) : null;
    const todayStart = new Date(now); todayStart.setUTCHours(0, 0, 0, 0);
    const base = payment.renewalMode === "extend" && due && due.getTime() >= todayStart.getTime() ? due : new Date(now);
    const expiresAt = addDays(base, Number(plan.durationDays));
    const subscription = await tx.onlineSubscription.upsert({ where: { userId: payment.userId }, create: { id: payment.subscriptionId || randomUUID(), userId: payment.userId, planId: plan.id, provider: payment.provider, paymentMethod: payment.method, planName: plan.name, planPriceInCents: payment.amountInCents, durationDays: plan.durationDays, status: "active", startedAt: now, expiresAt, autoRenew: Boolean(payment.subscriptionId), cardBrand: result.cardBrand, cardLastFour: result.cardLastFour }, update: { planId: plan.id, paymentMethod: payment.method, planName: plan.name, planPriceInCents: payment.amountInCents, durationDays: plan.durationDays, status: "active", startedAt: now, expiresAt, graceUntil: null, cardBrand: result.cardBrand || undefined, cardLastFour: result.cardLastFour || undefined } });
    state.accounts[accountIndex] = { ...account, planId: plan.id, planValue: payment.amountInCents / 100, planStartedAt: isoDate(now), dueDate: isoDate(expiresAt), status: "ativo", permissions: plan.permissions };
    state.payments = [{ id: payment.id, clientId: payment.userId, planId: plan.id, value: payment.amountInCents / 100, paymentDate: isoDate(now), dueDate: isoDate(expiresAt), status: "pago", method: payment.method, provider: payment.provider }, ...(state.payments || []).filter((item: any) => item?.id !== payment.id)];
    state.auditLogs = [{ id: randomUUID(), action: "pagamento_online_confirmado", userId: payment.userId, userName: account.name, details: `Pagamento ${payment.id} confirmado pelo gateway.`, createdAt: new Date().toISOString(), risk: "medio" }, ...(state.auditLogs || [])];
    await tx.persistentAppState.update({ where: { key: "default" }, data: { value: state as unknown as Prisma.InputJsonValue } });
    await tx.paymentAuditLog.create({ data: { userId: payment.userId, action: "payment_confirmed", entityId: payment.id, details: { planId: plan.id, amountInCents: payment.amountInCents, expiresAt: expiresAt.toISOString() }, risk: "medium" } });
    return tx.onlinePayment.update({ where: { id: payment.id }, data: { status: "paid", paidAt: now, expiresAt, subscriptionId: subscription.id, providerPaymentId: result.providerPaymentId || payment.providerPaymentId, cardBrand: result.cardBrand || payment.cardBrand, cardLastFour: result.cardLastFour || payment.cardLastFour, providerPayload: safePayload(result) } });
  }, { isolationLevel: "Serializable" });
}

async function syncResult(payment: OnlinePayment, result: PaymentResult) {
  if (result.status === "paid") return confirmPaidPayment(payment.id, result);
  const update = await prisma.onlinePayment.update({ where: { id: payment.id }, data: { status: result.status, providerPaymentId: result.providerPaymentId || payment.providerPaymentId, cardBrand: result.cardBrand || payment.cardBrand, cardLastFour: result.cardLastFour || payment.cardLastFour, providerPayload: safePayload(result) } });
  if (payment.subscriptionId && ["failed", "expired"].includes(result.status)) {
    const state = await readCoreState(); const settings = settingsFrom(state);
    await prisma.onlineSubscription.updateMany({ where: { id: payment.subscriptionId }, data: { status: "past_due", graceUntil: addDays(new Date(), settings.gracePeriodDays) } });
  }
  if (["chargeback", "refunded"].includes(result.status)) {
    await prisma.paymentAuditLog.create({ data: { userId: payment.userId, action: result.status === "chargeback" ? "payment_chargeback" : "payment_refunded_by_provider", entityId: payment.id, details: { providerPaymentId: result.providerPaymentId }, risk: "high" } });
  }
  if (result.status === "chargeback") {
    await prisma.onlineSubscription.updateMany({ where: { userId: payment.userId }, data: { status: "blocked", autoRenew: false } });
    const state = await readCoreState(); const index = state.accounts.findIndex((item) => item.id === payment.userId);
    if (index >= 0) { const account = state.accounts[index]; state.accounts[index] = { ...account, status: "bloqueado" }; state.auditLogs = [{ id: randomUUID(), action: "chargeback_detectado", userId: payment.userId, userName: account.name, details: `Chargeback confirmado pelo gateway no pagamento ${payment.id}.`, createdAt: new Date().toISOString(), risk: "alto" }, ...(state.auditLogs || [])]; await writeCoreState(state); await revokeUserSessions(payment.userId); }
  }
  return update;
}

export async function refreshPayment(paymentId: string, userId?: string) {
  requireStorage();
  const payment = await prisma.onlinePayment.findFirst({ where: { id: paymentId, ...(userId ? { userId } : {}) } });
  if (!payment) throw new PaymentProviderError("Pagamento nao encontrado.", 404);
  if (payment.status === "paid" || payment.status === "refunded") return publicPayment(payment);
  const gateway = provider();
  let result: PaymentResult | null = null;
  if (payment.providerPaymentId) result = await gateway.getPaymentStatus(payment.providerPaymentId, payment.method === "pix" ? "order" : "payment");
  if (!result && payment.providerCheckoutId) result = await gateway.findPaymentByExternalReference(payment.id);
  if (!result) return publicPayment(payment);
  return publicPayment(await syncResult(payment, result));
}

export async function processWebhook(request: Request, body: unknown) {
  requireStorage(); const gateway = provider(); const event = await gateway.parseWebhook(request, body);
  const payloadHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const inserted = await prisma.paymentWebhookEvent.create({ data: { provider: gateway.name, providerEventId: event.eventId, eventType: event.eventType, resourceId: event.resourceId, payloadHash } }).catch((error: any) => error?.code === "P2002" ? null : Promise.reject(error));
  if (!inserted) return { duplicate: true };
  try {
    const result = await gateway.fetchEventResource(event);
    if (event.resourceKind === "subscription") {
      const subscription = await prisma.onlineSubscription.findFirst({ where: { providerSubscriptionId: subscriptionReference(result) || event.resourceId } });
      if (subscription) await prisma.onlineSubscription.update({ where: { id: subscription.id }, data: { status: result.status === "paid" ? "active" : result.status === "cancelled" ? "cancelled" : result.status, nextBillingAt: "nextBillingAt" in result ? result.nextBillingAt : undefined, cancelledAt: result.status === "cancelled" ? new Date() : undefined } });
    } else {
      let payment = await prisma.onlinePayment.findFirst({ where: { OR: [{ id: externalReference(result) }, { providerPaymentId: result.providerPaymentId || "__none__" }, { providerCheckoutId: externalReference(result) }] } });
      if (!payment) {
        const subscriptionId = subscriptionReference(result);
        const subscription = subscriptionId ? await prisma.onlineSubscription.findFirst({ where: { providerSubscriptionId: subscriptionId } }) : null;
        if (subscription && result.providerPaymentId) payment = await prisma.onlinePayment.create({ data: { id: randomUUID(), userId: subscription.userId, planId: subscription.planId, subscriptionId: subscription.id, provider: gateway.name, providerPaymentId: result.providerPaymentId, method: "credit_card", originalAmountInCents: subscription.planPriceInCents, amountInCents: subscription.planPriceInCents, status: "pending", idempotencyKey: `webhook:${gateway.name}:${result.providerPaymentId}`, renewalMode: "extend" } });
      }
      if (payment) await syncResult(payment, result);
    }
    await prisma.paymentWebhookEvent.update({ where: { id: inserted.id }, data: { status: "processed", processedAt: new Date() } });
    return { processed: true };
  } catch (error) {
    await prisma.paymentWebhookEvent.update({ where: { id: inserted.id }, data: { status: "failed" } }).catch(() => undefined);
    throw error;
  }
}

export async function cancelPayment(paymentId: string, userId: string) {
  requireStorage(); const payment = await prisma.onlinePayment.findFirst({ where: { id: paymentId, userId } });
  if (!payment) throw new PaymentProviderError("Pagamento nao encontrado.", 404);
  if (!['pending','processing','failed'].includes(payment.status)) throw new PaymentProviderError("Este pagamento nao pode ser cancelado.", 409);
  if (payment.providerPaymentId) await provider().cancelPayment(payment.providerPaymentId, payment.method === "pix" ? "order" : "payment");
  return publicPayment(await prisma.onlinePayment.update({ where: { id: payment.id }, data: { status: "cancelled" } }));
}

export async function cancelSubscription(subscriptionId: string, userId: string) {
  requireStorage(); const subscription = await prisma.onlineSubscription.findFirst({ where: { id: subscriptionId, userId } });
  if (!subscription) throw new PaymentProviderError("Assinatura nao encontrada.", 404);
  if (subscription.providerSubscriptionId) await provider().cancelSubscription(subscription.providerSubscriptionId);
  return prisma.onlineSubscription.update({ where: { id: subscription.id }, data: { status: "cancelled", autoRenew: false, cancelledAt: new Date() } });
}
export async function reactivateSubscription(subscriptionId: string, userId: string) {
  requireStorage(); const subscription = await prisma.onlineSubscription.findFirst({ where: { id: subscriptionId, userId } });
  if (!subscription?.providerSubscriptionId) throw new PaymentProviderError("Assinatura recorrente nao encontrada.", 404);
  await provider().reactivateSubscription(subscription.providerSubscriptionId);
  return prisma.onlineSubscription.update({ where: { id: subscription.id }, data: { status: "pending", autoRenew: true, cancelledAt: null } });
}

export async function refundPayment(paymentId: string, actorId: string, amountInCents?: number) {
  requireStorage(); const payment = await prisma.onlinePayment.findUnique({ where: { id: paymentId } });
  if (!payment?.providerPaymentId || payment.status !== "paid") throw new PaymentProviderError("Pagamento aprovado nao encontrado.", 404);
  const amount = amountInCents ?? payment.amountInCents;
  if (amount <= 0 || amount > payment.amountInCents - payment.refundedAmountInCents) throw new PaymentProviderError("Valor de estorno invalido.", 422);
  await provider().refundPayment(payment.providerPaymentId, amount);
  const total = payment.refundedAmountInCents + amount;
  const updated = await prisma.onlinePayment.update({ where: { id: payment.id }, data: { refundedAmountInCents: total, status: total >= payment.amountInCents ? "refunded" : payment.status } });
  await prisma.paymentAuditLog.create({ data: { userId: payment.userId, actorId, action: "payment_refunded", entityId: payment.id, details: { amountInCents: amount }, risk: "high" } });
  return publicPayment(updated);
}

export async function accountBilling(userId: string) {
  const state = await readCoreState(); const billingSettings = settingsFrom(state);
  const config = { ...paymentConfiguration(), pixDiscountPercent: billingSettings.pixDiscountPercent, cardInstallments: billingSettings.cardInstallments, annualInstallmentsEnabled: billingSettings.annualInstallmentsEnabled };
  if (!hasDatabaseUrl) return { config, payments: [], subscription: null };
  const [payments, subscription] = await Promise.all([prisma.onlinePayment.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }), prisma.onlineSubscription.findUnique({ where: { userId } })]);
  const safeSubscription = subscription ? { id: subscription.id, planId: subscription.planId, planName: subscription.planName, planPriceInCents: subscription.planPriceInCents, paymentMethod: subscription.paymentMethod, status: subscription.status, startedAt: subscription.startedAt, expiresAt: subscription.expiresAt, nextBillingAt: subscription.nextBillingAt, autoRenew: subscription.autoRenew, cardBrand: subscription.cardBrand, cardLastFour: subscription.cardLastFour } : null;
  return { config, payments: payments.map(publicPayment), subscription: safeSubscription };
}
export async function adminBilling() {
  requireStorage(); const [payments, subscriptions, audit] = await Promise.all([prisma.onlinePayment.findMany({ orderBy: { createdAt: "desc" }, take: 200 }), prisma.onlineSubscription.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }), prisma.paymentAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 })]);
  return { config: paymentConfiguration(), payments: payments.map((payment) => ({ id: payment.id, userId: payment.userId, planId: payment.planId, provider: payment.provider, method: payment.method, amountInCents: payment.amountInCents, status: payment.status, paidAt: payment.paidAt, expiresAt: payment.expiresAt, createdAt: payment.createdAt, updatedAt: payment.updatedAt })), subscriptions: subscriptions.map((subscription) => ({ id: subscription.id, userId: subscription.userId, planId: subscription.planId, planName: subscription.planName, planPriceInCents: subscription.planPriceInCents, paymentMethod: subscription.paymentMethod, status: subscription.status, expiresAt: subscription.expiresAt, nextBillingAt: subscription.nextBillingAt, autoRenew: subscription.autoRenew, createdAt: subscription.createdAt, updatedAt: subscription.updatedAt })), audit };
}

export function paymentErrorStatus(error: unknown) {
  if (error instanceof PaymentConfigurationError) return { status: 503, message: error.message };
  if (error instanceof PaymentProviderError) return { status: error.status, message: error.message };
  return { status: 500, message: "Nao foi possivel concluir a operacao de pagamento." };
}

export async function reconcilePendingPayments(limit = 30) {
  requireStorage();
  const candidates = await prisma.onlinePayment.findMany({ where: { status: { in: ["pending", "processing"] }, createdAt: { lt: new Date(Date.now() - 2 * 60_000) } }, orderBy: { createdAt: "asc" }, take: Math.min(100, Math.max(1, limit)) });
  const results = [] as Array<{ id: string; status: string; error?: string }>;
  for (const payment of candidates) {
    try { const updated = await refreshPayment(payment.id); results.push({ id: payment.id, status: updated.status }); }
    catch (error) { results.push({ id: payment.id, status: payment.status, error: error instanceof Error ? error.message : "Falha na conciliacao" }); }
  }
  const overdue = await prisma.onlineSubscription.findMany({ where: { status: "past_due", graceUntil: { lt: new Date() } } });
  if (overdue.length) {
    const state = await readCoreState();
    for (const subscription of overdue) { await prisma.onlineSubscription.update({ where: { id: subscription.id }, data: { status: "expired", autoRenew: false } }); const index = state.accounts.findIndex((item) => item.id === subscription.userId); if (index >= 0) state.accounts[index] = { ...state.accounts[index], status: "vencido" }; await revokeUserSessions(subscription.userId); }
    state.auditLogs = [{ id: randomUUID(), action: "tolerancia_pagamento_encerrada", userId: "sistema", userName: "Sistema", details: `${overdue.length} assinatura(s) passaram para vencido apos o periodo de tolerancia.`, createdAt: new Date().toISOString(), risk: "medio" }, ...(state.auditLogs || [])];
    await writeCoreState(state);
  }
  return { checked: results.length, expiredSubscriptions: overdue.length, results };
}
