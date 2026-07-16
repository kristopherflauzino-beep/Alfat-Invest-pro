import { describe, expect, it } from "vitest";
import {
  formatDecimalForDisplay,
  fullDecimalForDisplay,
  multiplyDecimals,
  normalizeImportedCryptoQuantity,
  validateAssetQuantity
} from "./crypto-quantity";

describe("quantidades decimais de cripto", () => {
  it.each([
    ["1", "1"],
    ["0,1", "0.1"],
    ["0.00000001", "0.00000001"],
    ["0.0000000000000000000001", "0.0000000000000000000001"],
    ["1.1234567890123456789012", "1.1234567890123456789012"]
  ])("aceita %s sem perda de precisão", (input, expected) => {
    expect(validateAssetQuantity(input, "CRIPTO")).toMatchObject({ ok: true, value: expected });
  });

  it("recusa 23 casas decimais", () => {
    const result = validateAssetQuantity("0.00000000000000000000001", "CRIPTO");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("22 casas decimais");
  });

  it("não aceita notação científica na interface", () => {
    expect(validateAssetQuantity("1E-8", "CRIPTO").ok).toBe(false);
  });

  it("converte notação científica em importações", () => {
    expect(normalizeImportedCryptoQuantity("1E-8")).toEqual({ ok: true, value: "0.00000001", decimalPlaces: 8 });
  });

  it("mantém a multiplicação exata antes da apresentação", () => {
    expect(multiplyDecimals("0.1", "0.2").toFixed(22)).toBe("0.0200000000000000000000");
  });

  it("resume zeros e permite exibir o valor completo", () => {
    expect(formatDecimalForDisplay("1.2300000000000000000000")).toBe("1,23");
    expect(formatDecimalForDisplay("0.0000000100000000000000")).toBe("0,00000001");
    expect(fullDecimalForDisplay("0.0000000100000000000000")).toBe("0,0000000100000000000000");
  });

  it("não aplica 22 casas automaticamente a ativos não cripto", () => {
    expect(validateAssetQuantity("1.12345678", "ACAO").ok).toBe(true);
    expect(validateAssetQuantity("1.123456789", "ACAO").ok).toBe(false);
  });
});
