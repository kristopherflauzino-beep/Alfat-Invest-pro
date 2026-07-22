import Decimal from "decimal.js-light";
import type {
  FixedIncomeCalculationInput,
  FixedIncomeCalculationResult,
  FixedIncomeDayCountBasis,
  FixedIncomeEvolutionPoint,
  FixedIncomeInvestment,
  FixedIncomeReferenceRates
} from "./types";

const DAY_MS = 86_400_000;
const IOF_RATES = [96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0];
const MAX_CONTRIBUTIONS = 1_200;
const MAX_EVOLUTION_POINTS = 600;

type ParsedDate = Date & { __isoDate?: never };

type CalculationLot = {
  principal: Decimal;
  startDate: Date;
  holdingDays: number;
  calculationDays: number;
  gross: Decimal;
  income: Decimal;
  iof: Decimal;
  incomeTax: Decimal;
  custodyFee: Decimal;
};

type Snapshot = {
  invested: Decimal;
  gross: Decimal;
  grossIncome: Decimal;
  incomeTax: Decimal;
  iof: Decimal;
  custodyFee: Decimal;
  fixedFees: Decimal;
  net: Decimal;
  contributionCount: number;
  effectiveIncomeTaxRate: number;
  effectiveIofRate: number;
};

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseIsoDate(value: string): ParsedDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  return date;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcMonthsClamped(date: Date, months: number) {
  const targetMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(date.getUTCDate(), lastDay)));
}

function calendarDaysBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS));
}

