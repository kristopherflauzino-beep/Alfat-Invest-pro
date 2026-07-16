import { describe, expect, it } from "vitest";
import {
  createEmailChangeToken,
  emailChangeTokenState,
  hashEmailChangeToken,
  normalizeAccountName,
  normalizeEmail,
  recentNameChanges,
  type EmailChangeTokenRecord
} from "./change-email";

function record(overrides: Partial<EmailChangeTokenRecord> = {}): EmailChangeTokenRecord {
  return {
    id: "token-1",
    userId: "user-1",
    newEmail: "novo@example.com",
    tokenHash: "hash",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    requestedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("alteração de identidade", () => {
  it("preserva nomes compostos e acentos removendo apenas espaços externos", () => {
    expect(normalizeAccountName("  João da Silva  ")).toEqual({ ok: true, value: "João da Silva" });
  });

  it("recusa nome vazio, muito longo ou com conteúdo inseguro", () => {
    expect(normalizeAccountName(" ").ok).toBe(false);
    expect(normalizeAccountName("a".repeat(121)).ok).toBe(false);
    expect(normalizeAccountName("<script>alert(1)</script>").ok).toBe(false);
  });

  it("normaliza e-mail em minúsculas", () => {
    expect(normalizeEmail("  Novo@Example.COM ")).toBe("novo@example.com");
  });

  it("gera token imprevisível e armazena apenas hash", () => {
    const first = createEmailChangeToken();
    const second = createEmailChangeToken();
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashEmailChangeToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });

  it("diferencia token válido, expirado e utilizado", () => {
    expect(emailChangeTokenState(record())).toBe("valid");
    expect(emailChangeTokenState(record({ expiresAt: new Date(Date.now() - 1).toISOString() }))).toBe("expired");
    expect(emailChangeTokenState(record({ usedAt: new Date().toISOString() }))).toBe("used");
  });

  it("considera somente alterações de nome dentro de 30 dias", () => {
    const now = Date.now();
    const recent = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    const old = new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString();
    expect(recentNameChanges([recent, old, "inválido"], now)).toEqual([recent]);
  });
});
