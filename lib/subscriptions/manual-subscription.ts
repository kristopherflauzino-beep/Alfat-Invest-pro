export const MERCADO_PAGO_PAYMENT_LINK = "https://link.mercadopago.com.br/alfatecinvestpro";

export type SubscriptionRequestStatus =
  | "aguardando_confirmacao"
  | "ativo"
  | "recusado"
  | "cancelado"
  | "expirado";

export type SubscriptionRequestHistory = {
  id: string;
  action: string;
  status: SubscriptionRequestStatus;
  actorId: string;
  actorName: string;
  createdAt: string;
  note?: string;
};

export type ManualSubscriptionRequest = {
  id: string;
  userId: string;
  userName: string;
  email: string;
  planId: string;
  planName: string;
  planValue: number;
  durationDays: number;
  status: SubscriptionRequestStatus;
  idempotencyKey: string;
  requestedAt: string;
  updatedAt: string;
  reportedAt?: string;
  approximatePaymentDate?: string;
  clientNote?: string;
  transactionId?: string;
  confirmedAt?: string;
  activatedAt?: string;
  expiresAt?: string;
  adminNote?: string;
  updatedBy?: string;
  history: SubscriptionRequestHistory[];
};

export const subscriptionStatusLabels: Record<SubscriptionRequestStatus, string> = {
  aguardando_confirmacao: "Aguardando confirmação",
  ativo: "Ativo",
  recusado: "Recusado",
  cancelado: "Cancelado",
  expirado: "Expirado"
};

export function isSubscriptionRequest(value: unknown): value is ManualSubscriptionRequest {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ManualSubscriptionRequest>;
  return typeof item.id === "string" && typeof item.userId === "string" && typeof item.planId === "string";
}
