import type { PortfolioLine } from "@/lib/types";

export type PortfolioProfileName = "Conservador" | "Moderado" | "Balanceado" | "Arrojado" | "Agressivo" | "Personalizado";
export type PortfolioConfidence = "Alta" | "Média" | "Baixa" | "Insuficiente";
export type PortfolioClassId = "reserva_caixa" | "renda_fixa" | "acoes_brasileiras" | "fiis" | "etfs_brasileiros" | "exterior" | "criptomoedas" | "outros";
export type PortfolioTarget = { id: PortfolioClassId; label: string; targetPercent: number; tolerancePp: number };
export type InvestorAnswers = { objective: string; horizon: string; lossTolerance: string; liquidityNeed: string; experience: string; incomeGoal: string; contributionFrequency: string; averageContribution: number; emergencyReserve: string; restrictions: string[]; monthlyExpenses: number; emergencyMonths: number; emergencyCurrentValue: number };
export type PortfolioHistoryEntry = { id: string; createdAt: string; totalEquity: number; score: number | null; profileName: PortfolioProfileName; allocations: Array<{ id: PortfolioClassId; currentPercent: number; targetPercent: number }> };
export type PortfolioMethodProfile = { userId: string; version: string; profileName: PortfolioProfileName; answers: InvestorAnswers; targets: PortfolioTarget[]; reviewFrequency: "mensal" | "trimestral" | "semestral" | "anual"; rebalancingMode: "aportes_rendimentos" | "somente_aportes" | "completo_simulado"; updatedAt: string; history: PortfolioHistoryEntry[] };
export type PortfolioAllocation = PortfolioTarget & { currentValue: number; currentPercent: number; targetValue: number; driftPp: number; adjustmentValue: number; lowerBound: number; upperBound: number; status: "Dentro da faixa planejada" | "Abaixo da faixa" | "Acima da faixa" };
export type PortfolioScorePillars = { profileFit: number; diversification: number; concentration: number; balance: number; quality: number; liquidity: number; risk: number };
export type PortfolioMethodAnalysis = { totalEquity: number; allocations: PortfolioAllocation[]; concentrationIndex: number; effectivePositions: number; largestPositionPercent: number; topFivePercent: number; pillars: PortfolioScorePillars; score: number | null; classification: string; confidence: PortfolioConfidence; confidenceReasons: string[]; positives: string[]; attentionPoints: string[]; emergencyTarget: number; emergencyDeficit: number; monthlyIncome: number; annualIncome: number; nextReview: string };
export type ContributionSuggestion = { classId: PortfolioClassId; label: string; amount: number; beforePercent: number; afterPercent: number; remainingDeficit: number };

export const portfolioClasses: Array<{ id: PortfolioClassId; label: string }> = [
  { id: "reserva_caixa", label: "Reserva e caixa" }, { id: "renda_fixa", label: "Renda fixa" }, { id: "acoes_brasileiras", label: "Ações brasileiras" }, { id: "fiis", label: "FIIs" }, { id: "etfs_brasileiros", label: "ETFs brasileiros" }, { id: "exterior", label: "Exterior e BDRs" }, { id: "criptomoedas", label: "Criptomoedas" }, { id: "outros", label: "Outros" }
];
const allocations: Record<Exclude<PortfolioProfileName, "Personalizado">, number[]> = { Conservador: [20, 55, 10, 5, 5, 5, 0, 0], Moderado: [15, 40, 20, 10, 7, 5, 3, 0], Balanceado: [10, 30, 25, 15, 10, 5, 5, 0], Arrojado: [5, 15, 35, 15, 10, 10, 10, 0], Agressivo: [5, 10, 35, 15, 10, 10, 15, 0] };
export const defaultAnswers: InvestorAnswers = { objective: "crescimento_patrimonial", horizon: "5_10", lossTolerance: "moderada", liquidityNeed: "ate_1_ano", experience: "intermediario", incomeGoal: "renda_complementar", contributionFrequency: "mensal", averageContribution: 1000, emergencyReserve: "incompleta", restrictions: [], monthlyExpenses: 0, emergencyMonths: 6, emergencyCurrentValue: 0 };

