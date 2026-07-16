import Decimal from "decimal.js-light";
import type { AssetType } from "@/lib/types";

Decimal.set({ precision: 80, rounding: Decimal.ROUND_HALF_UP });

export const CRYPTO_MAX_DECIMAL_PLACES = 22;
export const MARKET_MAX_DECIMAL_PLACES = 8;
export const MAX_DECIMAL_DIGITS = 40;

export type DecimalValidationResult =
  | { ok: true; value: string; decimalPlaces: number }
  | { ok: false; error: string };

function canonicalDecimal(integer: string, fraction?: string) {
  const normalizedInteger = integer.replace(/^0+(?=\d)/, "") || "0";
  return fraction === undefined ? normalizedInteger : normalizedInteger + "." + fraction;
}

export function validateDecimalInput(
  input: string | number,
  options: {
    maxDecimalPlaces?: number;
    maxDigits?: number;
    allowZero?: boolean;
    fieldLabel?: string;
  } = {}
): DecimalValidationResult {
  const maxDecimalPlaces = options.maxDecimalPlaces ?? CRYPTO_MAX_DECIMAL_PLACES;
  const maxDigits = options.maxDigits ?? MAX_DECIMAL_DIGITS;
  const fieldLabel = options.fieldLabel || "O valor";
  const raw = String(input).trim();
  if (!raw) return { ok: false, error: fieldLabel + " é obrigatório." };
  if (/\s/u.test(raw)) return { ok: false, error: fieldLabel + " não pode conter espaços internos." };
  if (/[eE]/u.test(raw)) return { ok: false, error: "Não utilize notação científica neste campo." };
  if (!/^\d+(?:[.,]\d+)?$/u.test(raw)) {
    return { ok: false, error: fieldLabel + " deve conter apenas números e um separador decimal." };
  }

  const normalized = raw.replace(",", ".");
  const [integer, fraction] = normalized.split(".");
  const decimalPlaces = fraction?.length ?? 0;
  if (decimalPlaces > maxDecimalPlaces) {
    return {
      ok: false,
      error: maxDecimalPlaces === CRYPTO_MAX_DECIMAL_PLACES
        ? "A quantidade pode possuir no máximo 22 casas decimais."
        : fieldLabel + " pode possuir no máximo " + maxDecimalPlaces + " casas decimais."
    };
  }
  if ((integer + (fraction || "")).length > maxDigits) {
    return { ok: false, error: fieldLabel + " excede o limite de " + maxDigits + " dígitos." };
  }

  const value = canonicalDecimal(integer, fraction);
  let decimal: Decimal;
  try {
    decimal = new Decimal(value);
  } catch {
    return { ok: false, error: fieldLabel + " é inválido." };
  }
  if (options.allowZero ? decimal.isNegative() : decimal.lessThanOrEqualTo(0)) {
    return { ok: false, error: fieldLabel + (options.allowZero ? " não pode ser negativo." : " deve ser maior que zero.") };
  }
  return { ok: true, value, decimalPlaces };
}

export function validateAssetQuantity(input: string | number, assetType: AssetType) {
  return validateDecimalInput(input, {
    maxDecimalPlaces: assetType === "CRIPTO" ? CRYPTO_MAX_DECIMAL_PLACES : MARKET_MAX_DECIMAL_PLACES,
    fieldLabel: "A quantidade"
  });
}

export function normalizeImportedCryptoQuantity(input: string | number): DecimalValidationResult {
  const raw = String(input).trim().replace(",", ".");
  if (!/[eE]/u.test(raw)) return validateAssetQuantity(raw, "CRIPTO");
  if (!/^\d+(?:\.\d+)?[eE][+-]?\d+$/u.test(raw)) {
    return { ok: false, error: "A quantidade importada possui notação científica inválida." };
  }
  try {
    const decimal = new Decimal(raw);
    if (decimal.lessThanOrEqualTo(0)) {
      return { ok: false, error: "A quantidade deve ser maior que zero." };
    }
    const decimalPlaces = Math.max(0, decimal.decimalPlaces());
    if (decimalPlaces > CRYPTO_MAX_DECIMAL_PLACES) {
      return { ok: false, error: "A quantidade pode possuir no máximo 22 casas decimais." };
    }
    return validateAssetQuantity(decimal.toFixed(decimalPlaces), "CRIPTO");
  } catch {
    return { ok: false, error: "A quantidade importada é inválida." };
  }
}

export function decimalToNumber(value: string | number | Decimal) {
  return new Decimal(value).toNumber();
}

export function multiplyDecimalToNumber(left: string | number, right: string | number) {
  return new Decimal(left).times(new Decimal(right)).toNumber();
}

export function multiplyDecimals(left: string | number, right: string | number) {
  return new Decimal(left).times(new Decimal(right));
}

export function formatDecimalForDisplay(value: string | number) {
  const normalized = String(value).replace(",", ".");
  const [integer, rawFraction] = normalized.split(".");
  const fraction = rawFraction?.replace(/0+$/u, "");
  return fraction ? integer + "," + fraction : integer;
}

export function fullDecimalForDisplay(value: string | number) {
  return String(value).replace(".", ",");
}

export function normalizeStoredDecimal(value: unknown, maxDecimalPlaces = CRYPTO_MAX_DECIMAL_PLACES) {
  const parsed = validateDecimalInput(typeof value === "number" || typeof value === "string" ? value : "", {
    maxDecimalPlaces,
    fieldLabel: "O valor"
  });
  return parsed.ok ? parsed.value : null;
}
