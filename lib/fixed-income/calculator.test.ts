import { describe, expect, it } from "vitest";
import {
  annualRateFor,
  calculateFixedIncome,
  equivalentMonthlyRate,
  fixedIncomeDays,
  parseBrazilianCurrencyToCents,
  regressiveIncomeTaxRate,
  regressiveIofRate
} from "./calculator";
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
  iofApplicable: true,
  rateMode: "automatic",
  rateMethod: "percentage",
  dayCountBasis: 365,
  contributionTiming: "end"
};

describe("calculadora de renda fixa", () => {
  it("calcula 100% e 110% do CDI sem duplicar a escala percentual", () => {
    expect(annualRateFor(base)).toBe(14);
    expect(annualRateFor({ ...base, indexerPercentage: 110 })).toBeCloseTo(15.4, 8);
  });

  it("diferencia percentual do indexador de indexador mais spread", () => {
    expect(annualRateFor({ ...base, rateMethod: "spread", spreadAnnual: 2 })).toBe(16);
    expect(annualRateFor({ ...base, rateMethod: "percentage", indexerPercentage: 102, spreadAnnual: 9 })).toBeCloseTo(14.28, 8);
  });

  it("usa referência manual quando a taxa automática está indisponível", () => {
    const result = calculateFixedIncome({
      ...base,
      cdiAnnual: undefined,
      rateMode: "manual",
      manualReferenceAnnual: 13.75
    });
    expect(result?.annualRateUsed).toBe(13.75);
    expect(result?.referenceAnnualPercent).toBe(13.75);
    expect(result?.rateMode).toBe("manual");
  });

  it("não calcula indexador automático sem taxa de referência", () => {
    expect(calculateFixedIncome({ ...base, cdiAnnual: undefined })).toBeNull();
  });

  it("calcula prefixado com juros compostos", () => {
    const result = calculateFixedIncome({ ...base, indexer: "PREFIXED", fixedRateAnnual: 12 });
    expect(result?.grossValueInCents).toBe(1_120_000);
    expect(result?.annualRateUsed).toBe(12);
  });

  it("calcula a taxa mensal equivalente por capitalização composta", () => {
    expect(equivalentMonthlyRate(12)).toBeCloseTo(0.948879, 5);
    expect(equivalentMonthlyRate(0)).toBe(0);
  });

  it("combina inflação e taxa real no IPCA+", () => {
    expect(annualRateFor({
      ...base,
      indexer: "IPCA",
      inflationAnnual: 4.5,
      fixedRateAnnual: 6
    })).toBeCloseTo(10.77, 8);
  });

  it("aceita IPCA manual sem apresentar o valor como automático", () => {
    const result = calculateFixedIncome({
      ...base,
      indexer: "IPCA",
      rateMode: "manual",
      manualReferenceAnnual: 5,
      fixedRateAnnual: 6
    });
    expect(result?.annualRateUsed).toBeCloseTo(11.3, 4);
    expect(result?.referenceAnnualPercent).toBe(5);
  });

  it("inclui aportes mensais no total aplicado e na evolução", () => {
    const result = calculateFixedIncome({
      ...base,
      indexer: "PREFIXED",
      fixedRateAnnual: 12,
      monthlyContributionInCents: 100_000,
      taxExempt: true
    });
    expect(result?.contributionCount).toBe(12);
    expect(result?.investedInCents).toBe(2_200_000);
    expect(result?.grossValueInCents).toBeGreaterThan(result!.investedInCents);
    expect(result?.evolution.at(-1)?.netBalanceInCents).toBe(result?.netValueInCents);
  });

  it("mantém doze aportes no início em um prazo de doze meses", () => {
    const result = calculateFixedIncome({
      ...base,
      indexer: "PREFIXED",
      fixedRateAnnual: 12,
      monthlyContributionInCents: 100_000,
      contributionTiming: "beginning",
      taxExempt: true
    });
    expect(result?.contributionCount).toBe(12);
    expect(result?.investedInCents).toBe(2_200_000);
  });
  it("apura IR por lote nos aportes mensais", () => {
    const result = calculateFixedIncome({
      ...base,
      indexer: "PREFIXED",
      fixedRateAnnual: 12,
      monthlyContributionInCents: 100_000
    });
    expect(result?.incomeTaxInCents).toBeGreaterThan(0);
    expect(result?.incomeTaxRate).toBeGreaterThan(17.5);
    expect(result?.incomeTaxRate).toBeLessThanOrEqual(22.5);
  });

  it("aplica toda a tabela regressiva de IR", () => {
    expect(regressiveIncomeTaxRate(180)).toBe(22.5);
    expect(regressiveIncomeTaxRate(181)).toBe(20);
    expect(regressiveIncomeTaxRate(360)).toBe(20);
    expect(regressiveIncomeTaxRate(361)).toBe(17.5);
    expect(regressiveIncomeTaxRate(720)).toBe(17.5);
    expect(regressiveIncomeTaxRate(721)).toBe(15);
  });

  it("não aplica IR em produto explicitamente isento", () => {
    const result = calculateFixedIncome({ ...base, taxExempt: true });
    expect(result?.incomeTaxRate).toBe(0);
    expect(result?.incomeTaxInCents).toBe(0);
  });

  it("aplica IOF somente antes de 30 dias", () => {
    expect(regressiveIofRate(1)).toBe(96);
    expect(regressiveIofRate(29)).toBe(3);
    expect(regressiveIofRate(30)).toBe(0);
    const result = calculateFixedIncome({ ...base, endDate: "2026-01-16" });
    expect(result?.iofInCents).toBeGreaterThan(0);
  });

  it("separa custódia e taxa fixa do valor líquido", () => {
    const result = calculateFixedIncome({
      ...base,
      indexer: "PREFIXED",
      fixedRateAnnual: 12,
      custodyFeeAnnual: 0.2,
      brokerageFeeInCents: 2_500
    });
    expect(result?.custodyFeeInCents).toBeGreaterThan(0);
    expect(result?.fixedFeesInCents).toBe(2_500);
    expect(result?.feesInCents).toBe(result!.custodyFeeInCents + result!.fixedFeesInCents);
    expect(result?.netValueInCents).toBeLessThan(result!.grossValueInCents);
  });

  it("identifica a base de capitalização e os dias usados", () => {
    const result365 = calculateFixedIncome({ ...base, indexer: "PREFIXED", fixedRateAnnual: 12, dayCountBasis: 365 });
    const result252 = calculateFixedIncome({ ...base, indexer: "PREFIXED", fixedRateAnnual: 12, dayCountBasis: 252 });
    expect(result365?.calculationDays).toBe(365);
    expect(result252?.calculationDays).toBeGreaterThan(250);
    expect(result252?.dayCountBasis).toBe(252);
  });

  it("preserva uma taxa zero como cenário válido", () => {
    const result = calculateFixedIncome({ ...base, indexer: "PREFIXED", fixedRateAnnual: 0, taxExempt: true });
    expect(result?.grossValueInCents).toBe(base.principalInCents);
    expect(result?.netValueInCents).toBe(base.principalInCents);
  });

  it("mantém o principal em um fim de semana na base de 252 dias úteis", () => {
    const result = calculateFixedIncome({
      ...base,
      indexer: "PREFIXED",
      fixedRateAnnual: 12,
      startDate: "2026-07-18",
      endDate: "2026-07-19",
      dayCountBasis: 252,
      taxExempt: true
    });
    expect(result?.calculationDays).toBe(0);
    expect(result?.grossValueInCents).toBe(base.principalInCents);
  });
  it("conta datas sem diferença causada por horário", () => {
    expect(fixedIncomeDays("2026-01-01", "2027-01-01")).toBe(365);
    expect(fixedIncomeDays("2026-02-28", "2026-03-01")).toBe(1);
  });

  it("normaliza valores monetários brasileiros sem perder centavos", () => {
    expect(parseBrazilianCurrencyToCents("R$ 10.000,50")).toBe(1_000_050);
    expect(parseBrazilianCurrencyToCents("10,50")).toBe(1_050);
    expect(parseBrazilianCurrencyToCents("10000.50")).toBe(1_000_050);
    expect(parseBrazilianCurrencyToCents("10.000")).toBe(1_000_000);
    expect(parseBrazilianCurrencyToCents("-10")).toBeNull();
  });
  it("recusa valores, datas e referências inválidas", () => {
    expect(calculateFixedIncome({ ...base, principalInCents: 0 })).toBeNull();
    expect(calculateFixedIncome({ ...base, endDate: base.startDate })).toBeNull();
    expect(calculateFixedIncome({ ...base, monthlyContributionInCents: -1 })).toBeNull();
    expect(calculateFixedIncome({ ...base, rateMode: "manual", manualReferenceAnnual: undefined })).toBeNull();
  });
});