export function defaultTargetsForProfile(profile: PortfolioProfileName): PortfolioTarget[] { const values = allocations[profile === "Personalizado" ? "Balanceado" : profile]; return portfolioClasses.map((item, index) => ({ ...item, targetPercent: values[index], tolerancePp: 5 })); }
export function defaultPortfolioProfile(userId: string): PortfolioMethodProfile { const profileName = derivePortfolioProfile(defaultAnswers); return { userId, version: "1.0", profileName, answers: { ...defaultAnswers }, targets: defaultTargetsForProfile(profileName), reviewFrequency: "trimestral", rebalancingMode: "aportes_rendimentos", updatedAt: new Date().toISOString(), history: [] }; }
export function targetTotal(targets: PortfolioTarget[]) { return Number(targets.reduce((sum, item) => sum + Number(item.targetPercent || 0), 0).toFixed(2)); }
export function targetsAreValid(targets: PortfolioTarget[]) { return targets.length > 0 && Math.abs(targetTotal(targets) - 100) < 0.001 && targets.every((item) => item.targetPercent >= 0 && item.targetPercent <= 100 && item.tolerancePp >= 0 && item.tolerancePp <= 50); }

export function derivePortfolioProfile(answers: InvestorAnswers): Exclude<PortfolioProfileName, "Personalizado"> {
  let points = 0;
  points += ({ baixa: 0, moderada: 2, alta: 4, muito_alta: 5 } as Record<string, number>)[answers.lossTolerance] ?? 1;
  points += ({ ate_1: 0, "1_3": 1, "3_5": 2, "5_10": 4, mais_10: 5 } as Record<string, number>)[answers.horizon] ?? 1;
  points += ({ iniciante: 0, intermediario: 2, avancado: 4 } as Record<string, number>)[answers.experience] ?? 0;
  points += ({ imediata: 0, ate_30_dias: 1, ate_1_ano: 2, longo_prazo: 4 } as Record<string, number>)[answers.liquidityNeed] ?? 1;
  if (answers.emergencyReserve === "inexistente") points -= 2;
  if (answers.emergencyReserve === "completa") points += 1;
  if (points <= 3) return "Conservador";
  if (points <= 7) return "Moderado";
  if (points <= 11) return "Balanceado";
  if (points <= 14) return "Arrojado";
  return "Agressivo";
}
function classForLine(line: PortfolioLine): PortfolioClassId { if (line.asset.type === "ACAO") return "acoes_brasileiras"; if (line.asset.type === "FII") return "fiis"; if (line.asset.type === "ETF") return "etfs_brasileiros"; if (line.asset.type === "BDR") return "exterior"; if (line.asset.type === "CRIPTO") return "criptomoedas"; return "outros"; }
const clamp = (value: number) => Math.max(0, Math.min(100, value));
const weighted = (lines: PortfolioLine[], scorer: (line: PortfolioLine) => number, total: number) => total > 0 ? lines.reduce((sum, line) => sum + scorer(line) * line.currentValue / total, 0) : 0;
function nextReviewDate(frequency: PortfolioMethodProfile["reviewFrequency"], from = new Date()) { const date = new Date(from); const months = frequency === "mensal" ? 1 : frequency === "trimestral" ? 3 : frequency === "semestral" ? 6 : 12; date.setMonth(date.getMonth() + months); return date.toISOString(); }

