import { describe, expect, it } from "vitest";
import { getYahooFinanceUrl } from "./external-finance-url";
import { formatAssetPrice, formatDailyChange } from "@/components/assets/AssetMetricsGrid";

describe("links externos e métricas de ativos", () => {
  it.each([
    ["GARE11", "FII", "https://finance.yahoo.com/quote/GARE11.SA/"],
    ["PETR4", "ACAO", "https://finance.yahoo.com/quote/PETR4.SA/"],
    ["VALE3", "ACAO", "https://finance.yahoo.com/quote/VALE3.SA/"],
    ["MXRF11", "FII", "https://finance.yahoo.com/quote/MXRF11.SA/"],
    ["IVVB11", "ETF", "https://finance.yahoo.com/quote/IVVB11.SA/"],
    ["BBDC4", "ACAO", "https://finance.yahoo.com/quote/BBDC4.SA/"]
  ] as const)("gera URL Yahoo correta para %s", (ticker, type, expected) => {
    expect(getYahooFinanceUrl(ticker, type)).toBe(expected);
    expect(getYahooFinanceUrl(ticker + ".SA", type)).toBe(expected);
  });

  it("mantém centavos no preço em reais", () => {
    expect(formatAssetPrice(40.31, "ACAO")).toBe("R$ 40,31");
  });

  it("formata variação positiva, negativa e neutra sem multiplicar por 100", () => {
    expect(formatDailyChange(2.63)).toBe("+2,63%");
    expect(formatDailyChange(-1.42)).toBe("−1,42%");
    expect(formatDailyChange(0)).toBe("0,00%");
  });
});
