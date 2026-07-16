import { describe, expect, it } from "vitest";
import { analyzePortfolio } from "./portfolio";
import type { Asset, PortfolioPosition } from "./types";

function asset(ticker: string, price: number, type: Asset["type"] = "CRIPTO"): Asset {
  return {
    ticker,
    name: ticker,
    type,
    market: type === "CRIPTO" ? "Cripto" : "B3",
    sector: "Teste",
    segment: "Teste",
    currency: "BRL",
    price,
    changeDay: 0,
    changeMonth: 0,
    changeYear: 0,
    liquidity: 1_000_000,
    metrics: {},
    priceHistory: [],
    score: 70,
    risk: "Baixo",
    tags: [],
    summary: "",
    updatedAt: new Date().toISOString(),
    source: "external"
  };
}

describe("cálculos decimais da carteira", () => {
  it("calcula quantidade vezes preço sem arredondar a entrada", () => {
    const position: PortfolioPosition = {
      id: "btc",
      ticker: "BTC",
      quantity: "0.0000000000000000000001",
      averagePrice: "0.2",
      assetType: "CRIPTO",
      broker: "Teste",
      purchaseDate: "2026-07-16"
    };
    const result = analyzePortfolio([position], [asset("BTC", 0.3)]);
    expect(result.lines[0].quantity).toBe("0.0000000000000000000001");
    expect(result.totalInvested).toBe(2e-23);
    expect(result.totalEquity).toBe(3e-23);
  });

  it("mantém cálculo decimal clássico de 0,1 por 0,2", () => {
    const position: PortfolioPosition = {
      id: "eth",
      ticker: "ETH",
      quantity: "0.1",
      averagePrice: "0.2",
      assetType: "CRIPTO",
      broker: "Teste",
      purchaseDate: "2026-07-16"
    };
    const result = analyzePortfolio([position], [asset("ETH", 0.3)]);
    expect(result.totalInvested).toBe(0.02);
    expect(result.totalEquity).toBe(0.03);
    expect(result.totalProfit).toBeCloseTo(0.01, 12);
  });
});
