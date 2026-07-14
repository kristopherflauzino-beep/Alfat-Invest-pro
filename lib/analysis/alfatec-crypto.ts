export type CryptoCategory = "monetary" | "payment" | "smart_contract" | "infrastructure" | "interoperability" | "oracle" | "defi" | "governance" | "exchange" | "layer_1" | "layer_2" | "stablecoin" | "rwa" | "ai" | "gaming" | "nft" | "memecoin" | "other";
export type CryptoConfidence = "Alta" | "Media" | "Baixa" | "Insuficiente";
export type CryptoPillar = "fundamentals" | "network" | "tokenomics" | "security" | "market" | "development" | "onChainValuation" | "risk";
export type CryptoWeights = Record<CryptoPillar, number>;

export type CryptoMarketSnapshot = {
  ticker: string; name: string; price: number | null; currency: string;
  change24h: number | null; marketCap: number | null; fullyDilutedValuation: number | null;
  volume24h: number | null; circulatingSupply: number | null; totalSupply: number | null;
  maxSupply: number | null; marketCapRank: number | null; ath: number | null;
  athChangePercent: number | null; genesisDate: string | null; categories: string[];
  blockTimeMinutes: number | null; hashingAlgorithm: string | null;
  developer: { commits4Weeks: number | null; contributors: number | null; stars: number | null; forks: number | null };
  onChain?: { activeAddresses?: number | null; transactions24h?: number | null; tvl?: number | null; protocolRevenue?: number | null; mvrv?: number | null; nvt?: number | null; validators?: number | null; annualInflation?: number | null; holderConcentration?: number | null };
  source: string; sourceUrl: string; updatedAt: string; consultedAt: string;
  status: "real" | "estimated" | "unavailable";
};

export type CryptoSettings = { enabled: boolean; minimumConfidence: CryptoConfidence; weightsByCategory: Record<CryptoCategory, CryptoWeights>; updatedAt?: string; updatedBy?: string };
export type CryptoPillarScore = { key: CryptoPillar; label: string; score: number | null; weight: number; contribution: number | null; explanation: string };
export type AlfatecCryptoAnalysis = {
  ticker: string; name: string; category: CryptoCategory; categoryLabel: string; secondaryCategory?: string;
  applicable: boolean; score: number | null; classification: string; confidence: CryptoConfidence;
  confidenceReasons: string[]; pillars: CryptoPillarScore[]; positives: string[];
  attentionPoints: string[]; risks: string[]; snapshot: CryptoMarketSnapshot; unavailableIndicators: string[];
};

const generic: CryptoWeights = { fundamentals: 25, network: 20, tokenomics: 15, security: 15, market: 10, development: 5, onChainValuation: 5, risk: 5 };
const monetary: CryptoWeights = { fundamentals: 20, network: 20, tokenomics: 20, security: 25, market: 10, development: 0, onChainValuation: 5, risk: 0 };
const smart: CryptoWeights = { fundamentals: 15, network: 25, tokenomics: 20, security: 20, market: 10, development: 10, onChainValuation: 0, risk: 0 };
const defi: CryptoWeights = { fundamentals: 15, network: 20, tokenomics: 15, security: 20, market: 10, development: 5, onChainValuation: 10, risk: 5 };
const stable: CryptoWeights = { fundamentals: 25, network: 5, tokenomics: 20, security: 20, market: 20, development: 0, onChainValuation: 0, risk: 10 };
const meme: CryptoWeights = { fundamentals: 5, network: 5, tokenomics: 20, security: 15, market: 25, development: 0, onChainValuation: 0, risk: 30 };
const categoryKeys: CryptoCategory[] = ["monetary", "payment", "smart_contract", "infrastructure", "interoperability", "oracle", "defi", "governance", "exchange", "layer_1", "layer_2", "stablecoin", "rwa", "ai", "gaming", "nft", "memecoin", "other"];

export const cryptoCategoryLabels: Record<CryptoCategory, string> = {
  monetary: "Bitcoin e ativo monetario", payment: "Moeda de pagamento", smart_contract: "Blockchain de contratos inteligentes",
  infrastructure: "Infraestrutura blockchain", interoperability: "Interoperabilidade", oracle: "Oraculo", defi: "Protocolo DeFi",
  governance: "Token de governanca", exchange: "Token de corretora", layer_1: "Layer 1", layer_2: "Layer 2 e escalabilidade", stablecoin: "Stablecoin",
  rwa: "Ativo do mundo real (RWA)", ai: "Inteligencia artificial", gaming: "Jogos", nft: "NFT e infraestrutura relacionada",
  memecoin: "Memecoin", other: "Outro criptoativo"
};