export function analyzeAlfatecPortfolio(lines: PortfolioLine[], profile: PortfolioMethodProfile): PortfolioMethodAnalysis {
  const totalEquity = lines.reduce((sum, line) => sum + line.currentValue, 0);
  const values = new Map<PortfolioClassId, number>();
  lines.forEach((line) => values.set(classForLine(line), (values.get(classForLine(line)) ?? 0) + line.currentValue));
  const allocationsResult = profile.targets.map((target) => { const currentValue = values.get(target.id) ?? 0; const currentPercent = totalEquity > 0 ? currentValue / totalEquity * 100 : 0; const targetValue = totalEquity * target.targetPercent / 100; const driftPp = currentPercent - target.targetPercent; const lowerBound = Math.max(0, target.targetPercent - target.tolerancePp); const upperBound = Math.min(100, target.targetPercent + target.tolerancePp); const status = currentPercent < lowerBound ? "Abaixo da faixa" as const : currentPercent > upperBound ? "Acima da faixa" as const : "Dentro da faixa planejada" as const; return { ...target, currentValue, currentPercent, targetValue, driftPp, adjustmentValue: targetValue - currentValue, lowerBound, upperBound, status }; });
  const decimals = lines.map((line) => totalEquity > 0 ? line.currentValue / totalEquity : 0);
  const concentrationIndex = decimals.reduce((sum, value) => sum + value * value, 0);
  const effectivePositions = concentrationIndex > 0 ? 1 / concentrationIndex : 0;
  const sortedWeights = [...decimals].sort((a, b) => b - a);
  const largestPositionPercent = (sortedWeights[0] ?? 0) * 100;
  const topFivePercent = sortedWeights.slice(0, 5).reduce((sum, value) => sum + value, 0) * 100;
  const balance = allocationsResult.length ? allocationsResult.reduce((sum, item) => sum + clamp(100 - Math.abs(item.driftPp) * 3), 0) / allocationsResult.length : 0;
  const diversification = clamp(new Set(lines.map(classForLine)).size * 13 + effectivePositions * 9);
  const concentration = clamp(100 - Math.max(0, largestPositionPercent - 15) * 2.4 - Math.max(0, topFivePercent - 70));
  const quality = weighted(lines, (line) => line.asset.score, totalEquity);
  const liquidity = weighted(lines, (line) => line.asset.liquidity >= 1_000_000 ? 100 : line.asset.liquidity >= 100_000 ? 80 : line.asset.liquidity >= 20_000 ? 55 : 30, totalEquity);
  const risk = weighted(lines, (line) => line.asset.risk === "Baixo" ? 90 : line.asset.risk === "Médio" ? 65 : 35, totalEquity);
  const profileFit = clamp(balance * 0.75 + risk * 0.25);
  const pillars = { profileFit: Math.round(profileFit), diversification: Math.round(diversification), concentration: Math.round(concentration), balance: Math.round(balance), quality: Math.round(quality), liquidity: Math.round(liquidity), risk: Math.round(risk) };
  const confidenceReasons: string[] = [];
  if (!targetsAreValid(profile.targets)) confidenceReasons.push("A soma da carteira-alvo não é 100%.");
  if (!lines.length) confidenceReasons.push("A carteira ainda não possui posições.");
  const generated = lines.filter((line) => line.asset.source === "generated").length;
  if (generated) confidenceReasons.push(`${generated} ativo(s) possuem dados incompletos ou gerados.`);
  const stale = lines.filter((line) => Date.now() - new Date(line.asset.updatedAt).getTime() > 7 * 86400000).length;
  if (stale) confidenceReasons.push(`${stale} ativo(s) possuem atualização antiga.`);
  const confidence: PortfolioConfidence = !lines.length || !targetsAreValid(profile.targets) ? "Insuficiente" : generated > 0 || stale > Math.max(1, lines.length / 3) ? "Baixa" : stale > 0 ? "Média" : "Alta";
  const rawScore = pillars.profileFit * .2 + pillars.diversification * .2 + pillars.concentration * .15 + pillars.balance * .15 + pillars.quality * .1 + pillars.liquidity * .1 + pillars.risk * .1;
  let score = confidence === "Insuficiente" ? null : Math.round(rawScore);
  if (score !== null && confidence === "Baixa") score = Math.min(score, 79);
  const classification = score === null ? "Dados insuficientes" : score >= 90 ? "Muito bem estruturada" : score >= 80 ? "Bem estruturada" : score >= 70 ? "Boa, com ajustes recomendados" : score >= 60 ? "Desequilibrada" : score >= 50 ? "Atenção" : "Risco elevado ou incompatibilidade relevante";
  const positives: string[] = [];
  const attentionPoints: string[] = [];
  if (liquidity >= 75) positives.push("Boa liquidez estimada para a maior parte da carteira.");
  if (largestPositionPercent <= 20) positives.push("Nenhum ativo individual supera o limite orientativo de 20%.");
  if (allocationsResult.filter((item) => item.status === "Dentro da faixa planejada").length >= Math.ceil(allocationsResult.length / 2)) positives.push("A maioria das classes está dentro das bandas planejadas.");
  if (largestPositionPercent > 20) attentionPoints.push(`Maior posição representa ${largestPositionPercent.toFixed(1)}% da carteira.`);
  allocationsResult.filter((item) => item.status !== "Dentro da faixa planejada").forEach((item) => attentionPoints.push(`${item.label}: ${item.status.toLowerCase()} por ${Math.abs(item.driftPp).toFixed(1)} p.p.`));
  const emergencyTarget = Math.max(0, profile.answers.monthlyExpenses * profile.answers.emergencyMonths);
  const emergencyDeficit = Math.max(0, emergencyTarget - profile.answers.emergencyCurrentValue);
  if (emergencyDeficit > 0) attentionPoints.unshift(`Reserva de emergência apresenta déficit de ${emergencyDeficit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`);
  return { totalEquity, allocations: allocationsResult, concentrationIndex, effectivePositions, largestPositionPercent, topFivePercent, pillars, score, classification, confidence, confidenceReasons, positives, attentionPoints, emergencyTarget, emergencyDeficit, monthlyIncome: lines.reduce((sum, line) => sum + line.estimatedDividendsMonth, 0), annualIncome: lines.reduce((sum, line) => sum + line.estimatedDividendsYear, 0), nextReview: nextReviewDate(profile.reviewFrequency) };
}

