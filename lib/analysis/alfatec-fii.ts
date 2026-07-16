import type { Asset } from "@/lib/types";

export type FiiKind =
  | "tijolo"
  | "papel"
  | "hibrido"
  | "fof"
  | "desenvolvimento"
  | "renda_urbana"
  | "infraestrutura"
  | "outro";

export type FiiConfidence = "Alta" | "Media" | "Baixa" | "Insuficiente";
export type FiiScoreClassification = "Excelente" | "Muito bom" | "Bom" | "Regular" | "Atencao" | "Risco elevado" | "Dados insuficientes";
export type FiiIncomeQuality = "sustentavel" | "aparentemente sustentavel" | "atencao" | "dependente de receitas extraordinarias" | "dados insuficientes";

export type FiiScoreKey =
  | "qualidade"
  | "renda"
  | "risco"
  | "valuation"
  | "gestao"
  | "liquidez"
  | "diversificacao";

export type FiiScoreBreakdown = Record<FiiScoreKey, number | null>;
export type FiiWeights = Record<FiiScoreKey, number>;

export type AlfatecFiiSettings = {
  enabled: boolean;
  referenceRate: number;
  referenceRateSource: string;
  referenceRateUpdatedAt?: string;
  minimumConfidence: FiiConfidence;
  weightsByKind: Record<FiiKind, FiiWeights>;
  updatedAt?: string;
  updatedBy?: string;
};

export type FiiDataPoint = {
  label: string;
  value?: number | string | null;
  source: string;
  baseDate?: string;
  consultedAt: string;
  status: "disponivel" | "indisponivel" | "nao_aplicavel" | "desatualizado" | "estimado" | "manual";
};

export type FiiSegmentComparison = {
  position: number | null;
  total: number;
  averageScore: number | null;
  compatibleTickers: string[];
};

export type AlfatecFiiAnalysis = {
  applicable: boolean;
  reason?: string;
  ticker: string;
  name: string;
  segment: string;
  kind: FiiKind;
  kindLabel: string;
  price: FiiDataPoint;
  pvp: FiiDataPoint;
  dividendYield: FiiDataPoint;
  recurrentDividendYield: FiiDataPoint;
  riskPremium: FiiDataPoint;
  liquidity: FiiDataPoint;
  patrimony: FiiDataPoint;
  shareholders: FiiDataPoint;
  vacancy: FiiDataPoint;
  properties: FiiDataPoint;
  ltv: FiiDataPoint;
  concentration: FiiDataPoint;
  incomeQuality: FiiIncomeQuality;
  valuationInterpretation: string;
  scores: FiiScoreBreakdown;
  weights: FiiWeights;
  score: number | null;
  classification: FiiScoreClassification;
  confidence: FiiConfidence;
  confidenceReasons: string[];
  positivePoints: string[];
  attentionPoints: string[];
  scoreExplanation: string[];
  dataSources: FiiDataPoint[];
  updatedAt: string;
};

const defaultWeights: Record<FiiKind, FiiWeights> = {
  tijolo: { qualidade: 20, renda: 20, risco: 15, valuation: 15, gestao: 10, liquidez: 5, diversificacao: 15 },
  renda_urbana: { qualidade: 20, renda: 20, risco: 15, valuation: 15, gestao: 10, liquidez: 5, diversificacao: 15 },
  papel: { qualidade: 25, renda: 15, risco: 20, valuation: 10, gestao: 10, liquidez: 5, diversificacao: 15 },
  fof: { qualidade: 25, renda: 15, risco: 10, valuation: 15, gestao: 20, liquidez: 5, diversificacao: 10 },
  hibrido: { qualidade: 20, renda: 18, risco: 16, valuation: 14, gestao: 12, liquidez: 6, diversificacao: 14 },
  desenvolvimento: { qualidade: 20, renda: 10, risco: 25, valuation: 15, gestao: 15, liquidez: 5, diversificacao: 10 },
  infraestrutura: { qualidade: 20, renda: 20, risco: 15, valuation: 15, gestao: 10, liquidez: 5, diversificacao: 15 },
  outro: { qualidade: 18, renda: 18, risco: 18, valuation: 16, gestao: 10, liquidez: 8, diversificacao: 12 }
};

export const defaultAlfatecFiiSettings: AlfatecFiiSettings = {
  enabled: true,
  referenceRate: 6.5,
  referenceRateSource: "Parametro configurado pelo administrador",
  minimumConfidence: "Media",
  weightsByKind: defaultWeights
};

