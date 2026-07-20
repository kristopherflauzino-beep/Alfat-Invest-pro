import { describe, expect, it } from "vitest";
import { defaultNotificationPreferences, mergeNotificationPreferences, normalizeNotificationPreferenceChannels, notificationEmailIsDue, notificationTopics, type AppNotification } from "./notifications";

describe("preferências de notificações", () => {
  it("cria uma preferência para cada assunto", () => {
    expect(defaultNotificationPreferences("u1")).toHaveLength(notificationTopics.length);
  });
  it("mantém valores existentes e completa assuntos ausentes", () => {
    const existing = [{ ...defaultNotificationPreferences("u1")[0], emailEnabled: true, frequency: "daily" as const }];
    const merged = mergeNotificationPreferences("u1", existing);
    expect(merged).toHaveLength(notificationTopics.length);
    expect(merged[0].emailEnabled).toBe(true);
  });
});
describe("entrega vinculada por e-mail", () => {
  const preference = {
    ...defaultNotificationPreferences("u1", "2026-07-20T10:00:00.000Z")[0],
    inAppEnabled: true,
    emailEnabled: true,
    frequency: "immediate" as const
  };
  const notification: AppNotification = {
    id: "n1",
    userId: "u1",
    topic: "opportunities",
    title: "Nova oportunidade",
    summary: "Um ativo atendeu aos filtros configurados.",
    priority: "attention",
    category: "opportunities",
    createdAt: "2026-07-20T10:01:00.000Z"
  };

  it("vincula plataforma e e-mail quando o assunto é ativado", () => {
    expect(normalizeNotificationPreferenceChannels({ inAppEnabled: true, emailEnabled: false, frequency: "in_app_only" })).toEqual({
      inAppEnabled: true,
      emailEnabled: true,
      frequency: "immediate"
    });
    expect(normalizeNotificationPreferenceChannels({ inAppEnabled: false, emailEnabled: false, frequency: "daily" })).toEqual({
      inAppEnabled: false,
      emailEnabled: false,
      frequency: "daily"
    });
  });

  it("envia somente alertas novos e ainda não entregues", () => {
    const now = Date.parse("2026-07-20T10:02:00.000Z");
    expect(notificationEmailIsDue(notification, preference, now)).toBe(true);
    expect(notificationEmailIsDue({ ...notification, createdAt: "2026-07-20T09:59:00.000Z" }, preference, now)).toBe(false);
    expect(notificationEmailIsDue({ ...notification, emailDeliveryStatus: "sent" }, preference, now)).toBe(false);
    expect(notificationEmailIsDue({ ...notification, emailManagedExternally: true }, preference, now)).toBe(false);
  });

  it("respeita resumo diário, novas tentativas e limite de falhas", () => {
    const daily = { ...preference, frequency: "daily" as const };
    expect(notificationEmailIsDue(notification, daily, Date.parse("2026-07-21T10:00:59.000Z"))).toBe(false);
    expect(notificationEmailIsDue(notification, daily, Date.parse("2026-07-21T10:01:00.000Z"))).toBe(true);
    expect(notificationEmailIsDue({ ...notification, emailNextAttemptAt: "2026-07-20T10:05:00.000Z" }, preference, Date.parse("2026-07-20T10:03:00.000Z"))).toBe(false);
    expect(notificationEmailIsDue({ ...notification, emailAttempts: 4 }, preference, Date.parse("2026-07-20T10:03:00.000Z"))).toBe(false);
  });
});