function businessDaysBetween(start: Date, end: Date) {
  let days = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function calculationDaysBetween(start: Date, end: Date, basis: FixedIncomeDayCountBasis) {
  return basis === 252 ? businessDaysBetween(start, end) : calendarDaysBetween(start, end);
}

function basisDays(input: FixedIncomeCalculationInput): FixedIncomeDayCountBasis {
  return input.dayCountBasis === 252 || input.dayCountBasis === 360 ? input.dayCountBasis : 365;
}

export function parseBrazilianCurrencyToCents(value: string): number | null {
  const trimmed = value.trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (!trimmed || /[^\d,.-]/.test(trimmed) || trimmed.startsWith("-")) return null;

  const comma = trimmed.lastIndexOf(",");
  const dot = trimmed.lastIndexOf(".");
  let normalized = trimmed;

  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = trimmed.split(thousandsSeparator).join("").replace(decimalSeparator, ".");
  } else if (comma >= 0) {
    const decimalDigits = trimmed.length - comma - 1;
    normalized = decimalDigits <= 2 ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed.replace(/,/g, "");
  } else if (dot >= 0) {
    const thousandsPattern = /^\d{1,3}(\.\d{3})+$/;
    const decimalDigits = trimmed.length - dot - 1;
    normalized = thousandsPattern.test(trimmed) || decimalDigits > 2
      ? trimmed.replace(/\./g, "")
      : trimmed;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  const cents = Math.round(parsed * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}
export function fixedIncomeDays(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end || end <= start) return 0;
  return calendarDaysBetween(start, end);
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

export function referenceAnnualFor(input: FixedIncomeCalculationInput): number | null {
  if (input.indexer === "PREFIXED") return null;
  if (input.rateMode === "manual") return finite(input.manualReferenceAnnual);
  if (input.indexer === "CDI") return finite(input.cdiAnnual);
  if (input.indexer === "SELIC") return finite(input.selicAnnual);
  if (input.indexer === "IPCA") return finite(input.inflationAnnual);
  return finite(input.manualReferenceAnnual);
}

export function annualRateFor(input: FixedIncomeCalculationInput) {
  const fixed = finite(input.fixedRateAnnual) ?? 0;
  if (input.indexer === "PREFIXED") return fixed;

  const reference = referenceAnnualFor(input);
  if (reference === null) return Number.NaN;

  if (input.indexer === "IPCA") {
    return new Decimal(1)
      .plus(new Decimal(reference).dividedBy(100))
      .times(new Decimal(1).plus(new Decimal(fixed).dividedBy(100)))
      .minus(1)
      .times(100)
      .toNumber();
  }

  if (input.rateMethod === "spread") {
    return new Decimal(reference).plus(finite(input.spreadAnnual) ?? 0).toNumber();
  }

  const percentage = finite(input.indexerPercentage) ?? 100;
  return new Decimal(reference).times(percentage).dividedBy(100).toNumber();
}

export function equivalentMonthlyRate(annualPercent: number) {
  if (!Number.isFinite(annualPercent) || annualPercent <= -100) return Number.NaN;
  return new Decimal(1)
    .plus(new Decimal(annualPercent).dividedBy(100))
    .pow(new Decimal(1).dividedBy(12))
    .minus(1)
    .times(100)
    .toNumber();
}

function maxZero(value: Decimal) {
  return value.isNegative() ? new Decimal(0) : value;
}

function sumDecimals(values: Decimal[]) {
  return values.reduce((total, value) => total.plus(value), new Decimal(0));
}

function compound(principal: Decimal, annualPercent: number, calculationDays: number, basis: FixedIncomeDayCountBasis) {
  if (principal.lessThanOrEqualTo(0) || calculationDays <= 0) return principal;
  return principal.times(
    new Decimal(1)
      .plus(new Decimal(annualPercent).dividedBy(100))
      .pow(new Decimal(calculationDays).dividedBy(basis))
  );
}

function buildContributionDates(start: Date, end: Date, timing: FixedIncomeCalculationInput["contributionTiming"]) {
  const dates: Date[] = [];
  let offset = timing === "beginning" ? 0 : 1;
  while (dates.length < MAX_CONTRIBUTIONS) {
    const date = addUtcMonthsClamped(start, offset);
    const outsidePeriod = timing === "beginning" ? date >= end : date > end;
    if (outsidePeriod) break;
    dates.push(date);
    offset += 1;
  }
  return dates;
}

function calculateLot(
  principalInCents: number,
  startDate: Date,
  endDate: Date,
  annualPercent: number,
  basis: FixedIncomeDayCountBasis,
  input: FixedIncomeCalculationInput
): CalculationLot {
  const principal = new Decimal(principalInCents);
  const holdingDays = calendarDaysBetween(startDate, endDate);
  const calculationDays = calculationDaysBetween(startDate, endDate, basis);
  const gross = compound(principal, annualPercent, calculationDays, basis);
  const income = maxZero(gross.minus(principal));
  const iofRate = input.iofApplicable === false ? 0 : regressiveIofRate(holdingDays);
  const iof = income.times(iofRate).dividedBy(100);
  const taxableIncome = maxZero(income.minus(iof));
  const incomeTaxRate = input.taxExempt ? 0 : regressiveIncomeTaxRate(holdingDays);
  const incomeTax = taxableIncome.times(incomeTaxRate).dividedBy(100);
  const custodyRate = Math.max(0, finite(input.custodyFeeAnnual) ?? 0);
  const custodyFee = gross.times(custodyRate).dividedBy(100).times(calculationDays).dividedBy(basis);
  return { principal, startDate, holdingDays, calculationDays, gross, income, iof, incomeTax, custodyFee };
}

function calculateSnapshot(input: FixedIncomeCalculationInput, endDate: Date, annualPercent: number, basis: FixedIncomeDayCountBasis): Snapshot | null {
  const startDate = parseIsoDate(input.startDate);
  if (!startDate || endDate < startDate) return null;

  const monthlyContribution = Math.max(0, Math.round(finite(input.monthlyContributionInCents) ?? 0));
  const lots: CalculationLot[] = [
    calculateLot(input.principalInCents, startDate, endDate, annualPercent, basis, input)
  ];

  if (monthlyContribution > 0) {
    for (const contributionDate of buildContributionDates(startDate, endDate, input.contributionTiming)) {
      lots.push(calculateLot(monthlyContribution, contributionDate, endDate, annualPercent, basis, input));
    }
  }

  const invested = sumDecimals(lots.map((lot) => lot.principal));
  const gross = sumDecimals(lots.map((lot) => lot.gross));
  const grossIncome = sumDecimals(lots.map((lot) => lot.income));
  const incomeTax = sumDecimals(lots.map((lot) => lot.incomeTax));
  const iof = sumDecimals(lots.map((lot) => lot.iof));
  const custodyFee = sumDecimals(lots.map((lot) => lot.custodyFee));
  const fixedFees = new Decimal(Math.max(0, Math.round(finite(input.brokerageFeeInCents) ?? 0)));
  const net = maxZero(gross.minus(incomeTax).minus(iof).minus(custodyFee).minus(fixedFees));
  const taxableAfterIof = maxZero(grossIncome.minus(iof));

  return {
    invested,
    gross,
    grossIncome,
    incomeTax,
    iof,
    custodyFee,
    fixedFees,
    net,
    contributionCount: Math.max(0, lots.length - 1),
    effectiveIncomeTaxRate: taxableAfterIof.greaterThan(0) ? incomeTax.dividedBy(taxableAfterIof).times(100).toNumber() : 0,
    effectiveIofRate: grossIncome.greaterThan(0) ? iof.dividedBy(grossIncome).times(100).toNumber() : 0
  };
}

function roundedCents(value: Decimal) {
  return value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

function evolutionFor(
  input: FixedIncomeCalculationInput,
  annualPercent: number,
  basis: FixedIncomeDayCountBasis,
  finalSnapshot: Snapshot
): FixedIncomeEvolutionPoint[] {
  const start = parseIsoDate(input.startDate);
  const end = parseIsoDate(input.endDate);
  if (!start || !end) return [];

  const totalMonths = Math.max(
    1,
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth()
  );
  const interval = Math.max(1, Math.ceil(totalMonths / MAX_EVOLUTION_POINTS));
  const monthlyContribution = Math.max(0, Math.round(finite(input.monthlyContributionInCents) ?? 0));
  const points: FixedIncomeEvolutionPoint[] = [{
    period: 0,
    date: isoDate(start),
    investedInCents: input.principalInCents + (input.contributionTiming === "beginning" ? monthlyContribution : 0),
    contributionInCents: input.contributionTiming === "beginning" ? monthlyContribution : 0,
    grossIncomeInCents: 0,
    incomeTaxInCents: 0,
    iofInCents: 0,
    custodyFeeInCents: 0,
    fixedFeesInCents: Math.max(0, Math.round(finite(input.brokerageFeeInCents) ?? 0)),
    grossBalanceInCents: input.principalInCents + (input.contributionTiming === "beginning" ? monthlyContribution : 0),
    netBalanceInCents: Math.max(0, input.principalInCents + (input.contributionTiming === "beginning" ? monthlyContribution : 0) - Math.max(0, Math.round(finite(input.brokerageFeeInCents) ?? 0)))
  }];

  for (let month = interval; month <= totalMonths; month += interval) {
    const checkpoint = addUtcMonthsClamped(start, month);
    if (checkpoint >= end) break;
    const snapshot = calculateSnapshot(input, checkpoint, annualPercent, basis);
    if (snapshot) points.push(pointFromSnapshot(points.length, checkpoint, monthlyContribution, snapshot));
  }

  points.push(pointFromSnapshot(points.length, end, monthlyContribution, finalSnapshot));
  return points;
}

function pointFromSnapshot(period: number, date: Date, contributionInCents: number, snapshot: Snapshot): FixedIncomeEvolutionPoint {
  return {
    period,
    date: isoDate(date),
    investedInCents: roundedCents(snapshot.invested),
    contributionInCents,
    grossIncomeInCents: roundedCents(snapshot.grossIncome),
    incomeTaxInCents: roundedCents(snapshot.incomeTax),
    iofInCents: roundedCents(snapshot.iof),
    custodyFeeInCents: roundedCents(snapshot.custodyFee),
    fixedFeesInCents: roundedCents(snapshot.fixedFees),
    grossBalanceInCents: roundedCents(snapshot.gross),
    netBalanceInCents: roundedCents(snapshot.net)
  };
}

export function calculateFixedIncome(input: FixedIncomeCalculationInput): FixedIncomeCalculationResult | null {
  const startDate = parseIsoDate(input.startDate);
  const endDate = parseIsoDate(input.endDate);
  if (!startDate || !endDate || endDate <= startDate) return null;
  if (!Number.isSafeInteger(input.principalInCents) || input.principalInCents <= 0) return null;
  if (input.monthlyContributionInCents !== undefined && (!Number.isSafeInteger(input.monthlyContributionInCents) || input.monthlyContributionInCents < 0)) return null;

  const annualRateUsed = annualRateFor(input);
  if (!Number.isFinite(annualRateUsed) || annualRateUsed <= -100 || annualRateUsed > 1_000) return null;

  const basis = basisDays(input);
  const days = calendarDaysBetween(startDate, endDate);
  const calculationDays = calculationDaysBetween(startDate, endDate, basis);

  const snapshot = calculateSnapshot(input, endDate, annualRateUsed, basis);
  if (!snapshot) return null;

  const fees = snapshot.custodyFee.plus(snapshot.fixedFees);
  const netIncome = snapshot.net.minus(snapshot.invested);
  const grossReturn = snapshot.invested.greaterThan(0)
    ? snapshot.grossIncome.dividedBy(snapshot.invested).times(100)
    : new Decimal(0);
  const netReturn = snapshot.invested.greaterThan(0)
    ? netIncome.dividedBy(snapshot.invested).times(100)
    : new Decimal(0);
  const monthlyRate = equivalentMonthlyRate(annualRateUsed);
  const inflationReference = input.indexer === "IPCA"
    ? referenceAnnualFor(input)
    : finite(input.inflationAnnual);
  const realReturn = inflationReference !== null && inflationReference > -100
    ? new Decimal(1)
        .plus(new Decimal(annualRateUsed).dividedBy(100))
        .dividedBy(new Decimal(1).plus(new Decimal(inflationReference).dividedBy(100)))
        .minus(1)
        .times(100)
    : null;

  const warnings = [
    "Resultado estimado pela marcação na curva; não representa garantia de rentabilidade ou de resgate antecipado.",
    `Capitalização composta com base de ${basis} ${basis === 252 ? "dias úteis" : "dias"}.`
  ];
  if (input.indexer !== "PREFIXED") warnings.push("A taxa de referência é uma premissa de cenário e pode mudar durante o período.");
  if (input.rateMode === "manual" && input.indexer !== "PREFIXED") warnings.push("Taxa de referência informada manualmente pelo usuário.");
  if (days < 30 && input.iofApplicable !== false) warnings.push("Resgate antes de 30 dias sujeito a IOF regressivo sobre o rendimento.");
  if (input.taxExempt) warnings.push("Isenção de IR aplicada conforme a configuração informada; confirme a elegibilidade do produto.");
  if ((input.monthlyContributionInCents ?? 0) > 0) warnings.push("IR e IOF foram calculados separadamente para cada aporte, conforme o prazo de permanência.");

  const rateMode = input.rateMode ?? "automatic";
  const rateMethod = input.rateMethod ?? "percentage";

  return {
    days,
    calculationDays,
    investedInCents: roundedCents(snapshot.invested),
    grossValueInCents: roundedCents(snapshot.gross),
    grossIncomeInCents: roundedCents(snapshot.grossIncome),
    incomeTaxRate: Number(snapshot.effectiveIncomeTaxRate.toFixed(4)),
    incomeTaxInCents: roundedCents(snapshot.incomeTax),
    iofRate: Number(snapshot.effectiveIofRate.toFixed(4)),
    iofInCents: roundedCents(snapshot.iof),
    feesInCents: roundedCents(fees),
    custodyFeeInCents: roundedCents(snapshot.custodyFee),
    fixedFeesInCents: roundedCents(snapshot.fixedFees),
    netIncomeInCents: roundedCents(netIncome),
    netValueInCents: roundedCents(snapshot.net),
    grossReturnPercent: grossReturn.toDecimalPlaces(4).toNumber(),
    netReturnPercent: netReturn.toDecimalPlaces(4).toNumber(),
    realReturnPercent: realReturn?.toDecimalPlaces(4).toNumber() ?? null,
    effectiveMonthlyPercent: Number(monthlyRate.toFixed(4)),
    effectiveAnnualPercent: Number(annualRateUsed.toFixed(4)),
    annualRateUsed: Number(annualRateUsed.toFixed(4)),
    referenceAnnualPercent: referenceAnnualFor(input),
    rateMode,
    rateMethod,
    dayCountBasis: basis,
    contributionCount: snapshot.contributionCount,
    projection: true,
    marking: "curve",
    warnings,
    evolution: evolutionFor(input, annualRateUsed, basis, snapshot)
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
    iofApplicable: investment.iofApplicable,
    rateMode: "automatic",
    rateMethod: investment.spreadAnnual ? "spread" : "percentage",
    dayCountBasis: 365
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
  const target = parseIsoDate(date);
  if (!target) return null;
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / DAY_MS));
}