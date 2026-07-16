import { describe, expect, it } from "vitest";
import type { Asset } from "@/lib/types";
import {
  activeStockFilters,
  defaultStockOpportunityFilters,
  filterAndSortStockOpportunities
} from "./stock-filters";

function stock(ticker: string, overrides: Partial<Asset> = {}): Asset {
  return {
    ticker,
    name: ticker,
    type: "ACAO",
    market: "B3",
    sector: "Financeiro",
    segment: "Bancos",
    currency: "BRL",
    price: 10,
    changeDay: 2,
    changeMonth: 0,
    changeYear: 0,
    liquidity: 2_000_000,
    metrics: {
      eps: 2,
      bookValuePerShare: 12,
      pl: 5,
      pvp: 0.9,
      roe: 18,
      dividendYield: 7,
      cagr: 8,
      volatility: 20,
      netDebtToEbitda: 1.5
    },
    priceHistory: [],
    score: 80,
    risk: "Baixo",
    tags: [],
    summary: "",
    updatedAt: new Date().toISOString(),
    source: "external",
    sourceLabel: "Yahoo Finance",
    ...overrides
  };
}

describe("filtros de oportunidades em ações", () => {
  const assets = [
    stock("AAA3"),
    stock("BBB4", { score: 70, price: 30, sector: "Energia", metrics: { eps: 1, bookValuePerShare: 5, pl: 14, pvp: 2, roe: 10, dividendYield: 2, cagr: 3, volatility: 35, netDebtToEbitda: 4 } }),
    stock("FII11", { type: "FII" })
  ];

  it("interpreta zero como ausência de limite", () => {
    expect(filterAndSortStockOpportunities(assets, defaultStockOpportunityFilters)).toHaveLength(2);
  });

  it("aplica score, setor, P/L e ROE cumulativamente", () => {
    const result = filterAndSortStockOpportunities(assets, {
      ...defaultStockOpportunityFilters,
      minScore: 75,
      sector: "Financeiro",
      maxPl: 10,
      minRoe: 15
    });
    expect(result.map((item) => item.ticker)).toEqual(["AAA3"]);
  });

  it("não transforma Graham ausente em zero", () => {
    const withoutData = stock("SEM3", { metrics: { roe: 12 } });
    const result = filterAndSortStockOpportunities([withoutData], {
      ...defaultStockOpportunityFilters,
      minSafetyMargin: 1
    });
    expect(result).toEqual([]);
  });

  it("filtra favoritos e ordena por menor preço", () => {
    const result = filterAndSortStockOpportunities(assets, {
      ...defaultStockOpportunityFilters,
      onlyFavorites: true,
      sortBy: "price_asc"
    }, ["BBB4", "AAA3"]);
    expect(result.map((item) => item.ticker)).toEqual(["AAA3", "BBB4"]);
  });

  it("expõe chips para os filtros ativos", () => {
    const chips = activeStockFilters({ ...defaultStockOpportunityFilters, minScore: 75, maxPl: 10, onlyBelowGraham: true });
    expect(chips.map((item) => item.label)).toEqual(["Score ≥ 75", "P/L ≤ 10", "Abaixo de Graham"]);
  });
});
