import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentInput, PaymentProvider, PaymentResult, ProviderEvent, SubscriptionInput, SubscriptionResult } from "./payment-provider";
import { PaymentConfigurationError, PaymentProviderError } from "./payment-provider";

const API = "https://api.mercadopago.com";
const money = (cents: number) => Number((cents / 100).toFixed(2));
const date = (value: unknown) => typeof value === "string" && value ? new Date(value) : undefined;

function mapStatus(value: unknown): PaymentResult["status"] {
  const status = String(value || "").toLowerCase();
  if (["approved", "paid", "authorized"].includes(status)) return "paid";
  if (["processing", "in_process", "in_mediation"].includes(status)) return "processing";
  if (["expired"].includes(status)) return "expired";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (["refunded"].includes(status)) return "refunded";
  if (["charged_back", "chargeback"].includes(status)) return "chargeback";
  if (["rejected", "failed"].includes(status)) return "failed";
  return "pending";
}

function safeEqualHex(received: string, expected: string) {
  try { const a = Buffer.from(received, "hex"); const b = Buffer.from(expected, "hex"); return a.length === b.length && timingSafeEqual(a, b); } catch { return false; }
}

export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "mercado_pago";
  private token = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
  private webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || "";

  constructor() {
    if (!this.token) throw new PaymentConfigurationError("Mercado Pago nao configurado. Defina MERCADO_PAGO_ACCESS_TOKEN na Vercel.");
  }

  private async request(path: string, init: RequestInit = {}, idempotencyKey?: string) {
    const response = await fetch(`${API}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
        ...(init.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new PaymentProviderError("O provedor recusou a operacao de pagamento.", response.status >= 500 ? 502 : 422, data);
    return data as Record<string, any>;
  }

  async createPixPayment(input: PaymentInput): Promise<PaymentResult> {
    const raw = await this.request("/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        type: "online",
        processing_mode: "automatic",
        external_reference: input.internalPaymentId,
        total_amount: money(input.amountInCents).toFixed(2),
        payer: { email: input.payer.email },
        transactions: { payments: [{ amount: money(input.amountInCents).toFixed(2), payment_method: { id: "pix", type: "bank_transfer" }, expiration_time: `PT${input.expiresInMinutes}M` }] }
      })
    }, input.idempotencyKey);
    const payment = raw.transactions?.payments?.[0] ?? raw;
    const method = payment.payment_method ?? {};
    const point = payment.point_of_interaction?.transaction_data ?? (typeof method.qr_code === "object" ? method.qr_code : {});
    const copyPaste = typeof method.qr_code === "string" ? method.qr_code : point.qr_code || payment.qr_code;
    return {
      providerPaymentId: String(raw.id || payment.id || ""),
      status: mapStatus(raw.status || payment.status),
      pixQrCode: method.qr_code_base64 || point.qr_code_base64 || point.base64,
      pixQrCodeBase64: method.qr_code_base64 || point.qr_code_base64 || point.base64,
      pixCopyPaste: copyPaste,
      pixTicketUrl: method.ticket_url || point.ticket_url || payment.ticket_url,
      pixExpiresAt: date(raw.expiration_date || payment.expiration_date) ?? new Date(Date.now() + input.expiresInMinutes * 60_000),
      raw
    };
  }

  async createCardCheckout(input: PaymentInput): Promise<PaymentResult> {
    const callbackUrl = (status: "success" | "pending" | "failure") => {
      const url = new URL(input.returnUrl);
      url.searchParams.set("payment", status);
      return url.toString();
    };
    const raw = await this.request("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
        items: [{ id: input.internalPaymentId, title: input.description, quantity: 1, currency_id: "BRL", unit_price: money(input.amountInCents) }],
        payer: { name: input.payer.name, email: input.payer.email },
        external_reference: input.internalPaymentId,
        back_urls: { success: callbackUrl("success"), pending: callbackUrl("pending"), failure: callbackUrl("failure") },
        auto_return: "approved",
        notification_url: input.webhookUrl,
        payment_methods: { installments: input.installments },
        statement_descriptor: "ALFATEC INVEST"
      })
    }, input.idempotencyKey);
    return { providerCheckoutId: String(raw.id), checkoutUrl: raw.init_point, status: "pending", raw };
  }

  async createSubscription(input: SubscriptionInput): Promise<SubscriptionResult> {
    const raw = await this.request("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        reason: input.description,
        external_reference: input.internalPaymentId,
        payer_email: input.payer.email,
        back_url: input.returnUrl,
        auto_recurring: { frequency: input.frequency, frequency_type: input.frequencyType, transaction_amount: money(input.amountInCents), currency_id: "BRL" },
        status: "pending"
      })
    }, input.idempotencyKey);
    return { providerSubscriptionId: String(raw.id), providerCheckoutId: String(raw.id), checkoutUrl: raw.init_point, status: mapStatus(raw.status), nextBillingAt: date(raw.next_payment_date), raw };
  }

  async cancelPayment(id: string, kind: ProviderEvent["resourceKind"] = "payment") {
    await this.request(kind === "order" ? `/v1/orders/${encodeURIComponent(id)}` : `/v1/payments/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) });
  }
  async cancelSubscription(id: string) { await this.request(`/preapproval/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) }); }
  async reactivateSubscription(id: string) { await this.request(`/preapproval/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ status: "authorized" }) }); }

  async getPaymentStatus(id: string, kind: ProviderEvent["resourceKind"] = "payment"): Promise<PaymentResult> {
    const raw = await this.request(kind === "order" ? `/v1/orders/${encodeURIComponent(id)}` : `/v1/payments/${encodeURIComponent(id)}`);
    const payment = kind === "order" ? raw.transactions?.payments?.[0] ?? raw : raw;
    const point = payment.point_of_interaction?.transaction_data ?? payment.payment_method?.qr_code ?? {};
    return {
      providerPaymentId: String(kind === "order" ? raw.id : payment.id), status: mapStatus(raw.status || payment.status),
      pixQrCodeBase64: point.qr_code_base64, pixCopyPaste: point.qr_code, pixTicketUrl: point.ticket_url,
      pixExpiresAt: date(raw.expiration_date || payment.date_of_expiration),
      cardBrand: payment.payment_method_id || payment.card?.issuer?.name,
      cardLastFour: payment.card?.last_four_digits,
      paidAt: date(payment.date_approved), raw
    };
  }

  async findPaymentByExternalReference(reference: string) {
    const raw = await this.request(`/v1/payments/search?sort=date_created&criteria=desc&external_reference=${encodeURIComponent(reference)}&limit=1`);
    const payment = raw.results?.[0];
    return payment?.id ? this.getPaymentStatus(String(payment.id), "payment") : null;
  }

  async getSubscriptionStatus(id: string): Promise<SubscriptionResult> {
    const raw = await this.request(`/preapproval/${encodeURIComponent(id)}`);
    return { providerSubscriptionId: String(raw.id), status: mapStatus(raw.status), nextBillingAt: date(raw.next_payment_date), raw };
  }

  async refundPayment(id: string, amountInCents?: number): Promise<PaymentResult> {
    const raw = await this.request(`/v1/payments/${encodeURIComponent(id)}/refunds`, { method: "POST", body: JSON.stringify(amountInCents ? { amount: money(amountInCents) } : {}) }, crypto.randomUUID());
    return { providerPaymentId: String(id), status: "refunded", raw };
  }

  async parseWebhook(request: Request, body: unknown): Promise<ProviderEvent> {
    if (!this.webhookSecret) throw new PaymentConfigurationError("Webhook nao configurado. Defina MERCADO_PAGO_WEBHOOK_SECRET.");
    const url = new URL(request.url);
    const bodyRecord = body && typeof body === "object" ? body as Record<string, any> : {};
    const dataId = String(url.searchParams.get("data.id") || bodyRecord.data?.id || bodyRecord.id || "").toLowerCase();
    const signature = request.headers.get("x-signature") || "";
    const requestId = request.headers.get("x-request-id") || "";
    const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=")).filter((item) => item.length === 2));
    const ts = parts.ts || ""; const received = parts.v1 || "";
    if (!dataId || !requestId || !ts || !received) throw new PaymentProviderError("Assinatura do webhook ausente.", 401);
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac("sha256", this.webhookSecret).update(manifest).digest("hex");
    if (!safeEqualHex(received, expected)) throw new PaymentProviderError("Assinatura do webhook invalida.", 401);
    const type = String(bodyRecord.type || bodyRecord.topic || url.searchParams.get("type") || "unknown");
    const kind: ProviderEvent["resourceKind"] = type === "order" || type === "orders" ? "order" : type.includes("preapproval") && !type.includes("authorized_payment") ? "subscription" : type.includes("authorized_payment") ? "subscription_payment" : type === "payment" ? "payment" : "unknown";
    return { eventId: String(bodyRecord.id || `${type}:${dataId}:${ts}`), eventType: type, resourceId: dataId, resourceKind: kind };
  }

  async fetchEventResource(event: ProviderEvent) {
    if (!event.resourceId) throw new PaymentProviderError("Webhook sem identificador de recurso.", 422);
    if (event.resourceKind === "subscription") return this.getSubscriptionStatus(event.resourceId);
    return this.getPaymentStatus(event.resourceId, event.resourceKind === "order" ? "order" : "payment");
  }
}