const confidenceRank: Record<FiiConfidence, number> = { Insuficiente: 0, Baixa: 1, Media: 2, Alta: 3 };

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function maxAvailable(...values: Array<number | undefined>) {
  const clean = values.filter((value): value is number => finite(value));
  return clean.length ? Math.max(...clean) : null;
}

function scoreFromRange(value: number | undefined, best: number, worst: number, inverse = false) {
  if (!finite(value)) return null;
  const ratio = inverse ? (worst - value) / (worst - best) : (value - worst) / (best - worst);
  return clamp(ratio * 100);
}

function weightedAverage(scores: FiiScoreBreakdown, weights: FiiWeights) {
  let availableWeight = 0;
  let weighted = 0;
  let totalWeight = 0;
  (Object.keys(weights) as FiiScoreKey[]).forEach((key) => {
    totalWeight += weights[key];
    const score = scores[key];
    if (score !== null) {
      availableWeight += weights[key];
      weighted += score * weights[key];
    }
  });
  return {
    value: availableWeight > 0 ? weighted / availableWeight : null,
    availableWeight,
    totalWeight
  };
}

function dataSource(asset: Asset, label: string) {
  if (asset.source === "external") return asset.sourceLabel ?? "Provedor externo de dados financeiros";
  if (asset.source === "generated") return `${label}: cadastro dinamico sem dados validados`;
  return asset.sourceLabel ?? "Base interna/fornecedor cadastrado";
}

