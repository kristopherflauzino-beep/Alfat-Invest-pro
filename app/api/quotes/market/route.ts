import { NextResponse } from "next/server";
import { inferAssetType, normalizeTicker } from "@/lib/market-data";

export const runtime = "nodejs";

type YahooQuote = {
  currency?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketVolume?: number;
  marketState?: string;
  shortName?: string;
  longName?: string;
  symbol?: string;
};

type CacheEntry = {
  expiresAt: number;
  value: Record<string, unknown>;
};

const cache = new Map<string, CacheEntry>();
const B3_EXCHANGE = "SA";

function yahooSymbol(ticker: string) {
  const clean = normalizeTicker(ticker);
  const type = inferAssetType(clean);
  if (type === "CRIPTO") return clean.endsWith("BRL") ? `${clean.slice(0, -3)}-BRL` : `${clean}-BRL`;
  return `${clean}.${B3_EXCHANGE}`;
}

function marketLabel(state?: string) {
  if (["REGULAR", "PRE", "POST"].includes(state ?? "")) return "Mercado aberto";
  if (["CLOSED", "POSTPOST", "PREPRE"].includes(state ?? "")) return "Mercado fechado - ultimo preco disponivel";
  return "Status do mercado indisponivel";
}

function toPoint(timestamp: number, close: unknown, volume: unknown) {
  const price = typeof close === "number" && Number.isFinite(close) ? close : undefined;
  if (price === undefined) return undefined;
  return {
    label: new Date(timestamp * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    price: Number(price.toFixed(2)),
    volume: typeof volume === "number" && Number.isFinite(volume) ? volume : 0
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticker = normalizeTicker(url.searchParams.get("ticker") ?? "");
  const range = url.searchParams.get("range") ?? "1y";
  const interval = url.searchParams.get("interval") ?? (range === "1d" ? "5m" : "1d");

  if (!ticker) return NextResponse.json({ error: "Ticker obrigatorio." }, { status: 400 });

  const symbol = yahooSymbol(ticker);
  const cacheKey = `${symbol}:${range}:${interval}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({ ...cached.value, isCached: true, dataStatus: "Ultimo dado disponivel" });
  }

  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=false&events=div%2Csplits`;

  try {
    const response = await fetch(yahooUrl, {
      headers: { "User-Agent": "Mozilla/5.0 Alfatec Invest Pro" },
      next: { revalidate: 60 }
    });
    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    const quote = result?.meta as YahooQuote | undefined;
    const timestamps: number[] = result?.timestamp ?? [];
    const closes: Array<number | null> = result?.indicators?.quote?.[0]?.close ?? [];
    const volumes: Array<number | null> = result?.indicators?.quote?.[0]?.volume ?? [];

    if (!response.ok || !result || !quote?.regularMarketPrice) {
      return NextResponse.json({ error: "Dado indisponivel para o ativo informado.", ticker, providerTicker: symbol }, { status: 404 });
    }

    const history = timestamps.map((timestamp, index) => toPoint(timestamp, closes[index], volumes[index])).filter(Boolean);
    const previousClose = quote.previousClose ?? quote.regularMarketPreviousClose ?? quote.chartPreviousClose ?? history.at(-2)?.price ?? quote.regularMarketPrice;
    const change = quote.regularMarketChange ?? quote.regularMarketPrice - previousClose;
    const changePercent = quote.regularMarketChangePercent ?? (previousClose ? (change / previousClose) * 100 : 0);
    const updatedAt = quote.regularMarketTime ? new Date(quote.regularMarketTime * 1000).toISOString() : new Date().toISOString();
    const ttl = ["REGULAR", "PRE", "POST"].includes(quote.marketState ?? "") ? 60_000 : 15 * 60_000;

    const value = {
      ticker,
      exchange: inferAssetType(ticker) === "CRIPTO" ? "CRYPTO" : "BVMF",
      providerTicker: symbol,
      name: quote.longName ?? quote.shortName ?? ticker,
      price: Number(quote.regularMarketPrice.toFixed(2)),
      currency: quote.currency ?? "BRL",
      change: Number(change.toFixed(4)),
      changePercent: Number(changePercent.toFixed(4)),
      previousClose: Number(previousClose.toFixed(2)),
      open: quote.regularMarketOpen,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      marketStatus: marketLabel(quote.marketState),
      marketState: quote.marketState ?? "UNKNOWN",
      dataStatus: "Dado atualizado",
      source: "Yahoo Finance",
      sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
      updatedAt,
      consultedAt: new Date().toISOString(),
      isCached: false,
      history
    };

    cache.set(cacheKey, { value, expiresAt: now + ttl });
    return NextResponse.json(value);
  } catch {
    if (cached) return NextResponse.json({ ...cached.value, isCached: true, dataStatus: "Ultimo dado disponivel" });
    return NextResponse.json({ error: "Fonte financeira indisponivel agora.", ticker, providerTicker: symbol }, { status: 502 });
  }
}
