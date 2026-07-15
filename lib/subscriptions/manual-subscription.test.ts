import { describe, expect, it } from "vitest";
import { appendSubscriptionHistory, canRequestVerification, normalizeSubscriptionRequest } from "./manual-subscription";

const request = normalizeSubscriptionRequest({ id: "r1", userId: "u1", userName: "Cliente", email: "c@example.com", planId: "mensal", planName: "Mensal", amountInCents: 2490, durationDays: 30, status: "awaiting_payment", idempotencyKey: "k1", paymentLinkOpenedAt: new Date().toISOString(), paymentLinkUrl: "https://link.mercadopago.com.br/alfatecinvestpro", intentExpiresAt: new Date(Date.now() + 60_000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), history: [] })!;

describe("solicitações manuais de assinatura", () => {
  it("só permite verificação com intenção ativa e preço preservado", () => {
    expect(canRequestVerification(request, 2490)).toBe(true);
    expect(canRequestVerification(request, 2990)).toBe(false);
    expect(canRequestVerification({ ...request, status: "activated" }, 2490)).toBe(false);
  });
  it("registra transição e ator no histórico", () => {
    const updated = appendSubscriptionHistory(request, { newStatus: "awaiting_verification", actorId: "u1", actorName: "Cliente", origin: "client", action: "verificacao_solicitada" });
    expect(updated.status).toBe("awaiting_verification");
    expect(updated.history.at(-1)?.previousStatus).toBe("awaiting_payment");
  });
});