export function simulateContribution(analysis: PortfolioMethodAnalysis, amount: number, strategy: "proporcional" | "maior_desvio"): ContributionSuggestion[] {
  if (!Number.isFinite(amount) || amount <= 0 || analysis.totalEquity < 0) return [];
  const deficits = analysis.allocations.map((item) => ({ ...item, deficit: Math.max(item.adjustmentValue, 0) })).filter((item) => item.deficit > 0);
  if (!deficits.length) return [];
  const result: ContributionSuggestion[] = [];
  if (strategy === "proporcional") { const totalDeficit = deficits.reduce((sum, item) => sum + item.deficit, 0); deficits.forEach((item) => { const allocation = Math.min(item.deficit, amount * item.deficit / totalDeficit); result.push({ classId: item.id, label: item.label, amount: allocation, beforePercent: item.currentPercent, afterPercent: (item.currentValue + allocation) / (analysis.totalEquity + amount) * 100, remainingDeficit: Math.max(0, item.deficit - allocation) }); }); }
  else { let remaining = amount; [...deficits].sort((a, b) => a.driftPp - b.driftPp).forEach((item) => { if (remaining <= 0) return; const allocation = Math.min(item.deficit, remaining); remaining -= allocation; result.push({ classId: item.id, label: item.label, amount: allocation, beforePercent: item.currentPercent, afterPercent: (item.currentValue + allocation) / (analysis.totalEquity + amount) * 100, remainingDeficit: Math.max(0, item.deficit - allocation) }); }); }
  return result.filter((item) => item.amount > 0.005);
}
