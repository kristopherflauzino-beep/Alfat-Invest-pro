import { describe, expect, it } from "vitest";
import { annualRateFor, calculateFixedIncome, regressiveIncomeTaxRate, regressiveIofRate } from "./calculator";
import type { FixedIncomeCalculationInput } from "./types";

const base: FixedIncomeCalculationInput = {
  principalInCents: 1_000_000,
  startDate: "2026-01-01",
  endDate: "2027-01-01",
  indexer: "CDI",
  indexerPercentage: 100,
  cdiAnnual: 14,
  selicAnnual: 14.25,
  inflationAnnual: 4.5,
  taxExempt: false,
  iofApplicable: true
};

describe("calculadora de renda fixa", () => {
  it("calcula CDB a 100% e 110% do CDI sem misturar a escala percentual", () => {
    expect(annualRateFor(base)).toBe(14);
    expect(annualRateFor({ ...base, indexerPercentage: 110 })).toBeCloseTo(15.4, 8);
  });

  it("calcula prefixado com juros compostos", () => {
    const result = calculateFixedIncome({ ...base, indexer: "PREFIXED", fixedRateAnnual: 12 });
    expect(result?.grossValueInCents).toBeCloseTo(1_120_000, -2);
    expect(result?.annualRateUsed).toBe(12);
  });

  it("combina inflação e taxa real no IPCA+", () => {
    expect(annualRateFor({ ...base, indexer: "IPCA", inflationAnnual: 4.5, fixedRateAnnual: 6 })).toBeCloseTo(10.77, 8);
  });

  it("aplica a tabela regressiva de IR", () => {
    expect(regressiveIncomeTaxRate(180)).toBe(22.5);
    expect(regressiveIncomeTaxRate(360)).toBe(20);
    expect(regressiveIncomeTaxRate(720)).toBe(17.5);
    expect(regressiveIncomeTaxRate(721)).toBe(15);
  });

  it("não aplica IR em título explicitamente isento", () => {
    const result = calculateFixedIncome({ ...base, taxExempt: true });
    expect(result?.incomeTaxRate).toBe(0);
    expect(result?.incomeTaxInCents).toBe(0);
  });

  it("aplica IOF somente antes de 30 dias", () => {
    expect(regressiveIofRate(1)).toBe(96);
    expect(regressiveIofRate(29)).toBe(3);
    expect(regressiveIofRate(30)).toBe(0);
  });

  it("separa valor bruto, IR, IOF e valor líquido", () => {
    const result = calculateFixedIncome({ ...base, endDate: "2026-01-16" });
    expect(result).not.toBeNull();
    expect(result!.grossValueInCents).toBeGreaterThan(result!.investedInCents);
    expect(result!.iofInCents).toBeGreaterThan(0);
    expect(result!.netValueInCents).toBeLessThan(result!.grossValueInCents);
  });

  it("recusa principal ou datas inválidas", () => {
    expect(calculateFixedIncome({ ...base, principalInCents: 0 })).toBeNull();
    expect(calculateFixedIncome({ ...base, endDate: base.startDate })).toBeNull();
  });
});