function weightsFor(category: CryptoCategory) {
  if (category === "monetary") return monetary;
  if (["smart_contract", "layer_1", "layer_2", "infrastructure"].includes(category)) return smart;
  if (["defi", "oracle", "governance"].includes(category)) return defi;
  if (category === "stablecoin") return stable;
  if (category === "memecoin") return meme;
  return generic;
}

export const defaultCryptoSettings: CryptoSettings = {
  enabled: true, minimumConfidence: "Baixa",
  weightsByCategory: Object.fromEntries(categoryKeys.map((key) => [key, { ...weightsFor(key) }])) as Record<CryptoCategory, CryptoWeights>
};

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const clamp = (value: number) => Math.max(0, Math.min(100, value));
function average(values: Array<number | null | undefined>) { const list = values.filter(finite); return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null; }
const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function classifyCrypto(snapshot: Pick<CryptoMarketSnapshot, "ticker" | "categories">): { primary: CryptoCategory; secondary?: string } {
  const ticker = snapshot.ticker.toUpperCase(); const text = normalized(snapshot.categories.join(" "));
  if (["USDT", "USDC", "DAI", "FDUSD", "USDE"].includes(ticker) || text.includes("stablecoin")) return { primary: "stablecoin" };
  if (["DOGE", "SHIB", "PEPE", "BONK", "WIF"].includes(ticker) || text.includes("meme")) return { primary: "memecoin" };
  if (ticker === "BTC" || text.includes("store of value")) return { primary: "monetary" };
  if (["LINK", "PYTH"].includes(ticker) || text.includes("oracle")) return { primary: "oracle", secondary: "Infraestrutura blockchain" };
  if (["AAVE", "UNI", "MKR", "CRV"].includes(ticker) || text.includes("decentralized finance") || text.includes("defi")) return { primary: "defi" };
  if (text.includes("layer 2") || text.includes("scaling")) return { primary: "layer_2" };
  if (text.includes("artificial intelligence")) return { primary: "ai" };
  if (text.includes("gaming") || text.includes("gamefi")) return { primary: "gaming" };
  if (text.includes("real world asset") || text.includes("rwa")) return { primary: "rwa" };
  if (text.includes("interoperability")) return { primary: "interoperability" };
  if (text.includes("exchange-based") || ["BNB", "OKB", "CRO"].includes(ticker)) return { primary: "exchange" };
  if (text.includes("layer 1")) return { primary: "layer_1", secondary: "Blockchain de contratos inteligentes" };
  if (text.includes("smart contract")) return { primary: "smart_contract" };
  if (text.includes("infrastructure")) return { primary: "infrastructure" };
  if (text.includes("payment")) return { primary: "payment" };
  if (text.includes("nft")) return { primary: "nft" };
  return { primary: "other" };
}

export function normalizeCryptoSettings(input?: Partial<CryptoSettings> | null): CryptoSettings {
  const result = { ...defaultCryptoSettings, ...(input ?? {}), weightsByCategory: { ...defaultCryptoSettings.weightsByCategory, ...(input?.weightsByCategory ?? {}) } };
  categoryKeys.forEach((category) => {
    const candidate = { ...defaultCryptoSettings.weightsByCategory[category], ...(result.weightsByCategory[category] ?? {}) };
    result.weightsByCategory[category] = Object.values(candidate).reduce((sum, value) => sum + value, 0) === 100 ? candidate : { ...defaultCryptoSettings.weightsByCategory[category] };
  });
  return result;
}

