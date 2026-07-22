export const fixedIncomeTypes = [
  "CDB", "RDB", "LCI", "LCA", "TESOURO_SELIC", "TESOURO_PREFIXADO", "TESOURO_IPCA",
  "DEBENTURE", "DEBENTURE_INCENTIVADA", "CRI", "CRA", "POUPANCA", "FUNDO_DI", "LC", "LF", "OUTRO"
] as const;
export type FixedIncomeType = typeof fixedIncomeTypes[number];

export const fixedIncomeIndexers = ["CDI", "SELIC", "IPCA", "IGPM", "TR", "PREFIXED", "OTHER"] as const;
export type FixedIncomeIndexer = typeof fixedIncomeIndexers[number];

export type FixedIncomeLiquidity = "daily" | "at_maturity" | "after_grace_period" | "custom";
export type FixedIncomeStatus = "active" | "matured" | "redeemed" | "cancelled";
export type FixedIncomeMarking = "curve" | "market";

export type FixedIncomeInvestment = {
  id: string;
  userId: string;
  type: FixedIncomeType;
  name: string;
  broker?: string;
  institution?: string;
  issuerName?: string;
  maskedAccount?: string;
  principalInCents: number;
  applicationDate: string;
  maturityDate?: string;
  liquidityType: FixedIncomeLiquidity;
  gracePeriodDays?: number;
  indexer: FixedIncomeIndexer;
  indexerPercentage?: number;
  fixedRateAnnual?: number;
  spreadAnnual?: number;
  incomeTaxType: "regressive" | "exempt" | "other";
  taxExempt: boolean;
  iofApplicable: boolean;
  fgcCovered: boolean;
  fgcLimitInCents?: number;
  interestFrequency: "at_maturity" | "monthly" | "semiannual" | "annual";
  marking: FixedIncomeMarking;
  marketValueInCents?: number;
  status: FixedIncomeStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReferenceRate = {
  annualPercent?: number;
  status: "available" | "unavailable";
  source: string;
  sourceUrl: string;
  referenceDate?: string;
  consultedAt: string;
  note?: string;
};

export type FixedIncomeReferenceRates = {
  cdi: ReferenceRate;
  selic: ReferenceRate;
  ipca: ReferenceRate;
};

export type FixedIncomeRateMode = "automatic" | "manual";
export type FixedIncomeRateMethod = "percentage" | "spread";
export type FixedIncomeDayCountBasis = 252 | 360 | 365;
export type FixedIncomeContributionTiming = "end" | "beginning";

export type FixedIncomeEvolutionPoint = {
  period: number;
  date: string;
  investedInCents: number;
  contributionInCents: number;
  grossIncomeInCents: number;
  incomeTaxInCents: number;
  iofInCents: number;
  custodyFeeInCents: number;
  fixedFeesInCents: number;
  grossBalanceInCents: number;
  netBalanceInCents: number;
};

export type FixedIncomeCalculationInput = {
  principalInCents: number;
  monthlyContributionInCents?: number;
  startDate: string;
  endDate: string;
  indexer: FixedIncomeIndexer;
  indexerPercentage?: number;
  fixedRateAnnual?: number;
  spreadAnnual?: number;
  cdiAnnual?: number;
  selicAnnual?: number;
  inflationAnnual?: number;
  taxExempt?: boolean;
  iofApplicable?: boolean;
  custodyFeeAnnual?: number;
  brokerageFeeInCents?: number;
  rateMode?: FixedIncomeRateMode;
  manualReferenceAnnual?: number;
  rateMethod?: FixedIncomeRateMethod;
  dayCountBasis?: FixedIncomeDayCountBasis;
  contributionTiming?: FixedIncomeContributionTiming;
  productName?: string;
};

export type FixedIncomeCalculationResult = {
  days: number;
  calculationDays: number;
  investedInCents: number;
  grossValueInCents: number;
  grossIncomeInCents: number;
  incomeTaxRate: number;
  incomeTaxInCents: number;
  iofRate: number;
  iofInCents: number;
  feesInCents: number;
  custodyFeeInCents: number;
  fixedFeesInCents: number;
  netIncomeInCents: number;
  netValueInCents: number;
  grossReturnPercent: number;
  netReturnPercent: number;
  realReturnPercent: number | null;
  effectiveMonthlyPercent: number;
  effectiveAnnualPercent: number;
  annualRateUsed: number;
  referenceAnnualPercent: number | null;
  rateMode: FixedIncomeRateMode;
  rateMethod: FixedIncomeRateMethod;
  dayCountBasis: FixedIncomeDayCountBasis;
  contributionCount: number;
  projection: boolean;
  marking: "curve";
  warnings: string[];
  evolution: FixedIncomeEvolutionPoint[];
};