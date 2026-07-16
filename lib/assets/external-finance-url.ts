import type { AssetType } from "@/lib/types";

const b3AssetTypes: AssetType[] = ["ACAO", "FII", "ETF", "BDR"];

export function getYahooFinanceUrl(ticker: string, assetType: AssetType) {
  const normalizedTicker = ticker.trim().toUpperCase().replace(/\.SA$/u, "");
  const yahooTicker = b3AssetTypes.includes(assetType) ? normalizedTicker + ".SA" : normalizedTicker;
  return "https://finance.yahoo.com/quote/" + encodeURIComponent(yahooTicker) + "/";
}

export function externalDataSourceLabel(sourceLabel?: string, source?: "local" | "external" | "generated") {
  if (sourceLabel?.trim()) return sourceLabel.trim();
  return source === "external" ? "Provedor externo de dados financeiros" : "Base de indicadores do ativo";
}
