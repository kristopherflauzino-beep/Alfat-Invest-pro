export type AssetType = "ACAO" | "FII" | "ETF" | "BDR" | "CRIPTO";
export type RiskLevel = "Baixo" | "Médio" | "Alto";
export type CurrencyCode = "BRL" | "USD";

export type IncomeEventType = "dividend" | "jcp" | "fii_income" | "amortization" | "capital_return";
export type IncomeEventStatus = "announced" | "paid" | "estimated" | "cancelled";

export type IncomeEvent = {
  id: string;
  ticker: string;
  type: IncomeEventType;
  amountPerUnit: number;
  currency: CurrencyCode;
  exDate?: string;
  recordDate?: string;
  paymentDate?: string;
  status: IncomeEventStatus;
  source: string;
  sourceUrl?: string;
  updatedAt: string;
};

export type AssetIncomeSummary = {
  latestAmountPerUnit?: number;
  latestPaymentDate?: string;
  nextAmountPerUnit?: number;
  nextPaymentDate?: string;
  frequency: "Mensal" | "Bimestral" | "Trimestral" | "Semestral" | "Anual" | "Irregular" | "Sem histórico";
  total12Months: number;
  averageMonthly12Months: number;
  events12Months: number;
  source: string;
  updatedAt: string;
};

export type PricePoint = {
  label: string;
  price: number;
  volume: number;
  dividend?: number;
};

export type AssetMetrics = {
  dividendYield?: number;
  pl?: number;
  pvp?: number;
  eps?: number;
  bookValuePerShare?: number;
  epsDate?: string;
  bookValueDate?: string;
  fundamentalsSource?: string;
  fundamentalsSourceUrl?: string;
  evEbit?: number;
  evEbitda?: number;
  roe?: number;
  roic?: number;
  roa?: number;
  netMargin?: number;
  ebitdaMargin?: number;
  revenue?: number;
  profit?: number;
  cagr?: number;
  debtToEquity?: number;
  netDebtToEbitda?: number;
  freeCashFlow?: number;
  vacancyPhysical?: number;
  vacancyFinancial?: number;
  properties?: number;
  patrimony?: number;
  shareholders?: number;
  marketCap?: number;
  dominance?: number;
  circulatingSupply?: number;
  maxSupply?: number;
  hashRate?: string;
  ath?: number;
  atl?: number;
  volatility?: number;
  drawdown?: number;
  volume24h?: number;
  totalSupply?: number;
  fullyDilutedValuation?: number;
  marketCapRank?: number;
  genesisDate?: string;
  blockTimeMinutes?: number;
  hashingAlgorithm?: string;
  activeAddresses?: number;
  transactions24h?: number;
  tvl?: number;
  protocolRevenue?: number;
  mvrv?: number;
  nvt?: number;
  annualInflation?: number;
  holderConcentration?: number;
  validators?: number;
  developerCommits4Weeks?: number;
  developerContributors?: number;
};

export type Asset = {
  ticker: string;
  name: string;
  type: AssetType;
  market: string;
  sector: string;
  segment: string;
  company?: string;
  manager?: string;
  administrator?: string;
  currency: CurrencyCode;
  price: number;
  changeDay: number;
  changeMonth: number;
  changeYear: number;
  liquidity: number;
  freeFloat?: number;
  metrics: AssetMetrics;
  priceHistory: PricePoint[];
  score: number;
  risk: RiskLevel;
  tags: string[];
  summary: string;
  updatedAt: string;
  source: "local" | "external" | "generated";
  sourceLabel?: string;
  sourceUrl?: string;
  providerTicker?: string;
  marketStatus?: string;
  dataStatus?: string;
  isCached?: boolean;
  lastUpdatedAt?: string;
  consultedAt?: string;
  previousClose?: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  incomeEvents?: IncomeEvent[];
  incomeSummary?: AssetIncomeSummary;
  priceConfidence?: "high" | "medium" | "low" | "insufficient";
  validationMessages?: string[];
};

export type PortfolioPosition = {
  id: string;
  ticker: string;
  quantity: string;
  averagePrice: string;
  assetType?: AssetType;
  broker: string;
  purchaseDate: string;
};

export type PortfolioLine = PortfolioPosition & {
  asset: Asset;
  invested: number;
  currentValue: number;
  profit: number;
  profitability: number;
  estimatedDividendsYear: number;
  estimatedDividendsMonth: number;
  weight: number;
};

export type PortfolioAnalysis = {
  totalInvested: number;
  totalEquity: number;
  totalProfit: number;
  profitability: number;
  projectedDividendsYear: number;
  projectedDividendsMonth: number;
  best?: PortfolioLine;
  worst?: PortfolioLine;
  byType: Array<{ name: string; value: number }>;
  bySector: Array<{ name: string; value: number }>;
  lines: PortfolioLine[];
  alerts: string[];
  aiSummary: string[];
};

export type RadarWeights = {
  dividendYield: number;
  valuation: number;
  quality: number;
  growth: number;
  liquidity: number;
  risk: number;
};
