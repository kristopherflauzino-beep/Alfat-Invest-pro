export type PaymentMethod = "pix" | "credit_card";
export type PaymentStatus = "pending" | "processing" | "paid" | "failed" | "expired" | "cancelled" | "refunded" | "chargeback";

export type PaymentInput = {
  internalPaymentId: string;
  idempotencyKey: string;
  amountInCents: number;
  currency: "BRL";
  description: string;
  payer: { id: string; name: string; email: string };
  expiresInMinutes: number;
  returnUrl: string;
  webhookUrl: string;
  installments: number;
};

export type SubscriptionInput = PaymentInput & {
  planId: string;
  frequency: number;
  frequencyType: "days" | "months";
};

export type PaymentResult = {
  providerPaymentId?: string;
  providerCheckoutId?: string;
  checkoutUrl?: string;
  status: PaymentStatus;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  pixCopyPaste?: string;
  pixTicketUrl?: string;
  pixExpiresAt?: Date;
  cardBrand?: string;
  cardLastFour?: string;
  paidAt?: Date;
  raw?: unknown;
};

export type SubscriptionResult = PaymentResult & {
  providerSubscriptionId: string;
  nextBillingAt?: Date;
};

export type ProviderEvent = {
  eventId: string;
  eventType: string;
  resourceId?: string;
  resourceKind: "payment" | "order" | "subscription" | "subscription_payment" | "unknown";
};

export interface PaymentProvider {
  readonly name: string;
  createPixPayment(input: PaymentInput): Promise<PaymentResult>;
  createCardCheckout(input: PaymentInput): Promise<PaymentResult>;
  createSubscription(input: SubscriptionInput): Promise<SubscriptionResult>;
  cancelPayment(providerPaymentId: string, resourceKind?: ProviderEvent["resourceKind"]): Promise<void>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  reactivateSubscription(providerSubscriptionId: string): Promise<void>;
  getPaymentStatus(providerPaymentId: string, resourceKind?: ProviderEvent["resourceKind"]): Promise<PaymentResult>;
  findPaymentByExternalReference(externalReference: string): Promise<PaymentResult | null>;
  getSubscriptionStatus(providerSubscriptionId: string): Promise<SubscriptionResult>;
  refundPayment(providerPaymentId: string, amountInCents?: number): Promise<PaymentResult>;
  parseWebhook(request: Request, body: unknown): Promise<ProviderEvent>;
  fetchEventResource(event: ProviderEvent): Promise<PaymentResult | SubscriptionResult>;
}

export class PaymentConfigurationError extends Error {}
export class PaymentProviderError extends Error {
  constructor(message: string, public status = 502, public details?: unknown) { super(message); }
}
