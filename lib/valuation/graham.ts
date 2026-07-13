import type { Asset } from "@/lib/types";

export type GrahamConfidence = "alta" | "media" | "baixa" | "insuficiente";

export type GrahamSettings = {
  defaultY: number;
  minGrowth: number;
  maxGrowth: number;
  scoreWeight: number;
  enabled: boolean;
  clientsCanEditGrowth: boolean;
  clientsCanEditY: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export type GrahamAnalysis = {
  applicable: boolean;
  reason?: string;
  ticker: string;
  price?: number;
  lpa?: number;
  vpa?: number;
  value?: number;
  difference?: number;
  potential?: number | null;
  safetyMargin?: number | null;
  classification?: string;
  confidence: GrahamConfidence;
  confidenceReason: string;
  source: string;
  sourceUrl?: string;
  priceDate?: string;
  lpaDate?: string;
  vpaDate?: string;
};

export type GrahamScenario = {
  label: string;
  growth: number;
  y: number;
  value: number | null;
  potential: number | null;
  safetyMargin: number | null;
  source: "automatico" | "usuario" | "administrador";
};

export const defaultGrahamSettings: GrahamSettings = {
  defaultY: 5.5,
  minGrowth: 0,
  maxGrowth: 20,
  scoreWeight: 10,
  enabled: true,
  clientsCanEditGrowth: true,
  clientsCanEditY: false
};

export function calcularNumeroGraham(lpa: number, vpa: number): number | null {
  if (!Number.isFinite(lpa) || !Number.isFinite(vpa) || lpa <= 0 || vpa <= 0) {
    return null;
  }

  return Math.sqrt(22.5 * lpa * vpa);
}

export function calcularGrahamCrescimento(
  lpa: number,
  crescimentoPercentual: number,
  rendimentoTitulosAAA: number
): number | null {
  if (
    !Number.isFinite(lpa) ||
    !Number.isFinite(crescimentoPercentual) ||
    !Number.isFinite(rendimentoTitulosAAA) ||
    lpa <= 0 ||
    crescimentoPercentual < 0 ||
    rendimentoTitulosAAA <= 0
  ) {
    return null;
  }

  return (lpa * (8.5 + 2 * crescimentoPercentual) * 4.4) / rendimentoTitulosAAA;
}

export function calcularDiasRestantes(expiresAt: Date | string, currentDate = new Date()): number {
  const expiration = new Date(expiresAt);
  const now = new Date(currentDate);

  if (Number.isNaN(expiration.getTime()) || Number.isNaN(now.getTime())) return 0;

  expiration.setHours(23, 59, 59, 999);
  now.setHours(0, 0, 0, 0);

  const difference = expiration.getTime() - now.getTime();
  return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
}

export function calcularPotencial(valorEstimado: number | null, precoAtual: number): number | null {
  if (!valorEstimado || !Number.isFinite(valorEstimado) || !Number.isFinite(precoAtual) || precoAtual <= 0) return null;
  return ((valorEstimado - precoAtual) / precoAtual) * 100;
}

export function calcularMargemSeguranca(valorEstimado: number | null, precoAtual: number): number | null {
  if (!valorEstimado || !Number.isFinite(valorEstimado) || !Number.isFinite(precoAtual) || precoAtual <= 0) return null;
  return ((valorEstimado - precoAtual) / valorEstimado) * 100;
}

export function classificarNumeroGraham(precoAtual: number, valorGraham: number | null) {
  if (!valorGraham || valorGraham <= 0 || !Number.isFinite(precoAtual) || precoAtual <= 0) {
    return "Dados insuficientes";
  }

  const relacaoPrecoValor = precoAtual / valorGraham;
  if (relacaoPrecoValor <= 0.7) return "Margem de segurança alta";
  if (relacaoPrecoValor <= 0.9) return "Margem de segurança moderada";
  if (relacaoPrecoValor <= 1.1) return "Próximo ao valor estimado";
  return "Acima do valor estimado";
}

function rounded(value: number) {
  return Number(value.toFixed(2));
}

function metricDate(asset: Asset) {
  return asset.lastUpdatedAt ?? asset.updatedAt;
}

export function deriveGrahamInputs(asset: Asset) {
  const price = asset.price;
  const explicitLpa = asset.metrics.eps;
  const explicitVpa = asset.metrics.bookValuePerShare;
  const derivedLpa = asset.metrics.pl && asset.metrics.pl > 0 && price > 0 ? price / asset.metrics.pl : undefined;
  const derivedVpa = asset.metrics.pvp && asset.metrics.pvp > 0 && price > 0 ? price / asset.metrics.pvp : undefined;

  return {
    price,
    lpa: explicitLpa ?? derivedLpa,
    vpa: explicitVpa ?? derivedVpa,
    lpaDate: asset.metrics.epsDate ?? metricDate(asset),
    vpaDate: asset.metrics.bookValueDate ?? metricDate(asset),
    source: asset.metrics.fundamentalsSource ?? asset.sourceLabel ?? (asset.source === "external" ? "Fornecedor externo de mercado" : "Base de indicadores do ativo"),
    sourceUrl: asset.metrics.fundamentalsSourceUrl ?? asset.sourceUrl
  };
}

export function analisarNumeroGraham(asset: Asset): GrahamAnalysis {
  const incompatible = ["FII", "ETF", "CRIPTO"].includes(asset.type);
  const inputs = deriveGrahamInputs(asset);

  if (incompatible) {
    return {
      applicable: false,
      ticker: asset.ticker,
      reason: "Dados insuficientes para calcular o Número de Graham.",
      confidence: "insuficiente",
      confidenceReason: "O método não é aplicado automaticamente a FIIs, ETFs, criptomoedas, fundos ou ativos incompatíveis.",
      source: inputs.source,
      sourceUrl: inputs.sourceUrl,
      priceDate: metricDate(asset),
      lpaDate: inputs.lpaDate,
      vpaDate: inputs.vpaDate
    };
  }

  const lpa = inputs.lpa;
  const vpa = inputs.vpa;
  const value = lpa !== undefined && vpa !== undefined ? calcularNumeroGraham(lpa, vpa) : null;

  if (!value || inputs.price <= 0 || !lpa || !vpa) {
    return {
      applicable: false,
      ticker: asset.ticker,
      price: inputs.price,
      lpa,
      vpa,
      reason: "Dados insuficientes para calcular o Número de Graham.",
      confidence: "insuficiente",
      confidenceReason: "LPA, VPA ou preço atual inválido. Nunca retornamos zero como valor justo quando o cálculo é impossível.",
      source: inputs.source,
      sourceUrl: inputs.sourceUrl,
      priceDate: metricDate(asset),
      lpaDate: inputs.lpaDate,
      vpaDate: inputs.vpaDate
    };
  }

  const potential = calcularPotencial(value, inputs.price);
  const safetyMargin = calcularMargemSeguranca(value, inputs.price);
  const generatedOrMissingSource = asset.source === "generated";
  const olderFundamentals = inputs.lpaDate !== metricDate(asset) || inputs.vpaDate !== metricDate(asset);
  const confidence: GrahamConfidence = generatedOrMissingSource ? "baixa" : olderFundamentals ? "media" : "alta";
  const confidenceReason = generatedOrMissingSource
    ? "Ativo dinâmico sem demonstrações contábeis completas confirmadas."
    : olderFundamentals
      ? "LPA ou VPA possuem data-base diferente do preço atual."
      : "Preço, LPA e VPA possuem fonte identificada e data-base compatível.";

  return {
    applicable: true,
    ticker: asset.ticker,
    price: rounded(inputs.price),
    lpa: rounded(lpa),
    vpa: rounded(vpa),
    value: rounded(value),
    difference: rounded(value - inputs.price),
    potential: potential === null ? null : rounded(potential),
    safetyMargin: safetyMargin === null ? null : rounded(safetyMargin),
    classification: classificarNumeroGraham(inputs.price, value),
    confidence,
    confidenceReason,
    source: inputs.source,
    sourceUrl: inputs.sourceUrl,
    priceDate: metricDate(asset),
    lpaDate: inputs.lpaDate,
    vpaDate: inputs.vpaDate
  };
}

export function grahamScoreContribution(asset: Asset, maxWeight = defaultGrahamSettings.scoreWeight) {
  const analysis = analisarNumeroGraham(asset);
  if (!analysis.applicable || analysis.safetyMargin == null || analysis.confidence === "insuficiente") return 0;
  if (analysis.confidence === "baixa") return 0;

  const raw = analysis.safetyMargin <= 0 ? 0 : Math.min(maxWeight, (analysis.safetyMargin / 30) * maxWeight);
  const confidenceFactor = analysis.confidence === "media" ? 0.75 : 1;
  return Math.round(raw * confidenceFactor);
}

export function calcularCenariosGraham(
  lpa: number,
  rendimentoY: number,
  baseGrowth = 8,
  source: GrahamScenario["source"] = "usuario"
): GrahamScenario[] {
  const scenarios = [
    { label: "Conservador", growth: Math.max(0, baseGrowth / 2) },
    { label: "Base", growth: baseGrowth },
    { label: "Otimista", growth: baseGrowth * 1.5 }
  ];

  return scenarios.map((scenario) => ({
    label: scenario.label,
    growth: rounded(scenario.growth),
    y: rendimentoY,
    value: calcularGrahamCrescimento(lpa, scenario.growth, rendimentoY),
    potential: null,
    safetyMargin: null,
    source
  }));
}

export function aplicarPrecoNosCenarios(scenarios: GrahamScenario[], precoAtual: number): GrahamScenario[] {
  return scenarios.map((scenario) => ({
    ...scenario,
    value: scenario.value === null ? null : rounded(scenario.value),
    potential: scenario.value === null ? null : rounded(calcularPotencial(scenario.value, precoAtual) ?? 0),
    safetyMargin: scenario.value === null ? null : rounded(calcularMargemSeguranca(scenario.value, precoAtual) ?? 0)
  }));
}