function yearsSince(date: string | null) { return date ? Math.max(0, (Date.now() - new Date(date).getTime()) / 31_557_600_000) : null; }
function scorePillars(s: CryptoMarketSnapshot, category: CryptoCategory): Record<CryptoPillar, number | null> {
  const rankScore = finite(s.marketCapRank) ? clamp(100 - Math.log10(Math.max(1, s.marketCapRank)) * 28) : null;
  const ageScore = finite(yearsSince(s.genesisDate)) ? clamp((yearsSince(s.genesisDate) ?? 0) * 8) : null;
  const network = average([
    finite(s.onChain?.activeAddresses) ? clamp(Math.log10(Math.max(1, s.onChain?.activeAddresses ?? 1)) * 16) : null,
    finite(s.onChain?.transactions24h) ? clamp(Math.log10(Math.max(1, s.onChain?.transactions24h ?? 1)) * 15) : null,
    finite(s.onChain?.tvl) ? clamp(Math.log10(Math.max(1, s.onChain?.tvl ?? 1)) * 6) : null
  ]);
  const supplyRatio = finite(s.circulatingSupply) && finite(s.maxSupply) && s.maxSupply > 0 ? s.circulatingSupply / s.maxSupply : finite(s.circulatingSupply) && finite(s.totalSupply) && s.totalSupply > 0 ? s.circulatingSupply / s.totalSupply : null;
  const dilution = finite(s.marketCap) && finite(s.fullyDilutedValuation) && s.fullyDilutedValuation > 0 ? s.marketCap / s.fullyDilutedValuation : null;
  const tokenomics = category === "stablecoin" && finite(s.price)
    ? clamp(100 - Math.abs(s.price - 1) * 1000)
    : average([finite(supplyRatio) ? clamp(supplyRatio * 100) : null, finite(dilution) ? clamp(dilution * 100) : null, finite(s.onChain?.annualInflation) ? clamp(100 - (s.onChain?.annualInflation ?? 0) * 4) : null, finite(s.onChain?.holderConcentration) ? clamp(100 - (s.onChain?.holderConcentration ?? 0)) : null]);
  const security = average([finite(yearsSince(s.genesisDate)) ? clamp((yearsSince(s.genesisDate) ?? 0) * 9) : null, s.hashingAlgorithm ? 78 : null, finite(s.onChain?.validators) ? clamp(Math.log10(Math.max(1, s.onChain?.validators ?? 1)) * 24) : null]);
  const market = average([finite(s.marketCap) ? clamp((Math.log10(Math.max(1, s.marketCap)) - 6) * 16) : null, finite(s.volume24h) && finite(s.marketCap) && s.marketCap > 0 ? clamp(s.volume24h / s.marketCap * 600) : null, rankScore]);
  const development = average([finite(s.developer.commits4Weeks) ? clamp(Math.log10(s.developer.commits4Weeks + 1) * 38) : null, finite(s.developer.contributors) ? clamp(Math.log10(s.developer.contributors + 1) * 32) : null, finite(s.developer.stars) ? clamp(Math.log10(s.developer.stars + 1) * 22) : null, finite(s.developer.forks) ? clamp(Math.log10(s.developer.forks + 1) * 25) : null]);
  const onChainValuation = average([finite(s.onChain?.mvrv) ? clamp(100 - Math.abs((s.onChain?.mvrv ?? 0) - 1.5) * 35) : null, finite(s.onChain?.nvt) ? clamp(100 - Math.max(0, (s.onChain?.nvt ?? 0) - 40) * 1.2) : null]);
  const risk = average([finite(s.athChangePercent) ? clamp(Math.abs(Math.min(0, s.athChangePercent))) : null, finite(s.change24h) ? clamp(Math.abs(s.change24h) * 5) : null, finite(s.marketCap) ? clamp(100 - (Math.log10(Math.max(1, s.marketCap)) - 5) * 15) : null, category === "memecoin" ? 85 : category === "stablecoin" ? 35 : null]);
  return { fundamentals: average([rankScore, ageScore, s.categories.length ? clamp(45 + Math.min(35, s.categories.length * 4)) : null]), network, tokenomics, security, market, development, onChainValuation, risk };
}

export function classifyCryptoScore(score: number | null, confidence: CryptoConfidence) {
  if (score === null) return "Dados insuficientes";
  if (score >= 90 && confidence === "Alta") return "Excepcional";
  if (score >= 80) return "Muito forte"; if (score >= 70) return "Forte"; if (score >= 60) return "Moderado";
  if (score >= 50) return "Atencao"; if (score >= 40) return "Risco elevado";
  return "Risco muito elevado ou fundamentos insuficientes";
}

const labels: Record<CryptoPillar, string> = { fundamentals: "Fundamentos e utilidade", network: "Rede e atividade on-chain", tokenomics: "Tokenomics", security: "Seguranca e descentralizacao", market: "Mercado e liquidez", development: "Desenvolvimento e ecossistema", onChainValuation: "Valuation on-chain", risk: "Indice de risco" };

