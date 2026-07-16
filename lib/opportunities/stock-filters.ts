import { z } from "zod";
import type { Asset } from "@/lib/types";
import { analisarNumeroGraham } from "@/lib/valuation/graham";

export type StockDataConfidence = "Alta" | "Media" | "Baixa" | "Insuficiente";
export type StockOpportunitySort =
  | "score_desc"
  | "price_asc"
  | "change_desc"
  | "pl_asc"
  | "pvp_asc"
  | "roe_desc"
  | "dy_desc"
  | "margin_desc"
  | "potential_desc"
  | "liquidity_desc"
  | "risk_asc"
  | "confidence_desc";

export const stockFilterSchema = z.object({
  minScore: z.number().finite().min(0).max(100),
  sector: z.string().max(120),
  segment: z.string().max(120),
  minPrice: z.number().finite().min(0),
  maxPrice: z.number().finite().min(0),
  maxPl: z.number().finite().min(0),
  maxPvp: z.number().finite().min(0),
  minRoe: z.number().finite(),
  minDividendYield: z.number().finite().min(0),
  minLiquidity: z.number().finite().min(0),
  minSafetyMargin: z.number().finite(),
  minGrahamPotential: z.number().finite(),
  maxNetDebtEbitda: z.number().finite().min(0),
  minGrowth: z.number().finite(),
  maxVolatility: z.number().finite().min(0),
  minimumConfidence: z.enum(["Alta", "Media", "Baixa", "Insuficiente"]),
  onlyPositiveLpa: z.boolean(),
  onlyPositiveVpa: z.boolean(),
  onlyBelowGraham: z.boolean(),
  onlyUpdated: z.boolean(),
  onlyFavorites: z.boolean(),
  sortBy: z.enum([
    "score_desc", "price_asc", "change_desc", "pl_asc", "pvp_asc", "roe_desc",
    "dy_desc", "margin_desc", "potential_desc", "liquidity_desc", "risk_asc", "confidence_desc"
  ])
}).strict();

export type StockOpportunityFilterState = z.infer<typeof stockFilterSchema>;

export const defaultStockOpportunityFilters: StockOpportunityFilterState = {
  minScore: 0,
  sector: "",
  segment: "",
  minPrice: 0,
  maxPrice: 0,
  maxPl: 0,
  maxPvp: 0,
  minRoe: 0,
  minDividendYield: 0,
  minLiquidity: 0,
  minSafetyMargin: 0,
  minGrahamPotential: 0,
  maxNetDebtEbitda: 0,
  minGrowth: 0,
  maxVolatility: 0,
  minimumConfidence: "Insuficiente",
  onlyPositiveLpa: false,
  onlyPositiveVpa: false,
  onlyBelowGraham: false,
  onlyUpdated: false,
  onlyFavorites: false,
  sortBy: "score_desc"
};

const confidenceRank: Record<StockDataConfidence, number> = { Insuficiente: 0, Baixa: 1, Media: 2, Alta: 3 };
const riskRank = { Baixo: 0, Médio: 1, Alto: 2 } as Record<string, number>;

export function stockDataConfidence(asset: Asset): StockDataConfidence {
  const available = [
    asset.price,
    asset.metrics.eps,
    asset.metrics.bookValuePerShare,
    asset.metrics.pl,
    asset.metrics.pvp,
    asset.metrics.roe,
    asset.liquidity
  ].filter((value) => typeof value === "number" && Number.isFinite(value)).length;
  if (available < 3) return "Insuficiente";
  const updatedAt = new Date(asset.lastUpdatedAt ?? asset.updatedAt).getTime();
  const ageHours = Number.isFinite(updatedAt) ? (Date.now() - updatedAt) / 3_600_000 : Number.POSITIVE_INFINITY;
  if (asset.source === "external" && available >= 6 && ageHours <= 48) return "Alta";
  if (available >= 5 && ageHours <= 24 * 30) return "Media";
  return "Baixa";
}

