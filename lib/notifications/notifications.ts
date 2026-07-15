export type NotificationTopic =
  | "opportunities"
  | "portfolio_rebalancing"
  | "portfolio_allocation"
  | "portfolio_score"
  | "fii_score"
  | "crypto_score"
  | "graham_changes"
  | "dividends"
  | "corporate_events"
  | "price_alerts"
  | "risk_alerts"
  | "stale_data"
  | "plan_expiration"
  | "payment_status"
  | "subscription_status"
  | "platform_updates"
  | "admin_messages"
  | "security";

export type NotificationPriority = "informative" | "attention" | "important" | "critical";
export type NotificationFrequency = "immediate" | "daily" | "weekly" | "in_app_only";

export type AppNotification = {
  id: string;
  userId: string;
  topic: NotificationTopic;
  title: string;
  summary: string;
  priority: NotificationPriority;
  category: "opportunities" | "portfolio" | "plan" | "payments" | "risk" | "system";
  actionUrl?: string;
  dedupKey?: string;
  readAt?: string;
  createdAt: string;
};

export type NotificationPreference = {
  id: string;
  userId: string;
  topic: NotificationTopic;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  frequency: NotificationFrequency;
  createdAt: string;
  updatedAt: string;
};

export const notificationTopics: Array<{ topic: NotificationTopic; label: string; essential?: boolean }> = [
  { topic: "opportunities", label: "Alertas de oportunidades" },
  { topic: "portfolio_rebalancing", label: "Ajustes e balanceamento da carteira" },
  { topic: "portfolio_allocation", label: "Ativos fora da alocação-alvo" },
  { topic: "portfolio_score", label: "Mudanças no Score AlfaTec Carteira" },
  { topic: "fii_score", label: "Mudanças no Score AlfaTec FIIs" },
  { topic: "crypto_score", label: "Mudanças no Score AlfaTec Cripto" },
  { topic: "graham_changes", label: "Alterações relevantes no Método Graham" },
  { topic: "dividends", label: "Dividendos e rendimentos" },
  { topic: "corporate_events", label: "Resultados e eventos corporativos" },
  { topic: "price_alerts", label: "Mudanças de preço" },
  { topic: "risk_alerts", label: "Alertas de risco" },
  { topic: "stale_data", label: "Dados desatualizados" },
  { topic: "plan_expiration", label: "Plano próximo do vencimento", essential: true },
  { topic: "payment_status", label: "Status do pagamento", essential: true },
  { topic: "subscription_status", label: "Status da assinatura", essential: true },
  { topic: "platform_updates", label: "Novidades da plataforma" },
  { topic: "admin_messages", label: "Comunicados administrativos" },
  { topic: "security", label: "Segurança da conta", essential: true }
];

export function defaultNotificationPreferences(userId: string, now = new Date().toISOString()): NotificationPreference[] {
  return notificationTopics.map((item) => ({
    id: userId + ":" + item.topic,
    userId,
    topic: item.topic,
    inAppEnabled: true,
    emailEnabled: Boolean(item.essential),
    frequency: item.essential ? "immediate" : "in_app_only",
    createdAt: now,
    updatedAt: now
  }));
}

export function mergeNotificationPreferences(userId: string, values: unknown[]): NotificationPreference[] {
  const defaults = defaultNotificationPreferences(userId);
  const existing = new Map(
    values
      .filter((value): value is NotificationPreference => Boolean(value && typeof value === "object" && (value as NotificationPreference).userId === userId))
      .map((value) => [value.topic, value])
  );
  return defaults.map((fallback) => ({ ...fallback, ...(existing.get(fallback.topic) || {}), id: fallback.id, userId }));
}

export function createNotification(input: Omit<AppNotification, "id" | "createdAt">): AppNotification {
  return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
}

export function preferenceFor(values: unknown[], userId: string, topic: NotificationTopic) {
  return mergeNotificationPreferences(userId, values).find((item) => item.topic === topic)!;
}