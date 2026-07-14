import { NextResponse } from "next/server";
import { analyzeAlfatecCrypto, type CryptoMarketSnapshot } from "@/lib/analysis/alfatec-crypto";

export const runtime = "nodejs";

const coinIds: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", BNB: "binancecoin", XRP: "ripple", ADA: "cardano",
  AVAX: "avalanche-2", LINK: "chainlink", POL: "polygon-ecosystem-token", UNI: "uniswap", AAVE: "aave",
  USDC: "usd-coin", USDT: "tether", DOGE: "dogecoin", SHIB: "shiba-inu"
};

type CacheEntry = { expiresAt: number; snapshot: CryptoMarketSnapshot };
const cache = new Map<string, CacheEntry>();
const numberOrNull = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;

async function loadSnapshot(ticker: string): Promise<CryptoMarketSnapshot> {
  const id = coinIds[ticker];
  if (!id) throw new Error("Criptoativo ainda nao mapeado na fonte de dados.");
  const cached = cache.get(ticker);
  if (cached && cached.expiresAt > Date.now()) return cached.snapshot;

  const headers: HeadersInit = { Accept: "application/json", "User-Agent": "Alfatec Invest Pro/1.0" };
  if (process.env.COINGECKO_API_KEY) headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  const endpoint = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=true&sparkline=false`;
  const response = await fetch(endpoint, { headers, signal: AbortSignal.timeout(10_000), next: { revalidate: 300 } });
  if (!response.ok) throw new Error(response.status === 429 ? "Limite temporario da fonte de criptoativos. Tente novamente em instantes." : "Fonte de criptoativos indisponivel agora.");
  const data = await response.json();
  const market = data?.market_data ?? {};
  const developer = data?.developer_data ?? {};
  const updatedAt = typeof data?.last_updated === "string" ? data.last_updated : new Date().toISOString();
  const snapshot: CryptoMarketSnapshot = {
    ticker,
    name: typeof data?.name === "string" ? data.name : ticker,
    price: numberOrNull(market?.current_price?.usd),
    currency: "USD",
    change24h: numberOrNull(market?.price_change_percentage_24h),
    marketCap: numberOrNull(market?.market_cap?.usd),
    fullyDilutedValuation: numberOrNull(market?.fully_diluted_valuation?.usd),
    volume24h: numberOrNull(market?.total_volume?.usd),
    circulatingSupply: numberOrNull(market?.circulating_supply),
    totalSupply: numberOrNull(market?.total_supply),
    maxSupply: numberOrNull(market?.max_supply),
    marketCapRank: numberOrNull(data?.market_cap_rank),
    ath: numberOrNull(market?.ath?.usd),
    athChangePercent: numberOrNull(market?.ath_change_percentage?.usd),
    genesisDate: typeof data?.genesis_date === "string" ? data.genesis_date : null,
    categories: Array.isArray(data?.categories) ? data.categories.filter((item: unknown): item is string => typeof item === "string") : [],
    blockTimeMinutes: numberOrNull(data?.block_time_in_minutes),
    hashingAlgorithm: typeof data?.hashing_algorithm === "string" ? data.hashing_algorithm : null,
    developer: {
      commits4Weeks: numberOrNull(developer?.commit_count_4_weeks),
      contributors: numberOrNull(developer?.pull_request_contributors),
      stars: numberOrNull(developer?.stars),
      forks: numberOrNull(developer?.forks)
    },
    source: "CoinGecko",
    sourceUrl: `https://www.coingecko.com/en/coins/${id}`,
    updatedAt,
    consultedAt: new Date().toISOString(),
    status: "real"
  };
  cache.set(ticker, { expiresAt: Date.now() + 5 * 60_000, snapshot });
  return snapshot;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = (url.searchParams.get("tickers") ?? url.searchParams.get("ticker") ?? "BTC")
    .split(",").map((value) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")).filter(Boolean).slice(0, 8);
  const unique = [...new Set(requested)];
  const results = await Promise.all(unique.map(async (ticker) => {
    try {
      const snapshot = await loadSnapshot(ticker);
      return { ticker, ok: true as const, snapshot, analysis: analyzeAlfatecCrypto(snapshot) };
    } catch (error) {
      return { ticker, ok: false as const, error: error instanceof Error ? error.message : "Nao foi possivel consultar o ativo." };
    }
  }));
  const ok = results.filter((item) => item.ok);
  if (!ok.length) return NextResponse.json({ error: results[0]?.error ?? "Nenhum criptoativo valido.", results }, { status: 502 });
  return NextResponse.json({ source: "CoinGecko", updatedAt: new Date().toISOString(), results }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=240" } });
}
