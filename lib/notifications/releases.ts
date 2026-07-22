import type { CoreState } from "@/lib/server/core-state";
import { createNotification, preferenceFor, type AppNotification } from "./notifications";

export const MARKET_FIXED_INCOME_RELEASE_ID = "release-market-income-fixed-income-2026-07";

export function ensureMarketFixedIncomeRelease(state: CoreState) {
  const notifications = (Array.isArray(state.notifications) ? state.notifications : []).filter((value): value is AppNotification => Boolean(value && typeof value === "object" && typeof (value as AppNotification).id === "string"));
  const preferences = Array.isArray(state.notificationPreferences) ? state.notificationPreferences : [];
  const created: AppNotification[] = [];

  for (const account of state.accounts) {
    if (account.status === "bloqueado") continue;
    const preference = preferenceFor(preferences, account.id, "platform_updates");
    if (!preference.inAppEnabled && !preference.emailEnabled) continue;
    const dedupKey = `${MARKET_FIXED_INCOME_RELEASE_ID}:${account.id}`;
    if (notifications.some((item) => item.userId === account.id && item.dedupKey === dedupKey)) continue;
    created.push(createNotification({
      userId: account.id,
      topic: "platform_updates",
      title: "Novidades: preços, proventos e Renda Fixa",
      summary: "As cotações agora passam por validação centralizada e cache persistente. A plataforma também ganhou histórico real de proventos por ação ou cota e um novo módulo de Renda Fixa com carteira, vencimentos, IR, IOF, FGC e simulações com taxas oficiais.",
      priority: "important",
      category: "system",
      actionUrl: "/",
      dedupKey
    }));
  }

  if (created.length) state.notifications = [...created, ...notifications];
  return { changed: created.length > 0, created };
}