export function stockDataIsUpdated(asset: Asset) {
  const updatedAt = new Date(asset.lastUpdatedAt ?? asset.updatedAt).getTime();
  return Number.isFinite(updatedAt) && Date.now() - updatedAt <= 48 * 60 * 60 * 1000;
}

function numberOrNull(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function satisfiesMaximum(value: number | undefined, maximum: number) {
  if (maximum === 0) return true;
  const current = numberOrNull(value);
  return current !== null && current <= maximum;
}

function satisfiesMinimum(value: number | undefined, minimum: number) {
  if (minimum === 0) return true;
  const current = numberOrNull(value);
  return current !== null && current >= minimum;
}

export function filterAndSortStockOpportunities(
  assets: Asset[],
  filters: StockOpportunityFilterState,
  favorites: string[] = []
) {
  const filtered = assets.filter((asset) => {
    if (asset.type !== "ACAO") return false;
    const graham = analisarNumeroGraham(asset);
    const confidence = stockDataConfidence(asset);
    if (filters.minScore > 0 && asset.score < filters.minScore) return false;
    if (filters.sector && asset.sector !== filters.sector) return false;
    if (filters.segment && asset.segment !== filters.segment) return false;
    if (filters.minPrice > 0 && asset.price < filters.minPrice) return false;
    if (filters.maxPrice > 0 && asset.price > filters.maxPrice) return false;
    if (!satisfiesMaximum(asset.metrics.pl, filters.maxPl)) return false;
    if (!satisfiesMaximum(asset.metrics.pvp, filters.maxPvp)) return false;
    if (!satisfiesMinimum(asset.metrics.roe, filters.minRoe)) return false;
    if (!satisfiesMinimum(asset.metrics.dividendYield, filters.minDividendYield)) return false;
    if (filters.minLiquidity > 0 && asset.liquidity < filters.minLiquidity) return false;
    if (filters.minSafetyMargin > 0 && (typeof graham.safetyMargin !== "number" || graham.safetyMargin < filters.minSafetyMargin)) return false;
    if (filters.minGrahamPotential > 0 && (typeof graham.potential !== "number" || graham.potential < filters.minGrahamPotential)) return false;
    if (!satisfiesMaximum(asset.metrics.netDebtToEbitda, filters.maxNetDebtEbitda)) return false;
    if (!satisfiesMinimum(asset.metrics.cagr, filters.minGrowth)) return false;
    if (!satisfiesMaximum(asset.metrics.volatility, filters.maxVolatility)) return false;
    if (confidenceRank[confidence] < confidenceRank[filters.minimumConfidence]) return false;
    if (filters.onlyPositiveLpa && !(asset.metrics.eps && asset.metrics.eps > 0)) return false;
    if (filters.onlyPositiveVpa && !(asset.metrics.bookValuePerShare && asset.metrics.bookValuePerShare > 0)) return false;
    if (filters.onlyBelowGraham && (!graham.applicable || typeof graham.value !== "number" || asset.price >= graham.value)) return false;
    if (filters.onlyUpdated && !stockDataIsUpdated(asset)) return false;
    if (filters.onlyFavorites && !favorites.includes(asset.ticker)) return false;
    return true;
  });

  const grahamValue = (asset: Asset, field: "safetyMargin" | "potential") => analisarNumeroGraham(asset)[field] ?? Number.NEGATIVE_INFINITY;
  const nullable = (value: number | undefined, fallback: number) => numberOrNull(value) ?? fallback;
  return [...filtered].sort((a, b) => {
    switch (filters.sortBy) {
      case "price_asc": return a.price - b.price;
      case "change_desc": return b.changeDay - a.changeDay;
      case "pl_asc": return nullable(a.metrics.pl, Number.POSITIVE_INFINITY) - nullable(b.metrics.pl, Number.POSITIVE_INFINITY);
      case "pvp_asc": return nullable(a.metrics.pvp, Number.POSITIVE_INFINITY) - nullable(b.metrics.pvp, Number.POSITIVE_INFINITY);
      case "roe_desc": return nullable(b.metrics.roe, Number.NEGATIVE_INFINITY) - nullable(a.metrics.roe, Number.NEGATIVE_INFINITY);
      case "dy_desc": return nullable(b.metrics.dividendYield, Number.NEGATIVE_INFINITY) - nullable(a.metrics.dividendYield, Number.NEGATIVE_INFINITY);
      case "margin_desc": return grahamValue(b, "safetyMargin") - grahamValue(a, "safetyMargin");
      case "potential_desc": return grahamValue(b, "potential") - grahamValue(a, "potential");
      case "liquidity_desc": return b.liquidity - a.liquidity;
      case "risk_asc": return (riskRank[a.risk] ?? 9) - (riskRank[b.risk] ?? 9);
      case "confidence_desc": return confidenceRank[stockDataConfidence(b)] - confidenceRank[stockDataConfidence(a)];
      default: return b.score - a.score;
    }
  });
}

export type ActiveStockFilter = { key: keyof StockOpportunityFilterState; label: string };

export function activeStockFilters(filters: StockOpportunityFilterState): ActiveStockFilter[] {
  const items: ActiveStockFilter[] = [];
  if (filters.minScore > 0) items.push({ key: "minScore", label: "Score ≥ " + filters.minScore });
  if (filters.sector) items.push({ key: "sector", label: "Setor: " + filters.sector });
  if (filters.segment) items.push({ key: "segment", label: "Segmento: " + filters.segment });
  if (filters.minPrice > 0) items.push({ key: "minPrice", label: "Preço ≥ R$ " + filters.minPrice });
  if (filters.maxPrice > 0) items.push({ key: "maxPrice", label: "Preço ≤ R$ " + filters.maxPrice });
  if (filters.maxPl > 0) items.push({ key: "maxPl", label: "P/L ≤ " + filters.maxPl });
  if (filters.maxPvp > 0) items.push({ key: "maxPvp", label: "P/VP ≤ " + filters.maxPvp });
  if (filters.minRoe > 0) items.push({ key: "minRoe", label: "ROE ≥ " + filters.minRoe + "%" });
  if (filters.minDividendYield > 0) items.push({ key: "minDividendYield", label: "DY ≥ " + filters.minDividendYield + "%" });
  if (filters.minLiquidity > 0) items.push({ key: "minLiquidity", label: "Liquidez ≥ " + filters.minLiquidity });
  if (filters.minSafetyMargin > 0) items.push({ key: "minSafetyMargin", label: "Margem Graham ≥ " + filters.minSafetyMargin + "%" });
  if (filters.minGrahamPotential > 0) items.push({ key: "minGrahamPotential", label: "Potencial Graham ≥ " + filters.minGrahamPotential + "%" });
  if (filters.maxNetDebtEbitda > 0) items.push({ key: "maxNetDebtEbitda", label: "Dívida/EBITDA ≤ " + filters.maxNetDebtEbitda });
  if (filters.minGrowth > 0) items.push({ key: "minGrowth", label: "Crescimento ≥ " + filters.minGrowth + "%" });
  if (filters.maxVolatility > 0) items.push({ key: "maxVolatility", label: "Volatilidade ≤ " + filters.maxVolatility + "%" });
  if (filters.minimumConfidence !== "Insuficiente") items.push({ key: "minimumConfidence", label: "Confiança ≥ " + (filters.minimumConfidence === "Media" ? "Média" : filters.minimumConfidence) });
  if (filters.onlyPositiveLpa) items.push({ key: "onlyPositiveLpa", label: "LPA positivo" });
  if (filters.onlyPositiveVpa) items.push({ key: "onlyPositiveVpa", label: "VPA positivo" });
  if (filters.onlyBelowGraham) items.push({ key: "onlyBelowGraham", label: "Abaixo de Graham" });
  if (filters.onlyUpdated) items.push({ key: "onlyUpdated", label: "Dados atualizados" });
  if (filters.onlyFavorites) items.push({ key: "onlyFavorites", label: "Somente favoritos" });
  return items;
}

export function clearStockFilter(filters: StockOpportunityFilterState, key: keyof StockOpportunityFilterState) {
  return { ...filters, [key]: defaultStockOpportunityFilters[key] } as StockOpportunityFilterState;
}
