import { describe, expect, it } from "vitest";
import {
  createEmailVerificationToken,
  emailVerificationTokenState,
  hashEmailVerificationToken,
  isEmailVerificationRateEvent,
  isEmailVerificationToken,
  isPendingRegistration,
  pendingRegistrationState,
  type EmailVerificationTokenRecord,
  type PendingRegistration
} from "./email-verification";

function registration(overrides: Partial<PendingRegistration> = {}): PendingRegistration {
  return {
    id: "registration-1",
    name: "Cliente Teste",
    username: "cliente.teste",
    email: "cliente@example.com",
    passwordHash: "hash",
    acceptedTermsAt: new Date().toISOString(),
    acceptedPrivacyAt: new Date().toISOString(),
    planId: "mensal",
    planName: "Mensal",
    planPriceInCents: 2490,
    durationDays: 30,
    permissions: ["mercado"],
    status: "awaiting_email_confirmation",
    paymentProvider: "mercado_pago",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

function token(overrides: Partial<EmailVerificationTokenRecord> = {}): EmailVerificationTokenRecord {
  return {
    id: "token-1",
    pendingRegistrationId: "registration-1",
    tokenHash: "hash",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    requestedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("cadastro provisório e verificação de e-mail", () => {
  it("gera token aleatório e conserva somente o hash verificável", () => {
    const first = createEmailVerificationToken();
    const second = createEmailVerificationToken();
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashEmailVerificationToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });

  it("diferencia token válido, usado, expirado e inválido", () => {
    expect(emailVerificationTokenState(token())).toBe("valid");
    expect(emailVerificationTokenState(token({ usedAt: new Date().toISOString() }))).toBe("used");
    expect(emailVerificationTokenState(token({ expiresAt: new Date(Date.now() - 1).toISOString() }))).toBe("expired");
    expect(emailVerificationTokenState(undefined)).toBe("invalid");
  });

  it("expira cadastro incompleto sem alterar cadastros encerrados", () => {
    expect(pendingRegistrationState(registration())).toBe("awaiting_email_confirmation");
    expect(pendingRegistrationState(registration({ expiresAt: new Date(Date.now() - 1).toISOString() }))).toBe("expired");
    expect(pendingRegistrationState(registration({ status: "activated", expiresAt: new Date(Date.now() - 1).toISOString() }))).toBe("activated");
    expect(pendingRegistrationState(registration({ status: "paid", expiresAt: new Date(Date.now() - 1).toISOString() }))).toBe("paid");
  });

  it("reconhece somente registros com os campos de segurança obrigatórios", () => {
    expect(isPendingRegistration(registration())).toBe(true);
    expect(isPendingRegistration({ id: "x" })).toBe(false);
    expect(isEmailVerificationToken(token())).toBe(true);
    expect(isEmailVerificationToken({ id: "x" })).toBe(false);
    expect(isEmailVerificationRateEvent({ id: "x", emailHash: "hash", ipHash: "ip", createdAt: new Date().toISOString() })).toBe(true);
    expect(isEmailVerificationRateEvent({ id: "x" })).toBe(false);
  });

  it("não interpreta abertura do link como pagamento ou ativação", () => {
    const opened = registration({ status: "awaiting_payment", paymentLinkOpenedAt: new Date().toISOString() });
    expect(pendingRegistrationState(opened)).toBe("awaiting_payment");
    expect(opened.paymentConfirmedAt).toBeUndefined();
    expect(opened.activatedAt).toBeUndefined();
  });
});
