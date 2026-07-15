import { describe, expect, it } from "vitest";
import { createPasswordResetToken, hashResetToken, resetTokenState } from "./password-reset";

describe("recuperação de senha", () => {
  it("gera token imprevisível e persiste somente o hash", () => {
    const value = createPasswordResetToken();
    expect(value.token).not.toBe(value.tokenHash);
    expect(hashResetToken(value.token)).toBe(value.tokenHash);
    expect(value.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });
  it("distingue token válido, usado, expirado e bloqueado", () => {
    const base = { id: "1", userId: "u1", tokenHash: "hash", requestedAt: new Date().toISOString(), createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString(), attempts: 0 };
    expect(resetTokenState(base)).toBe("valid");
    expect(resetTokenState({ ...base, usedAt: new Date().toISOString() })).toBe("used");
    expect(resetTokenState({ ...base, expiresAt: new Date(Date.now() - 1).toISOString() })).toBe("expired");
    expect(resetTokenState({ ...base, attempts: 5 })).toBe("blocked");
  });
});