import Decimal from "decimal.js-light";
import type { FixedIncomeCalculationInput, FixedIncomeCalculationResult, FixedIncomeInvestment, FixedIncomeReferenceRates } from "./types";

const DAY_MS = 86_400_000;
const IOF_RATES = [96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0];

function finite(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function fixedIncomeDays(startDate: string, endDate: string) {
  const start = Date.parse(startDate + (startDate.length === 10 ? "T00:00:00" : ""));
  const end = Date.parse(endDate + (endDate.length === 10 ? "T00:00:00" : ""));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.ceil((end - start) / DAY_MS);
}

export function regressiveIncomeTaxRate(days: number) {
  if (days <= 180) return 22.5;
  if (days <= 360) return 20;
  if (days <= 720) return 17.5;
  return 15;
}

export function regressiveIofRate(days: number) {
  if (days <= 0 || days >= 30) return 0;
  return IOF_RATES[Math.max(0, Math.min(29, days - 1))];
}

export function annualRateFor(input: FixedIncomeCalculationInput) {
  const indexerPercentage = finite(input.indexerPercentage, 100) / 100;
  const spread = finite(input.spreadAnnual);
  const fixed = finite(input.fixedRateAnnual);
  if (input.indexer === "CDI") return finite(input.cdiAnnual) * indexerPercentage + spread;
  if (input.indexer === "SELIC") return finite(input.selicAnnual) * indexerPercentage + spread;
  if (input.indexer === "IPCA") {
    const inflation = finite(input.inflationAnnual) / 100;
    return ((1 + inflation) * (1 + fixed / 100) - 1) * 100;
  }
  if (input.indexer === "PREFIXED") return fixed;
  return fixed + spread;
}

function compound(principalInCents: number, annualPercent: number, days: number) {
  if (principalInCents <= 0 || days <= 0) return new Decimal(Math.max(0, principalInCents));
  return new Decimal(principalInCents)
    .times(new Decimal(1).plus(new Decimal(annualPercent).dividedBy(100)).pow(new Decimal(days).dividedBy(365)));
}

function contributionsValue(monthlyInCents: number, annualPercent: number, days: number) {
  const months = Math.max(0, Math.floor(days / 30.4375));
  if (monthlyInCents <= 0 || months === 0) return new Decimal(0);
  const monthlyRate = new Decimal(1).plus(new Decimal(annualPercent).dividedBy(100)).pow(new Decimal(1).dividedBy(12)).minus(1);
  let total = new Decimal(0);
  for (let month = 0; month < months; month += 1) {
    total = total.plus(new Decimal(monthlyInCents).times(new Decimal(1).plus(monthlyRate).pow(months - month - 1)));
  }
  return total;
}

function cents(value: Decimal) {
  return Math.max(0, value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber());
}

export function calculateFixedIncome(input: FixedIncomeCalculationInput): FixedIncomeCalculationResult | null {
  const days = fixedIncomeDays(input.startDate, input.endDate);
  if (!Number.isSafeInteger(input.principalInCents) || input.principalInCents <= 0 || days <= 0) return null;
  const annualRateUsed = annualRateFor(input);
  if (!Number.isFinite(annualRateUsed) || annualRateUsed < -99 || annualRateUsed > 1000) return null;

  const monthly = Math.max(0, Math.round(finite(input.monthlyContributionInCents)));
  const months = Math.max(0, Math.floor(days / 30.4375));
  const invested = new Decimal(input.principalInCents).plus(new Decimal(monthly).times(months));
  const grossBeforeFees = compound(input.principalInCents, annualRateUsed, days).plus(contributionsValue(monthly, annualRateUsed, days));
  const custodyFee = grossBeforeFees.times(finite(input.custodyFeeAnnual)).dividedBy(100).times(days).dividedBy(365);
  const fees = custodyFee.plus(Math.max(0, Math.round(finite(input.brokerageFeeInCents))));
  const grossValueRaw = grossBeforeFees.minus(fees);
  const grossValue = grossValueRaw.isNegative() ? new Decimal(0) : grossValueRaw;
  const grossIncomeRaw = grossValue.minus(invested);
  const grossIncome = grossIncomeRaw.isNegative() ? new Decimal(0) : grossIncomeRaw;

  const iofRate = input.iofApplicable === false ? 0 : regressiveIofRate(days);
  const iof = grossIncome.times(iofRate).dividedBy(100);
  const taxableIncomeRaw = grossIncome.minus(iof);
  const taxableIncome = taxableIncomeRaw.isNegative() ? new Decimal(0) : taxableIncomeRaw;
  const incomeTaxRate = input.taxExempt ? 0 : regressiveIncomeTaxRate(days);
  const incomeTax = taxableIncome.times(incomeTaxRate).dividedBy(100);
  const netValueRaw = grossValue.minus(iof).minus(incomeTax);
  const netValue = netValueRaw.isNegative() ? new Decimal(0) : netValueRaw;
  const netIncome = netValue.minus(invested);

  const grossReturn = invested.greaterThan(0) ? grossIncome.dividedBy(invested).times(100) : new Decimal(0);
  const netReturn = invested.greaterThan(0) ? netIncome.dividedBy(invested).times(100) : new Decimal(0);
  const years = new Decimal(days).dividedBy(365);
  const effectiveAnnual = years.greaterThan(0) && netValue.greaterThan(0)
    ? netValue.dividedBy(invested).pow(new Decimal(1).dividedBy(years)).minus(1).times(100)
    : new Decimal(0);
  const effectiveMonthly = new Decimal(1).plus(effectiveAnnual.dividedBy(100)).pow(new Decimal(1).dividedBy(12)).minus(1).times(100);
  const inflation = finite(input.inflationAnnual);
  const realReturn = inflation > -100
    ? new Decimal(1).plus(effectiveAnnual.dividedBy(100)).dividedBy(new Decimal(1).plus(new Decimal(inflation).dividedBy(100))).minus(1).times(100)
    : null;

  const warnings = ["Resultado projetado pela marcação na curva; não representa garantia de resgate antecipado."];
  if (input.indexer !== "PREFIXED") warnings.push("Indexadores futuros são cenários e podem mudar durante o período.");
  if (days < 30 && input.iofApplicable !== false) warnings.push("Resgate antes de 30 dias sujeito a IOF regressivo.");
  if (input.taxExempt) warnings.push("Isenção aplicada conforme configuração informada; valide a elegibilidade do título.");

  return {
    days,
    investedInCents: cents(invested),
    grossValueInCents: cents(grossValue),
    grossIncomeInCents: cents(grossIncome),
    incomeTaxRate,
    incomeTaxInCents: cents(incomeTax),
    iofRate,
    iofInCents: cents(iof),
    feesInCents: cents(fees),
    netIncomeInCents: cents(netIncome),
    netValueInCents: cents(netValue),
    grossReturnPercent: grossReturn.toDecimalPlaces(4).toNumber(),
    netReturnPercent: netReturn.toDecimalPlaces(4).toNumber(),
    realReturnPercent: realReturn?.toDecimalPlaces(4).toNumber() ?? null,
    effectiveMonthlyPercent: effectiveMonthly.toDecimalPlaces(4).toNumber(),
    effectiveAnnualPercent: effectiveAnnual.toDecimalPlaces(4).toNumber(),
    annualRateUsed: Number(annualRateUsed.toFixed(4)),
    projection: true,
    marking: "curve",
    warnings
  };
}

export function calculateInvestmentPosition(investment: FixedIncomeInvestment, rates: FixedIncomeReferenceRates, asOf = new Date()) {
  if (investment.indexer === "CDI" && rates.cdi.annualPercent === undefined) return null;
  if (investment.indexer === "SELIC" && rates.selic.annualPercent === undefined) return null;
  if (investment.indexer === "IPCA" && rates.ipca.annualPercent === undefined) return null;
  const end = investment.maturityDate && Date.parse(investment.maturityDate) < asOf.getTime()
    ? investment.maturityDate
    : asOf.toISOString().slice(0, 10);
  const calculated = calculateFixedIncome({
    principalInCents: investment.principalInCents,
    startDate: investment.applicationDate,
    endDate: end,
    indexer: investment.indexer,
    indexerPercentage: investment.indexerPercentage,
    fixedRateAnnual: investment.fixedRateAnnual,
    spreadAnnual: investment.spreadAnnual,
    cdiAnnual: rates.cdi.annualPercent,
    selicAnnual: rates.selic.annualPercent,
    inflationAnnual: rates.ipca.annualPercent,
    taxExempt: investment.taxExempt,
    iofApplicable: investment.iofApplicable
  });
  if (!calculated) return null;
  const marketValueInCents = investment.marking === "market" ? investment.marketValueInCents : undefined;
  return {
    ...calculated,
    displayValueInCents: marketValueInCents ?? calculated.netValueInCents,
    valueBasis: marketValueInCents === undefined ? "curva" as const : "mercado" as const
  };
}

export function daysUntil(date?: string, now = new Date()) {
  if (!date) return null;
  const target = new Date(date + (date.length === 10 ? "T23:59:59.999" : ""));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (!Number.isFinite(target.getTime())) return null;
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / DAY_MS));
}
