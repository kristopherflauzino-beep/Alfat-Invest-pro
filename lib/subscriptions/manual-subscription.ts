export const MERCADO_PAGO_PAYMENT_LINK = "https://link.mercadopago.com.br/alfatecinvestpro";
export const PAYMENT_INTENT_TTL_MS = 24 * 60 * 60 * 1000;

export type SubscriptionRequestStatus =
  | "awaiting_payment"
  | "awaiting_verification"
  | "under_review"
  | "payment_confirmed"
  | "activated"
  | "rejected"
  | "cancelled"
  | "expired";

export type SubscriptionRequestHistory = {
  id: string;
  previousStatus?: SubscriptionRequestStatus;
  newStatus: SubscriptionRequestStatus;
  actorId: string;
  actorName: string;
  origin: "client" | "admin" | "system";
  action: string;
  createdAt: string;
  publicNote?: string;
  internalNote?: string;
};

export type ManualSubscriptionRequest = {
  id: string;
  userId: string;
  userName: string;
  email: string;
  planId: string;
  planName: string;
  amountInCents: number;
  durationDays: number;
  status: SubscriptionRequestStatus;
  idempotencyKey: string;
  paymentLinkOpenedAt: string;
  paymentLinkUrl: string;
  intentExpiresAt: string;
  verificationRequestedAt?: string;
  approximatePaymentDate?: string;
  paymentName?: string;
  customerNote?: string;
  transactionReference?: string;
  publicNote?: string;
  internalNote?: string;
  confirmedAt?: string;
  activatedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  expiredAt?: string;
  expiresAt?: string;
  reviewedByUserId?: string;
  createdAt: string;
  updatedAt: string;
  history: SubscriptionRequestHistory[];
};

export const subscriptionStatusLabels: Record<SubscriptionRequestStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  awaiting_verification: "Aguardando verificação",
  under_review: "Em análise",
  payment_confirmed: "Pagamento confirmado",
  activated: "Ativada",
  rejected: "Recusada",
  cancelled: "Cancelada",
  expired: "Expirada"
};

export const operationalSubscriptionStatuses: SubscriptionRequestStatus[] = [
  "awaiting_verification",
  "under_review",
  "payment_confirmed"
];

export const closedSubscriptionStatuses: SubscriptionRequestStatus[] = [
  "activated",
  "rejected",
  "cancelled",
  "expired"
];

const legacyStatus: Record<string, SubscriptionRequestStatus> = {
  aguardando_confirmacao: "awaiting_verification",
  ativo: "activated",
  recusado: "rejected",
  cancelado: "cancelled",
  expirado: "expired"
};

function asText(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function normalizeSubscriptionRequest(value: unknown): ManualSubscriptionRequest | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.userId !== "string" || typeof raw.planId !== "string") return null;
  const now = new Date().toISOString();
  const mappedStatus = legacyStatus[String(raw.status || "")] || String(raw.status || "awaiting_payment");
  if (!(mappedStatus in subscriptionStatusLabels)) return null;
  const createdAt = asText(raw.createdAt) || asText(raw.requestedAt) || now;
  const openedAt = asText(raw.paymentLinkOpenedAt) || createdAt;
  const amountInCents = Number.isFinite(Number(raw.amountInCents))
    ? Math.round(Number(raw.amountInCents))
    : Math.round(Number(raw.planValue || 0) * 100);
  const historyValues = Array.isArray(raw.history) ? raw.history : [];
  const history: SubscriptionRequestHistory[] = historyValues.map((entry, index) => {
    const item = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    const entryStatus = legacyStatus[String(item.status || "")] || String(item.newStatus || mappedStatus);
    return {
      id: asText(item.id) || raw.id + ":history:" + index,
      previousStatus: asText(item.previousStatus) as SubscriptionRequestStatus | undefined,
      newStatus: (entryStatus in subscriptionStatusLabels ? entryStatus : mappedStatus) as SubscriptionRequestStatus,
      actorId: asText(item.actorId) || raw.userId as string,
      actorName: asText(item.actorName) || asText(raw.userName) || "Usuário",
      origin: item.origin === "admin" || item.origin === "system" ? item.origin : "client",
      action: asText(item.action) || "registro_migrado",
      createdAt: asText(item.createdAt) || createdAt,
      publicNote: asText(item.publicNote) || asText(item.note)
    };
  });
  return {
    id: raw.id,
    userId: raw.userId,
    userName: asText(raw.userName) || "Usuário",
    email: asText(raw.email) || "",
    planId: raw.planId,
    planName: asText(raw.planName) || "Plano",
    amountInCents,
    durationDays: Math.max(1, Number(raw.durationDays || 1)),
    status: mappedStatus as SubscriptionRequestStatus,
    idempotencyKey: asText(raw.idempotencyKey) || raw.id,
    paymentLinkOpenedAt: openedAt,
    paymentLinkUrl: asText(raw.paymentLinkUrl) || MERCADO_PAGO_PAYMENT_LINK,
    intentExpiresAt: asText(raw.intentExpiresAt) || new Date(new Date(openedAt).getTime() + PAYMENT_INTENT_TTL_MS).toISOString(),
    verificationRequestedAt: asText(raw.verificationRequestedAt) || asText(raw.reportedAt) || asText(raw.requestedAt),
    approximatePaymentDate: asText(raw.approximatePaymentDate),
    paymentName: asText(raw.paymentName),
    customerNote: asText(raw.customerNote) || asText(raw.clientNote),
    transactionReference: asText(raw.transactionReference) || asText(raw.transactionId),
    publicNote: asText(raw.publicNote) || asText(raw.adminNote),
    internalNote: asText(raw.internalNote),
    confirmedAt: asText(raw.confirmedAt),
    activatedAt: asText(raw.activatedAt),
    rejectedAt: asText(raw.rejectedAt),
    cancelledAt: asText(raw.cancelledAt),
    expiredAt: asText(raw.expiredAt),
    expiresAt: asText(raw.expiresAt),
    reviewedByUserId: asText(raw.reviewedByUserId) || asText(raw.updatedBy),
    createdAt,
    updatedAt: asText(raw.updatedAt) || createdAt,
    history
  };
}

export function normalizeSubscriptionRequests(values: unknown): ManualSubscriptionRequest[] {
  if (!Array.isArray(values)) return [];
  return values.map(normalizeSubscriptionRequest).filter((item): item is ManualSubscriptionRequest => Boolean(item));
}

export function isIntentExpired(item: ManualSubscriptionRequest, now = Date.now()) {
  return new Date(item.intentExpiresAt).getTime() <= now;
}

export function canRequestVerification(item: ManualSubscriptionRequest, currentPriceInCents: number, now = Date.now()) {
  return item.status === "awaiting_payment"
    && Boolean(item.paymentLinkOpenedAt)
    && !isIntentExpired(item, now)
    && item.amountInCents === currentPriceInCents;
}

export function appendSubscriptionHistory(
  item: ManualSubscriptionRequest,
  input: Omit<SubscriptionRequestHistory, "id" | "previousStatus" | "createdAt">
) {
  const createdAt = new Date().toISOString();
  return {
    ...item,
    status: input.newStatus,
    updatedAt: createdAt,
    history: [
      ...item.history,
      {
        ...input,
        id: crypto.randomUUID(),
        previousStatus: item.status,
        createdAt
      }
    ]
  };
}