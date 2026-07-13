export type AssetType = "ACAO" | "FII" | "ETF" | "BDR" | "CRIPTO";
export type RiskLevel = "Baixo" | "MÃ©dio" | "Alto";
export type CurrencyCode = "BRL" | "USD";

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
};

export type PortfolioPosition = {
  id: string;
  ticker: string;
  quantity: number;
  averagePrice: number;
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