export function analyzeAlfatecCrypto(snapshot: CryptoMarketSnapshot, input: Partial<CryptoSettings> = {}): AlfatecCryptoAnalysis {
  const settings = normalizeCryptoSettings(input); const category = classifyCrypto(snapshot); const weights = settings.weightsByCategory[category.primary]; const scores = scorePillars(snapshot, category.primary);
  const available = (Object.keys(scores) as CryptoPillar[]).filter((key) => weights[key] > 0 && scores[key] !== null);
  const availableWeight = available.reduce((sum, key) => sum + weights[key], 0);
  const rawScore = availableWeight ? available.reduce((sum, key) => sum + (key === "risk" ? 100 - (scores[key] ?? 100) : scores[key] ?? 0) * weights[key], 0) / availableWeight : null;
  const confidenceReasons: string[] = [];
  if (snapshot.status !== "real") confidenceReasons.push("A fonte nao confirmou o snapshot como dado real.");
  if (available.length < 7) confidenceReasons.push("Nem todos os pilares possuem dados compativeis.");
  if (!snapshot.onChain?.activeAddresses && !snapshot.onChain?.transactions24h) confidenceReasons.push("Dados de atividade on-chain indisponiveis.");
  if (!snapshot.onChain?.mvrv && !snapshot.onChain?.nvt) confidenceReasons.push("MVRV e NVT indisponiveis para esta fonte.");
  const confidence: CryptoConfidence = snapshot.status !== "real" || available.length < 3 ? "Insuficiente" : available.length >= 7 && confidenceReasons.length <= 1 ? "Alta" : available.length >= 5 ? "Media" : "Baixa";
  const applicable = settings.enabled && snapshot.status === "real" && finite(snapshot.price) && snapshot.price > 0 && availableWeight >= 35;
  const score = applicable && rawScore !== null ? Math.round(clamp(rawScore)) : null;
  const pillars = (Object.keys(scores) as CryptoPillar[]).map((key): CryptoPillarScore => ({ key, label: labels[key], score: scores[key] === null ? null : Math.round(scores[key] ?? 0), weight: weights[key], contribution: scores[key] === null || !availableWeight ? null : Number((((key === "risk" ? 100 - (scores[key] ?? 100) : scores[key] ?? 0) * weights[key]) / availableWeight).toFixed(2)), explanation: scores[key] === null ? "Dado indisponivel ou nao aplicavel a esta categoria." : key === "risk" ? "Quanto maior o indice, maior o risco observado." : "Calculado somente com metricas identificadas pela fonte." }));
  const positives: string[] = []; const attentionPoints: string[] = []; const risks: string[] = [];
  if ((scores.market ?? 0) >= 75) positives.push("Liquidez e porte de mercado em faixa forte para o modelo.");
  if ((scores.tokenomics ?? 0) >= 75) positives.push("Oferta circulante e diluicao apresentam leitura favoravel.");
  if ((scores.development ?? 0) >= 70) positives.push("Atividade de desenvolvimento identificada pela fonte.");
  if (scores.network === null) attentionPoints.push("Atividade on-chain indisponivel; score calculado parcialmente.");
  if (scores.onChainValuation === null) attentionPoints.push("MVRV e NVT nao foram usados por falta de dados compativeis.");
  if ((scores.risk ?? 0) >= 60) risks.push("Indice de risco elevado por volatilidade, drawdown ou liquidez.");
  if (category.primary === "memecoin") risks.push("Ativo predominantemente especulativo, com risco de perda extrema.");
  if (category.primary === "stablecoin") attentionPoints.push("Stablecoin avaliada por estabilidade e risco, sem potencial de valorizacao.");
  return { ticker: snapshot.ticker, name: snapshot.name, category: category.primary, categoryLabel: cryptoCategoryLabels[category.primary], secondaryCategory: category.secondary, applicable, score, classification: classifyCryptoScore(score, confidence), confidence, confidenceReasons, pillars, positives, attentionPoints, risks, snapshot, unavailableIndicators: pillars.filter((item) => item.score === null).map((item) => item.label) };
}

export function compareCryptoByCategory(target: AlfatecCryptoAnalysis, analyses: AlfatecCryptoAnalysis[]) {
  const peers = analyses.filter((item) => item.category === target.category && item.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const index = peers.findIndex((item) => item.ticker === target.ticker);
  return { position: index < 0 ? null : index + 1, total: peers.length, averageScore: peers.length ? Math.round(peers.reduce((sum, item) => sum + (item.score ?? 0), 0) / peers.length) : null };
}
