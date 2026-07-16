import Decimal from "decimal.js-light";
import { getAsset } from "@/lib/market-data";
import type { Asset, PortfolioAnalysis, PortfolioLine, PortfolioPosition } from "@/lib/types";

export function analyzePortfolio(positions: PortfolioPosition[], assets: Asset[]): PortfolioAnalysis {
  const calculated = positions.map((position) => {
    const asset = getAsset(position.ticker, assets);
    const quantity = new Decimal(position.quantity);
    const averagePrice = new Decimal(position.averagePrice);
    const currentPrice = new Decimal(String(asset.price));
    const invested = quantity.times(averagePrice);
    const currentValue = quantity.times(currentPrice);
    const profit = currentValue.minus(invested);
    const profitability = invested.greaterThan(0) ? profit.dividedBy(invested).times(100) : new Decimal(0);
    const estimatedDividendsYear = currentValue.times(new Decimal(String(asset.metrics.dividendYield ?? 0))).dividedBy(100);
    return {
      position: { ...position, assetType: position.assetType ?? asset.type },
      asset,
      invested,
      currentValue,
      profit,
      profitability,
      estimatedDividendsYear
    };
  });

  const totalInvestedDecimal = calculated.reduce((sum, item) => sum.plus(item.invested), new Decimal(0));
  const totalEquityDecimal = calculated.reduce((sum, item) => sum.plus(item.currentValue), new Decimal(0));
  const totalProfitDecimal = totalEquityDecimal.minus(totalInvestedDecimal);
  const profitabilityDecimal = totalInvestedDecimal.greaterThan(0)
    ? totalProfitDecimal.dividedBy(totalInvestedDecimal).times(100)
    : new Decimal(0);
  const projectedDividendsYearDecimal = calculated.reduce(
    (sum, item) => sum.plus(item.estimatedDividendsYear),
    new Decimal(0)
  );

  const lines: PortfolioLine[] = calculated.map((item) => ({
    ...item.position,
    asset: item.asset,
    invested: item.invested.toNumber(),
    currentValue: item.currentValue.toNumber(),
    profit: item.profit.toNumber(),
    profitability: item.profitability.toNumber(),
    estimatedDividendsYear: item.estimatedDividendsYear.toNumber(),
    estimatedDividendsMonth: item.estimatedDividendsYear.dividedBy(12).toNumber(),
    weight: totalEquityDecimal.greaterThan(0)
      ? item.currentValue.dividedBy(totalEquityDecimal).times(100).toNumber()
      : 0
  }));

  const totalInvested = totalInvestedDecimal.toNumber();
  const totalEquity = totalEquityDecimal.toNumber();
  const totalProfit = totalProfitDecimal.toNumber();
  const profitability = profitabilityDecimal.toNumber();
  const projectedDividendsYear = projectedDividendsYearDecimal.toNumber();
  const best = [...lines].sort((a, b) => b.profitability - a.profitability)[0];
  const worst = [...lines].sort((a, b) => a.profitability - b.profitability)[0];
  const byType = groupLines(lines, (line) => line.asset.type);
  const bySector = groupLines(lines, (line) => line.asset.sector);
  const alerts = buildAlerts(lines, byType, bySector);
  const aiSummary = buildAiSummary(lines, totalEquity, profitability, projectedDividendsYear);

  return {
    totalInvested,
    totalEquity,
    totalProfit,
    profitability,
    projectedDividendsYear,
    projectedDividendsMonth: projectedDividendsYearDecimal.dividedBy(12).toNumber(),
    best,
    worst,
    byType,
    bySector,
    lines,
    alerts,
    aiSummary
  };
}

function groupLines(lines: PortfolioLine[], getKey: (line: PortfolioLine) => string) {
  const map = new Map<string, Decimal>();
  lines.forEach((line) => {
    const key = getKey(line);
    map.set(key, (map.get(key) ?? new Decimal(0)).plus(String(line.currentValue)));
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: value.toDecimalPlaces(2).toNumber() }))
    .sort((a, b) => b.value - a.value);
}

function buildAlerts(lines: PortfolioLine[], byType: Array<{ name: string; value: number }>, bySector: Array<{ name: string; value: number }>) {
  const alerts: string[] = [];
  lines.forEach((line) => {
    if (line.weight > 30) alerts.push(line.asset.ticker + " representa " + line.weight.toFixed(1) + "% da carteira. Avaliar concentração.");
    if (line.asset.risk === "Alto") alerts.push(line.asset.ticker + " possui risco alto no modelo automatizado.");
    if ((line.asset.metrics.dividendYield ?? 0) > 16) alerts.push(line.asset.ticker + " tem dividend yield muito elevado. Verificar recorrência dos proventos.");
  });
  const total = lines.reduce((sum, line) => sum.plus(String(line.currentValue)), new Decimal(0));
  byType.forEach((item) => {
    if (total.greaterThan(0) && new Decimal(item.value).dividedBy(total).greaterThan(0.65)) {
      alerts.push("Mais de 65% da carteira está em " + item.name + ". Avaliar diversificação por tipo de ativo.");
    }
  });
  bySector.forEach((item) => {
    if (total.greaterThan(0) && new Decimal(item.value).dividedBy(total).greaterThan(0.45)) {
      alerts.push("Setor " + item.name + " concentra " + new Decimal(item.value).dividedBy(total).times(100).toFixed(1) + "% da carteira.");
    }
  });
  if (alerts.length === 0) alerts.push("Nenhum alerta crítico encontrado nos critérios automatizados atuais.");
  return alerts;
}

function buildAiSummary(lines: PortfolioLine[], totalEquity: number, profitability: number, dividends: number) {
  const rendaShare = lines
    .filter((line) => ["FII", "ETF"].includes(line.asset.type))
    .reduce((sum, line) => sum.plus(String(line.currentValue)), new Decimal(0));
  const criptoShare = lines
    .filter((line) => line.asset.type === "CRIPTO")
    .reduce((sum, line) => sum.plus(String(line.currentValue)), new Decimal(0));
  const total = new Decimal(String(Math.max(totalEquity, 1)));
  const highScore = lines.filter((line) => line.asset.score >= 75).length;
  return [
    "Carteira com patrimônio estimado de " + totalEquity.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + " e rentabilidade acumulada de " + profitability.toFixed(2) + "%.",
    highScore + " ativo(s) da carteira estão com score automatizado acima de 75 pontos.",
    "Dividendos projetados: " + dividends.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + " por ano, antes de impostos e variações.",
    rendaShare.dividedBy(total).greaterThan(0.5)
      ? "A carteira tem viés forte de renda imobiliária ou índices. Avaliar exposição a crescimento e exterior."
      : "A carteira não está excessivamente concentrada em ativos de renda, segundo a regra atual.",
    criptoShare.dividedBy(total).greaterThan(0.15)
      ? "Exposição relevante a cripto. Usar limites de risco e rebalanceamento periódico."
      : "A exposição a cripto está dentro de uma faixa conservadora no parâmetro padrão."
  ];
}