function dataPoint(asset: Asset, label: string, value: number | string | undefined | null, status?: FiiDataPoint["status"]): FiiDataPoint {
  const isMissing = value === undefined || value === null || value === "";
  return {
    label,
    value: isMissing ? null : value,
    source: dataSource(asset, label),
    baseDate: asset.lastUpdatedAt ?? asset.updatedAt,
    consultedAt: asset.consultedAt ?? new Date().toISOString(),
    status: status ?? (isMissing ? "indisponivel" : asset.source === "generated" ? "estimado" : "disponivel")
  };
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function classificarTipoFii(asset: Asset): { kind: FiiKind; label: string } {
  const segment = normalizeText(asset.segment);
  const tags = normalizeText(asset.tags.join(" "));
  const name = normalizeText(asset.name);
  const text = `${segment} ${tags} ${name}`;

  if (text.includes("fundo de fundos") || text.includes("fof") || asset.ticker === "BCFF11") return { kind: "fof", label: "fundo de fundos" };
  if (text.includes("hibrid")) return { kind: "hibrido", label: "FII hibrido" };
  if (text.includes("papel") || text.includes("recebive") || text.includes("credito")) return { kind: "papel", label: "FII de papel" };
  if (text.includes("desenvolvimento")) return { kind: "desenvolvimento", label: "FII de desenvolvimento" };
  if (text.includes("infra")) return { kind: "infraestrutura", label: "FII de infraestrutura" };
  if (text.includes("renda urbana")) return { kind: "renda_urbana", label: "FII de renda urbana" };
  if (["logistica", "shopping", "lajes", "agro", "varejo", "hospital", "educacional"].some((term) => text.includes(term))) return { kind: "tijolo", label: "FII de tijolo" };
  return { kind: "outro", label: "outro tipo de FII" };
}

export function classificarScoreAlfatecFii(score: number | null): FiiScoreClassification {
  if (score === null) return "Dados insuficientes";
  if (score >= 90) return "Excelente";
  if (score >= 80) return "Muito bom";
  if (score >= 70) return "Bom";
  if (score >= 60) return "Regular";
  if (score >= 50) return "Atencao";
  return "Risco elevado";
}

function scorePvp(pvp?: number, kind?: FiiKind) {
  if (!finite(pvp) || pvp <= 0) return null;
  if (kind === "desenvolvimento") return clamp(100 - Math.abs(pvp - 0.85) * 95);
  if (pvp < 0.72) return 58;
  if (pvp <= 0.95) return 88;
  if (pvp <= 1.08) return 78;
  if (pvp <= 1.2) return 62;
  return clamp(50 - (pvp - 1.2) * 85);
}

function scoreDividendYield(dy?: number) {
  if (!finite(dy) || dy <= 0) return null;
  if (dy > 16) return 58;
  if (dy >= 9 && dy <= 12.5) return 92;
  if (dy > 12.5) return 78;
  return clamp(45 + dy * 4.5);
}

function scoreLiquidity(liquidity?: number) {
  if (!finite(liquidity) || liquidity <= 0) return null;
  return clamp(Math.log10(liquidity) * 14 - 30);
}

function scoreVacancy(vacancy?: number) {
  if (!finite(vacancy)) return null;
  return clamp(100 - vacancy * 4.4);
}

function scoreVolatility(volatility?: number, drawdown?: number) {
  if (!finite(volatility) && !finite(drawdown)) return null;
  const volScore = finite(volatility) ? clamp(100 - volatility * 2.2) : null;
  const drawScore = finite(drawdown) ? clamp(100 - Math.abs(drawdown) * 2.4) : null;
  const values = [volScore, drawScore].filter((item): item is number => item !== null);
  return values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : null;
}

function scoreDiversification(asset: Asset, kind: FiiKind) {
  const properties = asset.metrics.properties;
  const shareholders = asset.metrics.shareholders;
  const patrimony = asset.metrics.patrimony;
  const pieces: number[] = [];
  if (finite(shareholders)) pieces.push(clamp(Math.log10(Math.max(shareholders, 1)) * 18 - 18));
  if (finite(patrimony)) pieces.push(clamp(Math.log10(Math.max(patrimony, 1)) * 10 - 20));
  if (kind !== "papel" && finite(properties)) pieces.push(clamp(properties * 4.2, 0, 95));
  if (kind === "papel" && pieces.length < 2) return null;
  return pieces.length ? pieces.reduce((sum, item) => sum + item, 0) / pieces.length : null;
}

function scoreManagement(asset: Asset) {
  const managerKnown = Boolean(asset.manager && !asset.manager.toLowerCase().includes("nao informada") && !asset.manager.toLowerCase().includes("não informada"));
  const adminKnown = Boolean(asset.administrator && !asset.administrator.toLowerCase().includes("nao informada") && !asset.administrator.toLowerCase().includes("não informada"));
  if (!managerKnown && !adminKnown) return null;
  return managerKnown && adminKnown ? 78 : 62;
}

function scoreQuality(asset: Asset, kind: FiiKind) {
  const vacancy = maxAvailable(asset.metrics.vacancyPhysical, asset.metrics.vacancyFinancial);
  const pieces: number[] = [];
  if (kind !== "papel" && vacancy !== null) pieces.push(scoreVacancy(vacancy) ?? 0);
  const diversification = scoreDiversification(asset, kind);
  if (diversification !== null) pieces.push(diversification);
  const risk = scoreVolatility(asset.metrics.volatility, asset.metrics.drawdown);
  if (risk !== null) pieces.push(risk);
  const management = scoreManagement(asset);
  if (management !== null) pieces.push(management);
  return pieces.length ? pieces.reduce((sum, item) => sum + item, 0) / pieces.length : null;
}

function scoreIncome(asset: Asset) {
  const dyScore = scoreDividendYield(asset.metrics.dividendYield);
  if (dyScore === null) return null;
  const volScore = scoreVolatility(asset.metrics.volatility, asset.metrics.drawdown);
  return volScore === null ? dyScore : dyScore * 0.72 + volScore * 0.28;
}

function scoreRisk(asset: Asset, kind: FiiKind) {
  const pieces: number[] = [];
  const vol = scoreVolatility(asset.metrics.volatility, asset.metrics.drawdown);
  if (vol !== null) pieces.push(vol);
  if (kind !== "papel") {
    const vacancy = maxAvailable(asset.metrics.vacancyPhysical, asset.metrics.vacancyFinancial);
    if (vacancy !== null) pieces.push(scoreVacancy(vacancy) ?? 0);
  }
  if (finite(asset.metrics.dividendYield) && asset.metrics.dividendYield > 15) pieces.push(55);
  return pieces.length ? pieces.reduce((sum, item) => sum + item, 0) / pieces.length : null;
}

function scoreValuation(asset: Asset, kind: FiiKind, settings: AlfatecFiiSettings) {
  const pieces: number[] = [];
  const pvp = scorePvp(asset.metrics.pvp, kind);
  if (pvp !== null) pieces.push(pvp);
  if (finite(asset.metrics.dividendYield) && finite(settings.referenceRate)) {
    pieces.push(clamp(52 + (asset.metrics.dividendYield - settings.referenceRate) * 8));
  }
  const quality = scoreQuality(asset, kind);
  if (quality !== null) pieces.push(quality * 0.35 + 45);
  return pieces.length ? pieces.reduce((sum, item) => sum + item, 0) / pieces.length : null;
}

export function avaliarQualidadeRendimento(asset: Asset): FiiIncomeQuality {
  const dy = asset.metrics.dividendYield;
  if (!finite(dy) || dy <= 0) return "dados insuficientes";
  if (dy > 16) return "dependente de receitas extraordinarias";
  const volatility = asset.metrics.volatility ?? 0;
  if (dy > 13.5 || volatility > 20) return "atencao";
  if (dy >= 8 && dy <= 12.5 && volatility <= 16) return "aparentemente sustentavel";
  return "sustentavel";
}

export function interpretarValuationFii(asset: Asset, kind: FiiKind, riskPremium?: number | null) {
  const pvp = asset.metrics.pvp;
  if (!finite(pvp)) return "dados insuficientes";
  const vacancy = maxAvailable(asset.metrics.vacancyPhysical, asset.metrics.vacancyFinancial);
  if (pvp < 0.9 && ((vacancy !== null && vacancy > 10) || asset.risk === "Alto")) return "desconto potencialmente justificado";
  if (pvp < 0.95 && finite(riskPremium) && riskPremium >= 2.5) return "desconto atrativo";
  if (pvp < 1) return "desconto potencialmente justificado";
  if (pvp <= 1.08) return "preco proximo ao valor patrimonial";
  if (pvp <= 1.2 && kind !== "desenvolvimento") return "premio justificado";
  return "premio elevado";
}

function confidenceFrom(asset: Asset, availableWeight: number, totalWeight: number, sources: FiiDataPoint[]) {
  const reasons: string[] = [];
  if (asset.source === "generated") reasons.push("Ativo dinamico sem dados patrimoniais validados.");
  const availableFields = sources.filter((item) => item.status === "disponivel" || item.status === "manual").length;
  const totalFields = sources.length || 1;
  const coverage = availableWeight / Math.max(totalWeight, 1);
  if (availableFields / totalFields < 0.55) reasons.push("Parte relevante dos indicadores esta indisponivel.");
  if (coverage < 0.65) reasons.push("Score calculado parcialmente por ausencia de dados relevantes.");
  if (!asset.lastUpdatedAt && asset.source !== "external") reasons.push("Fonte patrimonial possui periodicidade diferente do preco de mercado.");
  if (sources.some((item) => item.status === "estimado")) reasons.push("Ha dados estimados ou nao validados no cadastro.");

  let confidence: FiiConfidence = "Alta";
  if (asset.source === "generated" || coverage < 0.45) confidence = "Insuficiente";
  else if (coverage < 0.65 || availableFields / totalFields < 0.55) confidence = "Baixa";
  else if (coverage < 0.84 || asset.source === "local") confidence = "Media";
  if (reasons.length === 0) reasons.push("Indicadores principais disponiveis e coerentes para o metodo.");
  return { confidence, reasons };
}

function scoreDescription(label: string, score: number | null, weight: number) {
  if (score === null) return `${label}: dado indisponivel, peso ${weight}% nao usado no calculo.`;
  return `${label}: ${Math.round(score)}/100 com peso ${weight}%.`;
}

export function normalizeAlfatecFiiSettings(settings?: Partial<AlfatecFiiSettings>): AlfatecFiiSettings {
  const mergedWeights = { ...defaultWeights, ...(settings?.weightsByKind ?? {}) };
  return {
    ...defaultAlfatecFiiSettings,
    ...(settings ?? {}),
    weightsByKind: mergedWeights
  };
}

export function analisarAlfatecFii(asset: Asset, settingsInput?: Partial<AlfatecFiiSettings>): AlfatecFiiAnalysis {
  const settings = normalizeAlfatecFiiSettings(settingsInput);
  const { kind, label } = classificarTipoFii(asset);
  const updatedAt = asset.lastUpdatedAt ?? asset.updatedAt ?? new Date().toISOString();
  const unavailable: FiiScoreBreakdown = { qualidade: null, renda: null, risco: null, valuation: null, gestao: null, liquidez: null, diversificacao: null };

  const price = dataPoint(asset, "preco atual", asset.price);
  const pvp = dataPoint(asset, "P/VP", asset.metrics.pvp);
  const dy = dataPoint(asset, "Dividend Yield", asset.metrics.dividendYield);
  const recurrentDy = dataPoint(asset, "DY recorrente", asset.metrics.dividendYield, asset.metrics.dividendYield ? "estimado" : "indisponivel");
  const premium = finite(asset.metrics.dividendYield) ? round(asset.metrics.dividendYield - settings.referenceRate, 2) : null;
  const riskPremium = dataPoint(asset, "premio de risco", premium, premium === null ? "indisponivel" : settings.referenceRateSource ? "manual" : "disponivel");
  const liquidity = dataPoint(asset, "liquidez media diaria", asset.liquidity);
  const patrimony = dataPoint(asset, "patrimonio liquido", asset.metrics.patrimony);
  const shareholders = dataPoint(asset, "numero de cotistas", asset.metrics.shareholders);
  const vacancyValue = maxAvailable(asset.metrics.vacancyPhysical, asset.metrics.vacancyFinancial);
  const vacancy = dataPoint(asset, "vacancia", vacancyValue, kind === "papel" ? "nao_aplicavel" : undefined);
  const properties = dataPoint(asset, "quantidade de imoveis", asset.metrics.properties, kind === "papel" ? "nao_aplicavel" : undefined);
  const ltv = dataPoint(asset, "LTV", null, kind === "papel" ? "indisponivel" : "nao_aplicavel");
  const concentration = dataPoint(asset, "concentracao", null, "indisponivel");
  const dataSources = [price, pvp, dy, recurrentDy, riskPremium, liquidity, patrimony, shareholders, vacancy, properties, ltv, concentration];

  if (asset.type !== "FII") {
    return {
      applicable: false,
      reason: "O Metodo AlfaTec FIIs e aplicavel somente a fundos imobiliarios.",
      ticker: asset.ticker,
      name: asset.name,
      segment: asset.segment,
      kind,
      kindLabel: label,
      price,
      pvp,
      dividendYield: dy,
      recurrentDividendYield: recurrentDy,
      riskPremium,
      liquidity,
      patrimony,
      shareholders,
      vacancy,
      properties,
      ltv,
      concentration,
      incomeQuality: "dados insuficientes",
      valuationInterpretation: "dados insuficientes",
      scores: unavailable,
      weights: settings.weightsByKind[kind],
      score: null,
      classification: "Dados insuficientes",
      confidence: "Insuficiente",
      confidenceReasons: ["Ativo incompatível com o método."],
      positivePoints: [],
      attentionPoints: ["Nao aplicar Graham, PEG ou P/L como criterio principal para FIIs."],
      scoreExplanation: [],
      dataSources,
      updatedAt
    };
  }

  if (!settings.enabled || asset.source === "generated") {
    return {
      applicable: false,
      reason: asset.source === "generated" ? "Dados reais insuficientes para calcular o Score AlfaTec FIIs." : "Metodo desativado pelo administrador.",
      ticker: asset.ticker,
      name: asset.name,
      segment: asset.segment,
      kind,
      kindLabel: label,
      price,
      pvp,
      dividendYield: dy,
      recurrentDividendYield: recurrentDy,
      riskPremium,
      liquidity,
      patrimony,
      shareholders,
      vacancy,
      properties,
      ltv,
      concentration,
      incomeQuality: "dados insuficientes",
      valuationInterpretation: "dados insuficientes",
      scores: unavailable,
      weights: settings.weightsByKind[kind],
      score: null,
      classification: "Dados insuficientes",
      confidence: "Insuficiente",
      confidenceReasons: [asset.source === "generated" ? "Cadastro dinamico nao deve ser tratado como dado real." : "Calculo administrativo desativado."],
      positivePoints: [],
      attentionPoints: ["Dado indisponivel para calculo confiavel do metodo."],
      scoreExplanation: [],
      dataSources,
      updatedAt
    };
  }

  const weights = settings.weightsByKind[kind] ?? settings.weightsByKind.outro;
  const scores: FiiScoreBreakdown = {
    qualidade: scoreQuality(asset, kind),
    renda: scoreIncome(asset),
    risco: scoreRisk(asset, kind),
    valuation: scoreValuation(asset, kind, settings),
    gestao: scoreManagement(asset),
    liquidez: scoreLiquidity(asset.liquidity),
    diversificacao: scoreDiversification(asset, kind)
  };
  const aggregate = weightedAverage(scores, weights);
  const confidence = confidenceFrom(asset, aggregate.availableWeight, aggregate.totalWeight, dataSources);
  let finalScore = aggregate.value === null ? null : Math.round(aggregate.value);
  if (finalScore !== null && confidence.confidence === "Insuficiente") finalScore = Math.min(finalScore, 49);
  if (finalScore !== null && confidence.confidence === "Baixa") finalScore = Math.min(finalScore, 69);

  const incomeQuality = avaliarQualidadeRendimento(asset);
  const valuationInterpretation = interpretarValuationFii(asset, kind, premium);
  const positives: string[] = [];
  const attention: string[] = [];
  if ((scores.liquidez ?? 0) >= 75) positives.push("boa liquidez para acompanhamento e entrada/saida.");
  if ((scores.diversificacao ?? 0) >= 75) positives.push("diversificacao operacional ou de cotistas adequada para o cadastro disponivel.");
  if (incomeQuality === "sustentavel" || incomeQuality === "aparentemente sustentavel") positives.push("rendimentos aparentemente consistentes frente aos indicadores disponiveis.");
  if (finite(asset.metrics.pvp) && asset.metrics.pvp < 1) attention.push("P/VP inferior a 1 nao significa automaticamente que o fundo esta barato.");
  if (incomeQuality === "dependente de receitas extraordinarias") attention.push("Parte do rendimento recente pode ter sido influenciada por receitas extraordinarias.");
  if ((scores.risco ?? 100) < 60) attention.push("risco elevado por volatilidade, drawdown, vacancia ou dados operacionais.");
  if (kind === "papel") attention.push("LTV, garantias e qualidade de credito precisam ser confirmados em relatorios do fundo.");
  if (concentration.status === "indisponivel") attention.push("concentracao por locatario, devedor ou ativo ainda nao disponivel na base.");

  const labels: Record<FiiScoreKey, string> = {
    qualidade: "Qualidade",
    renda: "Renda",
    risco: "Risco",
    valuation: "Valuation",
    gestao: "Gestao",
    liquidez: "Liquidez",
    diversificacao: "Diversificacao"
  };

  return {
    applicable: true,
    ticker: asset.ticker,
    name: asset.name,
    segment: asset.segment,
    kind,
    kindLabel: label,
    price,
    pvp,
    dividendYield: dy,
    recurrentDividendYield: recurrentDy,
    riskPremium,
    liquidity,
    patrimony,
    shareholders,
    vacancy,
    properties,
    ltv,
    concentration,
    incomeQuality,
    valuationInterpretation,
    scores,
    weights,
    score: finalScore,
    classification: classificarScoreAlfatecFii(finalScore),
    confidence: confidence.confidence,
    confidenceReasons: confidence.reasons,
    positivePoints: positives.length ? positives : ["indicadores basicos disponiveis para leitura inicial."],
    attentionPoints: attention.length ? attention : ["acompanhar relatorios gerenciais e eventos nao recorrentes antes de decidir."],
    scoreExplanation: (Object.keys(scores) as FiiScoreKey[]).map((key) => scoreDescription(labels[key], scores[key], weights[key])),
    dataSources,
    updatedAt
  };
}

export function compararFiiPorSegmento(asset: Asset, assets: Asset[], settings?: Partial<AlfatecFiiSettings>): FiiSegmentComparison {
  const analysis = analisarAlfatecFii(asset, settings);
  if (!analysis.applicable || analysis.score === null) return { position: null, total: 0, averageScore: null, compatibleTickers: [] };
  const compatible = assets
    .filter((item) => item.type === "FII" && item.segment === asset.segment)
    .map((item) => ({ asset: item, analysis: analisarAlfatecFii(item, settings) }))
    .filter((item) => item.analysis.score !== null)
    .sort((a, b) => (b.analysis.score ?? 0) - (a.analysis.score ?? 0));
  const position = compatible.findIndex((item) => item.asset.ticker === asset.ticker);
  const averageScore = compatible.length
    ? compatible.reduce((sum, item) => sum + (item.analysis.score ?? 0), 0) / compatible.length
    : null;
  return {
    position: position >= 0 ? position + 1 : null,
    total: compatible.length,
    averageScore: averageScore === null ? null : Math.round(averageScore),
    compatibleTickers: compatible.map((item) => item.asset.ticker)
  };
}

export function fiiConfidenceMeetsMinimum(confidence: FiiConfidence, minimum: FiiConfidence) {
  return confidenceRank[confidence] >= confidenceRank[minimum];
}

