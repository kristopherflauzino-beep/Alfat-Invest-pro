import { describe, expect, it } from "vitest";
import { defaultNotificationPreferences, mergeNotificationPreferences, notificationTopics } from "./notifications";

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