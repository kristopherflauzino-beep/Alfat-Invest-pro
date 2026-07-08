import { getAsset } from "@/lib/market-data";
import type { Asset, PortfolioAnalysis, PortfolioLine, PortfolioPosition } from "@/lib/types";

export function analyzePortfolio(positions: PortfolioPosition[], assets: Asset[]): PortfolioAnalysis {
  const lines: PortfolioLine[] = positions.map((position) => {
    const asset = getAsset(position.ticker, assets);
    const invested = position.quantity * position.averagePrice;
    const currentValue = position.quantity * asset.price;
    const profit = currentValue - invested;
    const profitability = invested > 0 ? (profit / invested) * 100 : 0;
    const estimatedDividendsYear = currentValue * ((asset.metrics.dividendYield ?? 0) / 100);
    return {
      ...position,
      asset,
      invested,
      currentValue,
      profit,
      profitability,
      estimatedDividendsYear,
      estimatedDividendsMonth: estimatedDividendsYear / 12,
      weight: 0
    };
  });

  const totalInvested = lines.reduce((sum, line) => sum + line.invested, 0);
  const totalEquity = lines.reduce((sum, line) => sum + line.currentValue, 0);
  const totalProfit = totalEquity - totalInvested;
  const profitability = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  const projectedDividendsYear = lines.reduce((sum, line) => sum + line.estimatedDividendsYear, 0);

  lines.forEach((line) => {
    line.weight = totalEquity > 0 ? (line.currentValue / totalEquity) * 100 : 0;
  });

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
    projectedDividendsMonth: projectedDividendsYear / 12,
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
  const map = new Map<string, number>();
  lines.forEach((line) => {
    const key = getKey(line);
    map.set(key, (map.get(key) ?? 0) + line.currentValue);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);
}

function buildAlerts(lines: PortfolioLine[], byType: Array<{ name: string; value: number }>, bySector: Array<{ name: string; value: number }>) {
  const alerts: string[] = [];
  lines.forEach((line) => {
    if (line.weight > 30) alerts.push(`${line.asset.ticker} representa ${line.weight.toFixed(1)}% da carteira. Avaliar concentração.`);
    if (line.asset.risk === "Alto") alerts.push(`${line.asset.ticker} possui risco alto no modelo automatizado.`);
    if ((line.asset.metrics.dividendYield ?? 0) > 16) alerts.push(`${line.asset.ticker} tem dividend yield muito elevado. Verificar recorrência dos proventos.`);
  });
  const total = lines.reduce((sum, line) => sum + line.currentValue, 0);
  byType.forEach((item) => {
    if (total > 0 && item.value / total > 0.65) alerts.push(`Mais de 65% da carteira está em ${item.name}. Avaliar diversificação por tipo de ativo.`);
  });
  bySector.forEach((item) => {
    if (total > 0 && item.value / total > 0.45) alerts.push(`Setor ${item.name} concentra ${(item.value / total * 100).toFixed(1)}% da carteira.`);
  });
  if (alerts.length === 0) alerts.push("Nenhum alerta crítico encontrado nos critérios automatizados atuais.");
  return alerts;
}

function buildAiSummary(lines: PortfolioLine[], totalEquity: number, profitability: number, dividends: number) {
  const rendaShare = lines.filter((line) => ["FII", "ETF"].includes(line.asset.type)).reduce((sum, line) => sum + line.currentValue, 0);
  const criptoShare = lines.filter((line) => line.asset.type === "CRIPTO").reduce((sum, line) => sum + line.currentValue, 0);
  const highScore = lines.filter((line) => line.asset.score >= 75).length;
  const messages = [
    `Carteira com patrimônio estimado de ${totalEquity.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} e rentabilidade acumulada de ${profitability.toFixed(2)}%.`,
    `${highScore} ativo(s) da carteira estão com score automatizado acima de 75 pontos.`,
    `Dividendos projetados: ${dividends.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por ano, antes de impostos e variações.`,
    rendaShare / Math.max(totalEquity, 1) > 0.5 ? "A carteira tem viés forte de renda imobiliária/índices. Avaliar exposição a crescimento e exterior." : "A carteira não está excessivamente concentrada em ativos de renda, segundo a regra atual.",
    criptoShare / Math.max(totalEquity, 1) > 0.15 ? "Exposição relevante a cripto. Usar limites de risco e rebalanceamento periódico." : "Exposição a cripto está dentro de uma faixa conservadora no parâmetro padrão."
  ];
  return messages;
}
