import type { Asset, AssetMetrics, AssetType, CurrencyCode, PricePoint, RadarWeights, RiskLevel } from "@/lib/types";

const today = new Date().toISOString();

export const typeLabels: Record<AssetType, string> = {
  ACAO: "Ação",
  FII: "FII",
  ETF: "ETF",
  BDR: "BDR",
  CRIPTO: "Cripto"
};

function hashText(text: string) {
  return text.split("").reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 11), 137);
}

function seededNoise(seed: number, index: number) {
  const x = Math.sin(seed * 91.7 + index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function normalizeTicker(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
}

export function inferAssetType(ticker: string): AssetType {
  const clean = normalizeTicker(ticker);
  if (["BTC", "BTCBRL", "ETH", "ETHBRL", "SOL", "SOLBRL", "BNB", "BNBBRL", "ADA", "XRP", "AVAX", "DOGE"].includes(clean)) return "CRIPTO";
  if (["BOVA11", "IVVB11", "SMAL11", "DIVO11", "HASH11", "GOLD11", "NASD11", "SPXI11", "XFIX11"].includes(clean)) return "ETF";
  if (clean.endsWith("34") || clean.endsWith("35")) return "BDR";
  if (clean.endsWith("11")) return "FII";
  return "ACAO";
}

export function isTickerLike(value: string) {
  const clean = normalizeTicker(value);
  return clean.length >= 3 && clean.length <= 8 && /^[A-Z0-9]+$/.test(clean);
}

export function generateHistory(ticker: string, startPrice: number, trend = 0.0018, volatility = 0.024, points = 260): PricePoint[] {
  const seed = hashText(ticker);
  let price = startPrice;
  return Array.from({ length: points }, (_, index) => {
    const n1 = seededNoise(seed, index) - 0.5;
    const n2 = seededNoise(seed + 71, index) - 0.5;
    const shock = n1 * volatility + n2 * volatility * 0.45;
    price = Math.max(0.5, price * (1 + trend + shock));
    const volumeBase = Math.max(25000, seed * 1150);
    return {
      label: index === points - 1 ? "Hoje" : `D-${points - index - 1}`,
      price: Number(price.toFixed(2)),
      volume: Math.round(volumeBase * (0.55 + seededNoise(seed + 19, index)))
    };
  });
}

function latestPrice(history: PricePoint[]) {
  return history.at(-1)?.price ?? 0;
}

function performance(history: PricePoint[], days: number) {
  const last = history.at(-1)?.price ?? 0;
  const first = history[Math.max(0, history.length - days)]?.price ?? history[0]?.price ?? last;
  if (!first) return 0;
  return Number((((last / first) - 1) * 100).toFixed(2));
}

function riskFrom(metrics: AssetMetrics, type: AssetType): RiskLevel {
  const volatility = metrics.volatility ?? 18;
  const debt = metrics.debtToEquity ?? 0.8;
  const dy = metrics.dividendYield ?? 0;
  if (type === "CRIPTO" || volatility > 48 || debt > 3 || dy > 18) return "Alto";
  if (volatility > 28 || debt > 1.7) return "Médio";
  return "Baixo";
}

export function calculateAssetScore(asset: Pick<Asset, "type" | "metrics" | "liquidity" | "changeYear">, custom?: RadarWeights) {
  const weights = custom ?? {
    dividendYield: 22,
    valuation: 22,
    quality: 22,
    growth: 14,
    liquidity: 10,
    risk: 10
  };
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const m = asset.metrics;
  const dividend = Math.min(100, Math.max(0, ((m.dividendYield ?? 0) / 12) * 100));
  const pvpScore = m.pvp ? Math.max(0, Math.min(100, 120 - Math.abs(m.pvp - 1) * 55)) : 55;
  const plScore = m.pl ? Math.max(0, Math.min(100, 115 - Math.abs(m.pl - 9) * 5.5)) : 55;
  const valuation = asset.type === "FII" ? pvpScore : (pvpScore * 0.45 + plScore * 0.55);
  const roe = Math.min(100, Math.max(0, ((m.roe ?? 0) / 24) * 100));
  const roic = Math.min(100, Math.max(0, ((m.roic ?? m.roe ?? 0) / 20) * 100));
  const margin = Math.min(100, Math.max(0, ((m.netMargin ?? m.ebitdaMargin ?? 15) / 35) * 100));
  const quality = (roe * 0.42 + roic * 0.36 + margin * 0.22);
  const growth = Math.max(0, Math.min(100, 50 + (m.cagr ?? asset.changeYear ?? 0) * 2.2));
  const liquidity = Math.max(0, Math.min(100, Math.log10(Math.max(asset.liquidity, 1)) * 13));
  const vol = m.volatility ?? 24;
  const drawdown = Math.abs(m.drawdown ?? 12);
  const risk = Math.max(0, 100 - vol * 1.25 - drawdown * 0.8 - (m.debtToEquity ?? 0.8) * 5);
  const score = (
    dividend * weights.dividendYield +
    valuation * weights.valuation +
    quality * weights.quality +
    growth * weights.growth +
    liquidity * weights.liquidity +
    risk * weights.risk
  ) / totalWeight;
  return Math.round(Math.max(0, Math.min(100, score)));
}

type Seed = {
  ticker: string;
  name: string;
  type: AssetType;
  sector: string;
  segment: string;
  price: number;
  trend: number;
  volatility: number;
  liquidity: number;
  metrics: AssetMetrics;
  company?: string;
  manager?: string;
  administrator?: string;
  tags?: string[];
  currency?: CurrencyCode;
};

const seeds: Seed[] = [
  { ticker: "PETR4", name: "Petrobras PN", type: "ACAO", sector: "Petróleo e Gás", segment: "Exploração e refino", price: 36.8, trend: 0.0012, volatility: 0.026, liquidity: 1850000000, metrics: { dividendYield: 11.2, pl: 5.1, pvp: 1.32, evEbitda: 2.8, roe: 28.4, roic: 18.1, roa: 9.4, netMargin: 21.1, ebitdaMargin: 46, revenue: 510000000000, profit: 115000000000, cagr: 8.2, debtToEquity: 0.76, freeCashFlow: 106000000000, volatility: 31, drawdown: 22 }, company: "Petróleo Brasileiro S.A.", tags: ["dividendos", "valor"] },
  { ticker: "VALE3", name: "Vale ON", type: "ACAO", sector: "Materiais Básicos", segment: "Mineração", price: 62.4, trend: -0.0002, volatility: 0.023, liquidity: 1450000000, metrics: { dividendYield: 7.1, pl: 6.4, pvp: 1.5, evEbitda: 3.7, roe: 24.2, roic: 16.2, roa: 10.5, netMargin: 22.4, ebitdaMargin: 43, revenue: 208000000000, profit: 47000000000, cagr: 4.8, debtToEquity: 0.62, freeCashFlow: 39000000000, volatility: 28, drawdown: 25 }, company: "Vale S.A.", tags: ["exportadora", "commodities"] },
  { ticker: "BBAS3", name: "Banco do Brasil ON", type: "ACAO", sector: "Financeiro", segment: "Bancos", price: 27.9, trend: 0.0019, volatility: 0.018, liquidity: 690000000, metrics: { dividendYield: 9.4, pl: 4.7, pvp: 0.95, roe: 22.6, roic: 15.2, roa: 1.4, netMargin: 18, revenue: 136000000000, profit: 36000000000, cagr: 12, debtToEquity: 1.1, freeCashFlow: 21000000000, volatility: 24, drawdown: 17 }, company: "Banco do Brasil S.A.", tags: ["dividendos", "financeiro"] },
  { ticker: "ITSA4", name: "Itaúsa PN", type: "ACAO", sector: "Financeiro", segment: "Holding", price: 10.1, trend: 0.001, volatility: 0.015, liquidity: 270000000, metrics: { dividendYield: 7.3, pl: 7.9, pvp: 1.18, roe: 15.7, roic: 13.1, roa: 6.2, netMargin: 52, cagr: 7.4, debtToEquity: 0.38, volatility: 20, drawdown: 13 }, company: "Itaúsa S.A.", tags: ["holding", "dividendos"] },
  { ticker: "WEGE3", name: "WEG ON", type: "ACAO", sector: "Industrial", segment: "Motores e automação", price: 42.5, trend: 0.0023, volatility: 0.019, liquidity: 510000000, metrics: { dividendYield: 1.6, pl: 31.5, pvp: 8.8, evEbitda: 21.4, roe: 30.5, roic: 25, roa: 16, netMargin: 18.6, ebitdaMargin: 23.5, revenue: 33500000000, profit: 6200000000, cagr: 17.5, debtToEquity: 0.22, freeCashFlow: 5200000000, volatility: 22, drawdown: 16 }, company: "WEG S.A.", tags: ["qualidade", "crescimento"] },
  { ticker: "TAEE11", name: "Taesa Unit", type: "ACAO", sector: "Utilidade Pública", segment: "Transmissão de energia", price: 35.2, trend: 0.0009, volatility: 0.011, liquidity: 91000000, metrics: { dividendYield: 10.8, pl: 7.6, pvp: 2.05, roe: 25.1, roic: 13.4, roa: 8.8, netMargin: 48, cagr: 5.1, debtToEquity: 1.25, volatility: 16, drawdown: 9 }, company: "Transmissora Aliança de Energia Elétrica S.A.", tags: ["renda", "defensiva"] },
  { ticker: "EGIE3", name: "Engie Brasil ON", type: "ACAO", sector: "Utilidade Pública", segment: "Energia elétrica", price: 40.2, trend: 0.0008, volatility: 0.012, liquidity: 115000000, metrics: { dividendYield: 6.8, pl: 10.4, pvp: 3.4, roe: 32.2, roic: 16.5, roa: 8.2, netMargin: 30, cagr: 7.3, debtToEquity: 1.55, volatility: 17, drawdown: 11 }, company: "Engie Brasil Energia S.A.", tags: ["qualidade", "defensiva"] },
  { ticker: "RENT3", name: "Localiza ON", type: "ACAO", sector: "Consumo Cíclico", segment: "Aluguel de carros", price: 50.7, trend: 0.0015, volatility: 0.027, liquidity: 420000000, metrics: { dividendYield: 2.1, pl: 20.2, pvp: 2.15, evEbitda: 8.5, roe: 12.8, roic: 9.3, roa: 5.1, netMargin: 12.7, cagr: 14, debtToEquity: 2.05, volatility: 34, drawdown: 31 }, company: "Localiza Rent a Car S.A.", tags: ["crescimento"] },
  { ticker: "ABEV3", name: "Ambev ON", type: "ACAO", sector: "Consumo Não Cíclico", segment: "Bebidas", price: 12.7, trend: 0.0003, volatility: 0.013, liquidity: 320000000, metrics: { dividendYield: 5.2, pl: 14.1, pvp: 2.25, roe: 16.7, roic: 14.6, roa: 10.1, netMargin: 18.2, cagr: 3.1, debtToEquity: 0.11, volatility: 17, drawdown: 14 }, company: "Ambev S.A.", tags: ["defensiva"] },
  { ticker: "B3SA3", name: "B3 ON", type: "ACAO", sector: "Financeiro", segment: "Bolsa e infraestrutura", price: 11.8, trend: 0.0007, volatility: 0.022, liquidity: 420000000, metrics: { dividendYield: 4.8, pl: 15.5, pvp: 3.2, roe: 21.4, roic: 18.9, roa: 10.4, netMargin: 36, cagr: 6.5, debtToEquity: 0.7, volatility: 27, drawdown: 23 }, company: "B3 S.A.", tags: ["qualidade", "financeiro"] },
  { ticker: "PRIO3", name: "PRIO ON", type: "ACAO", sector: "Petróleo e Gás", segment: "Exploração", price: 48.4, trend: 0.0026, volatility: 0.033, liquidity: 710000000, metrics: { dividendYield: 0, pl: 9.9, pvp: 3.1, evEbitda: 5.8, roe: 31.2, roic: 23, roa: 14, netMargin: 34, cagr: 29, debtToEquity: 0.65, volatility: 39, drawdown: 30 }, company: "PRIO S.A.", tags: ["crescimento", "petróleo"] },
  { ticker: "RADL3", name: "Raia Drogasil ON", type: "ACAO", sector: "Saúde", segment: "Farmácias", price: 24.6, trend: 0.0011, volatility: 0.016, liquidity: 230000000, metrics: { dividendYield: 1.3, pl: 35, pvp: 5.8, roe: 17.4, roic: 13.8, roa: 8.1, netMargin: 3.9, cagr: 15, debtToEquity: 0.35, volatility: 21, drawdown: 16 }, company: "Raia Drogasil S.A.", tags: ["saúde", "crescimento"] },

  { ticker: "MXRF11", name: "Maxi Renda FII", type: "FII", sector: "Fundos Imobiliários", segment: "Papel", price: 10.3, trend: 0.0002, volatility: 0.007, liquidity: 64000000, metrics: { dividendYield: 12.4, pvp: 1.01, vacancyPhysical: 0, vacancyFinancial: 0, properties: 0, patrimony: 2800000000, shareholders: 1050000, volatility: 10, drawdown: 6 }, manager: "XP Asset", administrator: "BTG Pactual", tags: ["renda", "papel"] },
  { ticker: "GARE11", name: "Guardian Real Estate FII", type: "FII", sector: "Fundos Imobiliários", segment: "Renda Urbana", price: 9.82, trend: 0.0006, volatility: 0.009, liquidity: 18500000, metrics: { dividendYield: 11.6, pvp: 0.93, vacancyPhysical: 1.8, vacancyFinancial: 0.9, properties: 18, patrimony: 1250000000, shareholders: 185000, volatility: 13, drawdown: 8 }, manager: "Guardian Gestora", administrator: "Banco Daycoval", tags: ["renda urbana", "varejo", "renda"] },
  { ticker: "HGLG11", name: "CSHG Logística FII", type: "FII", sector: "Fundos Imobiliários", segment: "Logística", price: 162.2, trend: 0.0007, volatility: 0.01, liquidity: 52000000, metrics: { dividendYield: 8.6, pvp: 1.05, vacancyPhysical: 3.2, vacancyFinancial: 2.8, properties: 25, patrimony: 5400000000, shareholders: 390000, volatility: 12, drawdown: 8 }, manager: "Credit Suisse Hedging-Griffo", administrator: "Credit Suisse", tags: ["logística", "qualidade"] },
  { ticker: "XPML11", name: "XP Malls FII", type: "FII", sector: "Fundos Imobiliários", segment: "Shopping", price: 115.4, trend: 0.0008, volatility: 0.012, liquidity: 36000000, metrics: { dividendYield: 9.3, pvp: 0.99, vacancyPhysical: 4.1, vacancyFinancial: 3.7, properties: 15, patrimony: 3100000000, shareholders: 312000, volatility: 15, drawdown: 12 }, manager: "XP Asset", administrator: "BTG Pactual", tags: ["shopping", "renda"] },
  { ticker: "KNRI11", name: "Kinea Renda Imobiliária FII", type: "FII", sector: "Fundos Imobiliários", segment: "Híbrido", price: 156.8, trend: 0.0004, volatility: 0.009, liquidity: 41000000, metrics: { dividendYield: 8.1, pvp: 0.96, vacancyPhysical: 5.4, vacancyFinancial: 4.2, properties: 20, patrimony: 4200000000, shareholders: 285000, volatility: 11, drawdown: 8 }, manager: "Kinea", administrator: "Intrag", tags: ["híbrido", "renda"] },
  { ticker: "BTLG11", name: "BTG Pactual Logística FII", type: "FII", sector: "Fundos Imobiliários", segment: "Logística", price: 101.6, trend: 0.0005, volatility: 0.011, liquidity: 29000000, metrics: { dividendYield: 9.1, pvp: 0.98, vacancyPhysical: 2.7, vacancyFinancial: 2.2, properties: 29, patrimony: 3700000000, shareholders: 245000, volatility: 12, drawdown: 7 }, manager: "BTG Pactual", administrator: "BTG Pactual", tags: ["logística"] },
  { ticker: "VISC11", name: "Vinci Shopping Centers FII", type: "FII", sector: "Fundos Imobiliários", segment: "Shopping", price: 106.9, trend: 0.0006, volatility: 0.012, liquidity: 24000000, metrics: { dividendYield: 9.5, pvp: 0.94, vacancyPhysical: 4.8, vacancyFinancial: 3.5, properties: 22, patrimony: 2600000000, shareholders: 225000, volatility: 14, drawdown: 11 }, manager: "Vinci Partners", administrator: "BRL Trust", tags: ["shopping"] },
  { ticker: "KNCR11", name: "Kinea Rendimentos Imobiliários FII", type: "FII", sector: "Fundos Imobiliários", segment: "Papel", price: 102.1, trend: 0.0001, volatility: 0.006, liquidity: 46000000, metrics: { dividendYield: 11.1, pvp: 1.01, vacancyPhysical: 0, vacancyFinancial: 0, properties: 0, patrimony: 7600000000, shareholders: 370000, volatility: 8, drawdown: 5 }, manager: "Kinea", administrator: "Intrag", tags: ["papel", "renda"] },
  { ticker: "CPTS11", name: "Capitânia Securities II FII", type: "FII", sector: "Fundos Imobiliários", segment: "Papel", price: 8.2, trend: 0.0001, volatility: 0.009, liquidity: 16000000, metrics: { dividendYield: 12.8, pvp: 0.91, patrimony: 2200000000, shareholders: 245000, volatility: 15, drawdown: 12 }, manager: "Capitânia", administrator: "BTG Pactual", tags: ["papel", "alto dy"] },
  { ticker: "RBRR11", name: "RBR Rendimentos High Grade FII", type: "FII", sector: "Fundos Imobiliários", segment: "Papel", price: 91.7, trend: 0.0002, volatility: 0.008, liquidity: 13500000, metrics: { dividendYield: 11.7, pvp: 0.96, patrimony: 1550000000, shareholders: 135000, volatility: 13, drawdown: 9 }, manager: "RBR Asset", administrator: "BRL Trust", tags: ["papel"] },
  { ticker: "RZTR11", name: "Riza Terrax FII", type: "FII", sector: "Fundos Imobiliários", segment: "Agro", price: 87.4, trend: 0.0003, volatility: 0.013, liquidity: 9500000, metrics: { dividendYield: 11.9, pvp: 0.86, vacancyPhysical: 0, vacancyFinancial: 0, properties: 72, patrimony: 1350000000, shareholders: 85000, volatility: 18, drawdown: 15 }, manager: "Riza Asset", administrator: "Banco Genial", tags: ["agro", "renda"] },
  { ticker: "TRXF11", name: "TRX Real Estate FII", type: "FII", sector: "Fundos Imobiliários", segment: "Renda Urbana", price: 104.8, trend: 0.0008, volatility: 0.011, liquidity: 14500000, metrics: { dividendYield: 10.2, pvp: 1.03, vacancyPhysical: 0.4, vacancyFinancial: 0.1, properties: 54, patrimony: 2100000000, shareholders: 150000, volatility: 14, drawdown: 10 }, manager: "TRX", administrator: "BRL Trust", tags: ["renda urbana"] },
  { ticker: "ALZR11", name: "Alianza Trust Renda Imobiliária FII", type: "FII", sector: "Fundos Imobiliários", segment: "Renda Urbana", price: 109.3, trend: 0.0005, volatility: 0.009, liquidity: 12500000, metrics: { dividendYield: 8.4, pvp: 1.0, vacancyPhysical: 0.8, vacancyFinancial: 0.4, properties: 21, patrimony: 1200000000, shareholders: 115000, volatility: 12, drawdown: 7 }, manager: "Alianza", administrator: "BTG Pactual", tags: ["renda urbana"] },
  { ticker: "HGRU11", name: "CSHG Renda Urbana FII", type: "FII", sector: "Fundos Imobiliários", segment: "Renda Urbana", price: 123.7, trend: 0.0005, volatility: 0.009, liquidity: 26500000, metrics: { dividendYield: 8.9, pvp: 1.02, vacancyPhysical: 1.1, vacancyFinancial: 0.7, properties: 28, patrimony: 2700000000, shareholders: 225000, volatility: 12, drawdown: 7 }, manager: "Credit Suisse Hedging-Griffo", administrator: "Credit Suisse", tags: ["renda urbana"] },
  { ticker: "MALL11", name: "Malls Brasil Plural FII", type: "FII", sector: "Fundos Imobiliários", segment: "Shopping", price: 112.1, trend: 0.0004, volatility: 0.012, liquidity: 9400000, metrics: { dividendYield: 8.7, pvp: 0.92, vacancyPhysical: 4.6, vacancyFinancial: 3.9, properties: 9, patrimony: 980000000, shareholders: 87000, volatility: 15, drawdown: 12 }, manager: "Genial", administrator: "Banco Genial", tags: ["shopping"] },
  { ticker: "PVBI11", name: "VBI Prime Properties FII", type: "FII", sector: "Fundos Imobiliários", segment: "Lajes Corporativas", price: 79.6, trend: 0.0001, volatility: 0.014, liquidity: 9900000, metrics: { dividendYield: 9.0, pvp: 0.82, vacancyPhysical: 7.8, vacancyFinancial: 6.9, properties: 5, patrimony: 1500000000, shareholders: 75000, volatility: 18, drawdown: 17 }, manager: "VBI Real Estate", administrator: "BTG Pactual", tags: ["lajes", "desconto"] },
  { ticker: "HGRE11", name: "CSHG Real Estate FII", type: "FII", sector: "Fundos Imobiliários", segment: "Lajes Corporativas", price: 117.6, trend: -0.0001, volatility: 0.015, liquidity: 9800000, metrics: { dividendYield: 8.8, pvp: 0.78, vacancyPhysical: 15.2, vacancyFinancial: 11.1, properties: 17, patrimony: 1800000000, shareholders: 92000, volatility: 19, drawdown: 18 }, manager: "Credit Suisse Hedging-Griffo", administrator: "Credit Suisse", tags: ["lajes", "risco"] },
  { ticker: "XPLG11", name: "XP Log FII", type: "FII", sector: "Fundos Imobiliários", segment: "Logística", price: 102.8, trend: 0.0004, volatility: 0.011, liquidity: 21000000, metrics: { dividendYield: 8.5, pvp: 0.91, vacancyPhysical: 4.9, vacancyFinancial: 3.7, properties: 19, patrimony: 3100000000, shareholders: 170000, volatility: 14, drawdown: 11 }, manager: "XP Asset", administrator: "BTG Pactual", tags: ["logística"] },
  { ticker: "VGIR11", name: "Valora RE III FII", type: "FII", sector: "Fundos Imobiliários", segment: "Papel", price: 9.6, trend: 0.0001, volatility: 0.008, liquidity: 7600000, metrics: { dividendYield: 12.2, pvp: 0.98, patrimony: 1100000000, shareholders: 118000, volatility: 14, drawdown: 9 }, manager: "Valora", administrator: "BTG Pactual", tags: ["papel"] },
  { ticker: "KNSC11", name: "Kinea Securities FII", type: "FII", sector: "Fundos Imobiliários", segment: "Papel", price: 9.1, trend: 0.0002, volatility: 0.008, liquidity: 9200000, metrics: { dividendYield: 12.0, pvp: 0.97, patrimony: 1250000000, shareholders: 142000, volatility: 13, drawdown: 8 }, manager: "Kinea", administrator: "Intrag", tags: ["papel"] },

  { ticker: "BOVA11", name: "iShares Ibovespa ETF", type: "ETF", sector: "Índices", segment: "Ibovespa", price: 125.4, trend: 0.0007, volatility: 0.014, liquidity: 280000000, metrics: { dividendYield: 2.1, pvp: 1, volatility: 18, drawdown: 14, cagr: 8 }, manager: "BlackRock", tags: ["índice", "brasil"] },
  { ticker: "IVVB11", name: "iShares S&P 500 ETF", type: "ETF", sector: "Índices", segment: "S&P 500", price: 345.5, trend: 0.0015, volatility: 0.015, liquidity: 165000000, metrics: { dividendYield: 1.2, pvp: 1, volatility: 20, drawdown: 16, cagr: 13 }, manager: "BlackRock", tags: ["exterior", "dólar"] },
  { ticker: "SMAL11", name: "iShares Small Cap ETF", type: "ETF", sector: "Índices", segment: "Small Caps", price: 103.8, trend: 0.0005, volatility: 0.021, liquidity: 38000000, metrics: { dividendYield: 1.7, pvp: 1, volatility: 28, drawdown: 24, cagr: 7 }, manager: "BlackRock", tags: ["small caps"] },
  { ticker: "HASH11", name: "Hashdex Nasdaq Crypto ETF", type: "ETF", sector: "Índices", segment: "Cripto ETF", price: 62.4, trend: 0.0024, volatility: 0.035, liquidity: 48000000, metrics: { dividendYield: 0, pvp: 1, volatility: 49, drawdown: 42, cagr: 24 }, manager: "Hashdex", tags: ["cripto", "volátil"] },

  { ticker: "AAPL34", name: "Apple BDR", type: "BDR", sector: "Tecnologia", segment: "Hardware e serviços", price: 53.6, trend: 0.0014, volatility: 0.018, liquidity: 35000000, metrics: { dividendYield: 0.6, pl: 28, pvp: 34, roe: 154, roic: 48, netMargin: 26, cagr: 9, debtToEquity: 1.4, volatility: 25, drawdown: 18, marketCap: 3000000000000 }, company: "Apple Inc.", tags: ["tecnologia", "eua"] },
  { ticker: "MSFT34", name: "Microsoft BDR", type: "BDR", sector: "Tecnologia", segment: "Software e nuvem", price: 94.7, trend: 0.0018, volatility: 0.017, liquidity: 29000000, metrics: { dividendYield: 0.8, pl: 34, pvp: 12, roe: 38, roic: 29, netMargin: 35, cagr: 15, debtToEquity: 0.35, volatility: 23, drawdown: 16, marketCap: 3100000000000 }, company: "Microsoft Corporation", tags: ["ia", "nuvem"] },
  { ticker: "GOGL34", name: "Alphabet BDR", type: "BDR", sector: "Tecnologia", segment: "Publicidade e IA", price: 72.8, trend: 0.0016, volatility: 0.019, liquidity: 20500000, metrics: { dividendYield: 0.4, pl: 25, pvp: 6.5, roe: 29, roic: 24, netMargin: 27, cagr: 13, debtToEquity: 0.1, volatility: 26, drawdown: 19, marketCap: 2300000000000 }, company: "Alphabet Inc.", tags: ["ia", "publicidade"] },

  { ticker: "BTC", name: "Bitcoin", type: "CRIPTO", sector: "Criptomoedas", segment: "Reserva digital", price: 350000, trend: 0.0025, volatility: 0.035, liquidity: 2500000000, metrics: { marketCap: 6800000000000, dominance: 52, circulatingSupply: 19600000, maxSupply: 21000000, hashRate: "650 EH/s", ath: 420000, atl: 0.05, volatility: 56, drawdown: 48, cagr: 38 }, currency: "BRL", tags: ["cripto", "reserva"] },
  { ticker: "ETH", name: "Ethereum", type: "CRIPTO", sector: "Criptomoedas", segment: "Smart contracts", price: 18500, trend: 0.0021, volatility: 0.039, liquidity: 1100000000, metrics: { marketCap: 2200000000000, dominance: 18, circulatingSupply: 120000000, maxSupply: undefined, ath: 28000, atl: 2.5, volatility: 62, drawdown: 55, cagr: 33 }, currency: "BRL", tags: ["cripto", "smart contracts"] },
  { ticker: "SOL", name: "Solana", type: "CRIPTO", sector: "Criptomoedas", segment: "Smart contracts", price: 780, trend: 0.0028, volatility: 0.049, liquidity: 420000000, metrics: { marketCap: 360000000000, dominance: 3.1, circulatingSupply: 465000000, ath: 1500, atl: 2.1, volatility: 72, drawdown: 64, cagr: 41 }, currency: "BRL", tags: ["cripto", "alta volatilidade"] },
  { ticker: "BNB", name: "BNB", type: "CRIPTO", sector: "Criptomoedas", segment: "Exchange token", price: 3300, trend: 0.0018, volatility: 0.033, liquidity: 320000000, metrics: { marketCap: 490000000000, dominance: 3.7, circulatingSupply: 149000000, maxSupply: 200000000, ath: 4100, atl: 0.6, volatility: 51, drawdown: 46, cagr: 25 }, currency: "BRL", tags: ["cripto"] },
  { ticker: "XRP", name: "XRP", type: "CRIPTO", sector: "Criptomoedas", segment: "Pagamentos", price: 3, trend: 0.001, volatility: 0.04, liquidity: 1, metrics: {}, currency: "BRL", tags: ["pagamentos"] },
  { ticker: "ADA", name: "Cardano", type: "CRIPTO", sector: "Criptomoedas", segment: "Layer 1", price: 2, trend: 0.001, volatility: 0.04, liquidity: 1, metrics: {}, currency: "BRL", tags: ["layer 1"] },
  { ticker: "AVAX", name: "Avalanche", type: "CRIPTO", sector: "Criptomoedas", segment: "Layer 1", price: 100, trend: 0.001, volatility: 0.04, liquidity: 1, metrics: {}, currency: "BRL", tags: ["layer 1"] },
  { ticker: "LINK", name: "Chainlink", type: "CRIPTO", sector: "Criptomoedas", segment: "Oraculos", price: 80, trend: 0.001, volatility: 0.04, liquidity: 1, metrics: {}, currency: "BRL", tags: ["oraculo", "infraestrutura"] },
  { ticker: "POL", name: "Polygon Ecosystem Token", type: "CRIPTO", sector: "Criptomoedas", segment: "Layer 2", price: 2, trend: 0.001, volatility: 0.04, liquidity: 1, metrics: {}, currency: "BRL", tags: ["layer 2"] },
  { ticker: "UNI", name: "Uniswap", type: "CRIPTO", sector: "Criptomoedas", segment: "DeFi", price: 40, trend: 0.001, volatility: 0.04, liquidity: 1, metrics: {}, currency: "BRL", tags: ["defi"] },
  { ticker: "AAVE", name: "Aave", type: "CRIPTO", sector: "Criptomoedas", segment: "DeFi", price: 900, trend: 0.001, volatility: 0.04, liquidity: 1, metrics: {}, currency: "BRL", tags: ["defi", "credito"] },
  { ticker: "USDC", name: "USDC", type: "CRIPTO", sector: "Criptomoedas", segment: "Stablecoin", price: 5, trend: 0, volatility: 0.005, liquidity: 1, metrics: {}, currency: "BRL", tags: ["stablecoin"] },
  { ticker: "USDT", name: "Tether", type: "CRIPTO", sector: "Criptomoedas", segment: "Stablecoin", price: 5, trend: 0, volatility: 0.005, liquidity: 1, metrics: {}, currency: "BRL", tags: ["stablecoin"] },
  { ticker: "DOGE", name: "Dogecoin", type: "CRIPTO", sector: "Criptomoedas", segment: "Memecoin", price: 1, trend: 0.001, volatility: 0.06, liquidity: 1, metrics: {}, currency: "BRL", tags: ["memecoin"] },
  { ticker: "SHIB", name: "Shiba Inu", type: "CRIPTO", sector: "Criptomoedas", segment: "Memecoin", price: 0.0001, trend: 0.001, volatility: 0.07, liquidity: 1, metrics: {}, currency: "BRL", tags: ["memecoin"] },
];

function buildAsset(seed: Seed): Asset {
  const history = generateHistory(seed.ticker, seed.price * 0.82, seed.trend, seed.volatility);
  const price = latestPrice(history);
  const metrics = { ...seed.metrics };
  const base: Asset = {
    ticker: seed.ticker,
    name: seed.name,
    type: seed.type,
    market: seed.type === "CRIPTO" ? "Cripto" : "B3",
    sector: seed.sector,
    segment: seed.segment,
    company: seed.company,
    manager: seed.manager,
    administrator: seed.administrator,
    currency: seed.currency ?? "BRL",
    price,
    changeDay: performance(history, 2),
    changeMonth: performance(history, 22),
    changeYear: performance(history, 252),
    liquidity: seed.liquidity,
    freeFloat: seed.type === "ACAO" ? 42 + (hashText(seed.ticker) % 45) : undefined,
    metrics,
    priceHistory: history,
    score: 0,
    risk: "Médio",
    tags: seed.tags ?? [],
    summary: "",
    updatedAt: today,
    source: "local"
  };
  base.score = calculateAssetScore(base);
  base.risk = riskFrom(metrics, seed.type);
  base.summary = makeSummary(base);
  return base;
}

export const localAssets: Asset[] = seeds.map(buildAsset);

export function createGeneratedAsset(tickerInput: string): Asset {
  const ticker = normalizeTicker(tickerInput);
  const type = inferAssetType(ticker);
  const seed = hashText(ticker);
  const basePrice = type === "CRIPTO" ? 40 + (seed % 90000) : ticker.endsWith("11") ? 8 + (seed % 140) : 6 + (seed % 85);
  const sectorByType: Record<AssetType, string> = {
    ACAO: "Ações Brasileiras",
    FII: "Fundos Imobiliários",
    ETF: "Índices",
    BDR: "Exterior",
    CRIPTO: "Criptomoedas"
  };
  const segmentByType: Record<AssetType, string> = {
    ACAO: "Empresa listada",
    FII: "FII consultado",
    ETF: "Fundo de índice",
    BDR: "BDR",
    CRIPTO: "Criptoativo"
  };
  const metrics: AssetMetrics = type === "FII"
    ? { dividendYield: 8 + (seed % 60) / 10, pvp: Number((0.78 + (seed % 55) / 100).toFixed(2)), vacancyPhysical: seed % 14, vacancyFinancial: seed % 10, patrimony: 350000000 + seed * 95000, shareholders: 25000 + seed % 250000, properties: 3 + seed % 38, volatility: 10 + seed % 14, drawdown: 5 + seed % 12 }
    : type === "CRIPTO"
      ? { marketCap: 1000000000 + seed * 1000000, dominance: (seed % 9) + 0.1, circulatingSupply: 1000000 + seed * 2000, ath: basePrice * 1.75, atl: basePrice * 0.18, volatility: 45 + seed % 35, drawdown: 32 + seed % 40, cagr: 15 + seed % 30 }
      : { dividendYield: (seed % 95) / 10, pl: 4 + (seed % 320) / 10, pvp: Number((0.55 + (seed % 70) / 20).toFixed(2)), roe: 5 + seed % 28, roic: 4 + seed % 22, roa: 2 + seed % 14, netMargin: 4 + seed % 33, cagr: -3 + seed % 23, debtToEquity: Number(((seed % 240) / 100).toFixed(2)), volatility: 18 + seed % 23, drawdown: 10 + seed % 22 };
  const history = generateHistory(ticker, basePrice, type === "CRIPTO" ? 0.0021 : 0.0008, type === "CRIPTO" ? 0.042 : type === "FII" ? 0.009 : 0.021);
  const asset: Asset = {
    ticker,
    name: `${ticker} ${typeLabels[type]}`,
    type,
    market: type === "CRIPTO" ? "Cripto" : "B3",
    sector: sectorByType[type],
    segment: segmentByType[type],
    company: type === "ACAO" || type === "BDR" ? `${ticker} S.A.` : undefined,
    manager: type === "FII" || type === "ETF" ? "Gestora não informada" : undefined,
    administrator: type === "FII" ? "Administradora não informada" : undefined,
    currency: "BRL",
    price: latestPrice(history),
    changeDay: performance(history, 2),
    changeMonth: performance(history, 22),
    changeYear: performance(history, 252),
    liquidity: 3000000 + seed * 1000,
    freeFloat: type === "ACAO" ? 35 + seed % 45 : undefined,
    metrics,
    priceHistory: history,
    score: 0,
    risk: "Médio",
    tags: ["consulta dinâmica", typeLabels[type].toLowerCase()],
    summary: "",
    updatedAt: today,
    source: "generated"
  };
  asset.score = calculateAssetScore(asset);
  asset.risk = riskFrom(asset.metrics, asset.type);
  asset.summary = makeSummary(asset);
  return asset;
}

export function getAsset(ticker: string, assets: Asset[] = localAssets) {
  const clean = normalizeTicker(ticker);
  return assets.find((asset) => asset.ticker === clean) ?? createGeneratedAsset(clean);
}

const knownAssetAliases: Record<string, string[]> = {
  PETR4: ["petrobras", "petroleo brasileiro", "petr", "petr4:bvmf"],
  PETR3: ["petrobras on", "petr3", "petr3:bvmf"],
  VALE3: ["vale", "vale s.a.", "mineracao vale", "vale3:bvmf"],
  BBAS3: ["banco do brasil", "bb", "bbas", "bbas3:bvmf"],
  ITSA4: ["itau", "itausa", "itau sa", "itau holding", "itsa4:bvmf"],
  WEGE3: ["weg", "wege", "wege3:bvmf"],
  ABEV3: ["ambev", "bebidas ambev", "abev3:bvmf"],
  BBDC4: ["bradesco", "banco bradesco", "bbdc4", "bbdc4:bvmf"],
  BBDC3: ["bradesco on", "bbdc3", "bbdc3:bvmf"],
  ITUB4: ["itau unibanco", "itub", "itub4", "itub4:bvmf"],
  MGLU3: ["magazine luiza", "magalu", "mglu", "mglu3", "mglu3:bvmf"],
  GGBR4: ["gerdau", "ggbr", "ggbr4", "ggbr4:bvmf"],
  GARE11: ["gare", "guardian", "guardian real estate", "gare11:bvmf"],
  MXRF11: ["maxi renda", "maxi renda fii", "mxrf11:bvmf"],
  HGLG11: ["cshg logistica", "hglg", "hglg11:bvmf"],
  KNRI11: ["kinea renda imobiliaria", "knri", "knri11:bvmf"],
  XPLG11: ["xp log", "xplg", "xplg11:bvmf"],
  KNCR11: ["kinea rendimentos", "kncr", "kncr11:bvmf"],
  VISC11: ["vinci shopping", "visc", "visc11:bvmf"],
  CPTS11: ["capitania", "capitania securities", "cpts", "cpts11:bvmf"],
  BTC: ["bitcoin", "btcbrl"],
  ETH: ["ethereum", "ether", "ethbrl"],
  SOL: ["solana", "solbrl"],
  BNB: ["binance coin", "bnb"],
  XRP: ["ripple", "xrp"],
  ADA: ["cardano", "ada"],
  AVAX: ["avalanche", "avax"],
  LINK: ["chainlink", "oracle"],
  POL: ["polygon", "matic"],
  UNI: ["uniswap", "uni"],
  AAVE: ["aave", "defi lending"],
  USDC: ["usd coin", "stablecoin"],
  USDT: ["tether", "stablecoin"],
  DOGE: ["dogecoin", "doge"],
  SHIB: ["shiba inu", "shib"]
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tickerWithSuffixes(ticker: string) {
  return [ticker, `${ticker}:BVMF`, `${ticker}.SA`, ticker.replace(/11$/, "")];
}

function termsForAsset(asset: Asset) {
  return [
    ...tickerWithSuffixes(asset.ticker),
    asset.name,
    asset.company,
    asset.manager,
    asset.administrator,
    asset.sector,
    asset.segment,
    asset.market,
    ...(asset.tags ?? []),
    ...(knownAssetAliases[asset.ticker] ?? [])
  ].filter(Boolean).map((item) => normalizeSearchText(String(item)));
}

function editDistance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function searchPriority(asset: Asset, rawQuery: string) {
  const normalized = normalizeSearchText(rawQuery);
  const ticker = normalizeSearchText(asset.ticker);
  if (!normalized) return 1;
  const terms = termsForAsset(asset);
  if (ticker === normalized) return 1000;
  if (terms.some((term) => term === normalized)) return 900;
  if (ticker.startsWith(normalized)) return 820;
  if (terms.some((term) => term.startsWith(normalized))) return 740;
  if (terms.some((term) => term.includes(normalized))) return 620;
  if (normalized.length >= 4 && terms.some((term) => editDistance(term.slice(0, normalized.length), normalized) <= 1)) return 480;
  return 0;
}

function knownAliasTicker(query: string) {
  const normalized = normalizeSearchText(query);
  return Object.entries(knownAssetAliases).find(([ticker, aliases]) => normalizeSearchText(ticker) === normalized || aliases.some((alias) => normalizeSearchText(alias) === normalized))?.[0];
}

export function searchAssets(query: string, type: AssetType | "TODOS" = "TODOS", assets: Asset[] = localAssets, options: { includeDynamic?: boolean } = {}) {
  const q = normalizeTicker(query);
  const normalized = normalizeSearchText(query);
  const aliasTicker = knownAliasTicker(query);
  if (!normalized) return assets.filter((asset) => type === "TODOS" || asset.type === type).sort((a, b) => b.score - a.score);
  const ranked = assets
    .map((asset) => ({ asset, priority: type === "TODOS" || asset.type === type ? searchPriority(asset, query) : 0 }))
    .filter((item) => item.priority > 0)
    .sort((a, b) => b.priority - a.priority || b.asset.liquidity - a.asset.liquidity || b.asset.score - a.asset.score)
    .map((item) => item.asset);

  if (aliasTicker && !ranked.some((asset) => asset.ticker === aliasTicker)) {
    const dynamic = createGeneratedAsset(aliasTicker);
    if (type === "TODOS" || dynamic.type === type) ranked.unshift(dynamic);
  } else if ((options.includeDynamic ?? true) && q && isTickerLike(q) && !ranked.some((asset) => asset.ticker === q)) {
    const dynamic = createGeneratedAsset(q);
    if (type === "TODOS" || dynamic.type === type) ranked.unshift(dynamic);
  }
  return ranked;
}

export function makeSummary(asset: Asset) {
  const dy = asset.metrics.dividendYield ? `${asset.metrics.dividendYield.toFixed(1)}% de dividend yield` : "sem foco principal em dividendos";
  const valuation = asset.metrics.pvp ? `P/VP próximo de ${asset.metrics.pvp}` : asset.metrics.pl ? `P/L próximo de ${asset.metrics.pl}` : "múltiplos dependentes do tipo de ativo";
  return `${asset.ticker} é classificado como ${typeLabels[asset.type]} no segmento ${asset.segment}. A leitura automatizada aponta ${dy}, ${valuation}, liquidez estimada de ${asset.liquidity.toLocaleString("pt-BR")} e risco ${asset.risk.toLowerCase()}.`;
}

export function generateAiNotes(asset: Asset) {
  const notes: string[] = [];
  const dy = asset.metrics.dividendYield ?? 0;
  const pvp = asset.metrics.pvp;
  const pl = asset.metrics.pl;
  const roe = asset.metrics.roe ?? 0;
  const vol = asset.metrics.volatility ?? 0;
  if (dy >= 10) notes.push("Perfil forte de renda: o dividend yield está acima da média usada pelo algoritmo, exigindo checagem de sustentabilidade.");
  if (pvp && pvp < 0.95) notes.push("Possível desconto patrimonial: o P/VP está abaixo de 1, mas o desconto precisa ser cruzado com qualidade dos ativos e vacância/endividamento.");
  if (pl && pl < 8) notes.push("Valuation aparentemente comprimido: o P/L está baixo em relação ao parâmetro interno do radar.");
  if (roe >= 18) notes.push("Qualidade operacional positiva: o ROE está em faixa considerada forte pelo modelo de score.");
  if (vol >= 40) notes.push("Risco elevado de oscilação: a volatilidade histórica estimada exige controle de exposição na carteira.");
  if (asset.score >= 75) notes.push("Score alto: o ativo passou bem pelos critérios combinados de valuation, qualidade, liquidez e risco.");
  if (notes.length === 0) notes.push("Ativo equilibrado: os indicadores não dispararam alertas extremos, mas a análise deve ser complementada com dados atualizados e contexto setorial.");
  return notes;
}

export const assetTypeOptions: Array<{ value: AssetType | "TODOS"; label: string }> = [
  { value: "TODOS", label: "Todos" },
  { value: "ACAO", label: "Ações" },
  { value: "FII", label: "FIIs" },
  { value: "ETF", label: "ETFs" },
  { value: "BDR", label: "BDRs" },
  { value: "CRIPTO", label: "Criptomoedas" }
];
