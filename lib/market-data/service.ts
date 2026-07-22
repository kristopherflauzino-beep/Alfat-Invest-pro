import "server-only";

import { createHash } from "node:crypto";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { inferAssetType, normalizeTicker } from "@/lib/market-data";
import type { AssetIncomeSummary, CurrencyCode, IncomeEvent, PricePoint } from "@/lib/types";

export type PriceConfidence = "high" | "medium" | "low" | "insufficient";

export type MarketQuote = {
  ticker: string;
  exchange: "BVMF" | "CRYPTO";
  providerTicker: string;
  name: string;
  price: number;
  currency: CurrencyCode;
  change: number;
  changePercent: number;
  previousClose?: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  marketStatus: string;
  marketState: string;
  dataStatus: string;
  source: string;
  sourceUrl: string;
  updatedAt: string;
  consultedAt: string;
  isCached: boolean;
  history: PricePoint[];
  incomeEvents: IncomeEvent[];
  incomeSummary: AssetIncomeSummary;
  priceConfidence: PriceConfidence;
  validationMessages: string[];
};

type YahooMeta = {
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

type CacheRow = { value: MarketQuote; expiresAt: Date; updatedAt: Date };
type MemoryEntry = { value: MarketQuote; expiresAt: number; updatedAt: number };

const memoryCache = new Map<string, MemoryEntry>();
let cacheTableReady = false;
const B3_TYPES = new Set(["ACAO", "FII", "ETF", "BDR"]);

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundMarketValue(value: number) {
  const decimals = Math.abs(value) < 1 ? 8 : 2;
  return Number(value.toFixed(decimals));
}

export function marketProviderTicker(tickerInput: string) {
  const ticker = normalizeTicker(tickerInput);
  const type = inferAssetType(ticker);
  if (type === "CRIPTO") return ticker.endsWith("BRL") ? `${ticker.slice(0, -3)}-BRL` : `${ticker}-BRL`;
  return `${ticker}.SA`;
}

function marketLabel(state?: string) {
  if (["REGULAR", "PRE", "POST"].includes(state ?? "")) return "Mercado aberto";
  if (["CLOSED", "POSTPOST", "PREPRE"].includes(state ?? "")) return "Mercado fechado - Último preço disponível";
  return "Status do mercado indisponível";
}

function sourceUrl(symbol: string) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
}

function toHistoryPoint(timestamp: number, close: unknown, volume: unknown): PricePoint | undefined {
  if (!finite(close) || close <= 0) return undefined;
  return {
    label: new Date(timestamp * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    price: roundMarketValue(close),
    volume: finite(volume) && volume >= 0 ? volume : 0
  };
}

function eventId(ticker: string, timestamp: number, amount: number) {
  return createHash("sha256").update(`${ticker}:${timestamp}:${amount}`).digest("hex").slice(0, 24);
}

function buildIncomeEvents(ticker: string, type: ReturnType<typeof inferAssetType>, raw: unknown, updatedAt: string, symbol: string): IncomeEvent[] {
  if (!raw || typeof raw !== "object") return [];
  return Object.values(raw as Record<string, { amount?: unknown; date?: unknown }>).flatMap((entry) => {
    const amount = finite(entry.amount) && entry.amount > 0 ? entry.amount : undefined;
    const timestamp = finite(entry.date) && entry.date > 0 ? entry.date : undefined;
    if (!amount || !timestamp) return [];
    const date = new Date(timestamp * 1000).toISOString();
    return [{
      id: eventId(ticker, timestamp, amount),
      ticker,
      type: type === "FII" ? "fii_income" as const : "dividend" as const,
      amountPerUnit: roundMarketValue(amount),
      currency: "BRL" as const,
      exDate: date,
      status: timestamp * 1000 <= Date.now() ? "paid" as const : "announced" as const,
      source: "Yahoo Finance",
      sourceUrl: sourceUrl(symbol),
      updatedAt
    }];
  }).sort((a, b) => (b.exDate ?? "").localeCompare(a.exDate ?? ""));
}

function inferFrequency(events: IncomeEvent[]): AssetIncomeSummary["frequency"] {
  const dates = events
    .map((event) => Date.parse(event.paymentDate ?? event.exDate ?? ""))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (dates.length < 2) return dates.length ? "Irregular" : "Sem histórico";
  const intervals = dates.slice(1).map((date, index) => Math.round((date - dates[index]) / 86_400_000)).sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  if (median <= 45) return "Mensal";
  if (median <= 75) return "Bimestral";
  if (median <= 125) return "Trimestral";
  if (median <= 220) return "Semestral";
  if (median <= 430) return "Anual";
  return "Irregular";
}

export function summarizeIncomeEvents(events: IncomeEvent[], updatedAt: string, source: string): AssetIncomeSummary {
  const now = Date.now();
  const oneYearAgo = now - 365 * 86_400_000;
  const confirmed = events.filter((event) => event.status === "paid");
  const last12 = confirmed.filter((event) => {
    const time = Date.parse(event.paymentDate ?? event.exDate ?? "");
    return Number.isFinite(time) && time >= oneYearAgo && time <= now;
  });
  const future = events
    .filter((event) => event.status === "announced")
    .sort((a, b) => (a.paymentDate ?? a.exDate ?? "").localeCompare(b.paymentDate ?? b.exDate ?? ""));
  const latest = confirmed[0];
  const next = future[0];
  const total12Months = last12.reduce((sum, event) => sum + event.amountPerUnit, 0);
  return {
    latestAmountPerUnit: latest?.amountPerUnit,
    latestPaymentDate: latest?.paymentDate ?? latest?.exDate,
    nextAmountPerUnit: next?.amountPerUnit,
    nextPaymentDate: next?.paymentDate ?? next?.exDate,
    frequency: inferFrequency(confirmed),
    total12Months: roundMarketValue(total12Months),
    averageMonthly12Months: roundMarketValue(total12Months / 12),
    events12Months: last12.length,
    source,
    updatedAt
  };
}

async function ensureCacheTable() {
  if (!hasDatabaseUrl || cacheTableReady) return;
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "MarketDataCache" ("key" TEXT PRIMARY KEY, "ticker" TEXT NOT NULL, "value" JSONB NOT NULL, "expiresAt" TIMESTAMPTZ NOT NULL, "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketDataCache_ticker_idx" ON "MarketDataCache" ("ticker")`);
  cacheTableReady = true;
}

async function readCache(key: string): Promise<MemoryEntry | null> {
  const memory = memoryCache.get(key);
  if (memory) return memory;
  if (!hasDatabaseUrl) return null;
  await ensureCacheTable();
  const rows = await prisma.$queryRaw<Array<CacheRow>>`SELECT "value", "expiresAt", "updatedAt" FROM "MarketDataCache" WHERE "key" = ${key} LIMIT 1`;
  if (!rows[0]) return null;
  const entry = { value: rows[0].value, expiresAt: rows[0].expiresAt.getTime(), updatedAt: rows[0].updatedAt.getTime() };
  memoryCache.set(key, entry);
  return entry;
}

async function writeCache(key: string, ticker: string, value: MarketQuote, ttlMs: number) {
  const expiresAt = new Date(Date.now() + ttlMs);
  memoryCache.set(key, { value, expiresAt: expiresAt.getTime(), updatedAt: Date.now() });
  if (!hasDatabaseUrl) return;
  await ensureCacheTable();
  const json = JSON.stringify(value);
  await prisma.$executeRaw`INSERT INTO "MarketDataCache" ("key", "ticker", "value", "expiresAt", "updatedAt") VALUES (${key}, ${ticker}, ${json}::jsonb, ${expiresAt}, NOW()) ON CONFLICT ("key") DO UPDATE SET "ticker" = EXCLUDED."ticker", "value" = EXCLUDED."value", "expiresAt" = EXCLUDED."expiresAt", "updatedAt" = NOW()`;
}

function validateQuote(quote: MarketQuote, expectedSymbol: string) {
  const messages: string[] = [];
  if (!finite(quote.price) || quote.price <= 0) messages.push("Preço inválido.");
  if (quote.currency !== "BRL") messages.push(`Moeda incompatível: ${quote.currency}.`);
  if (quote.providerTicker.toUpperCase() !== expectedSymbol.toUpperCase()) messages.push("Ticker retornado não corresponde ao ativo solicitado.");
  const timestamp = Date.parse(quote.updatedAt);
  if (!Number.isFinite(timestamp)) messages.push("Horário da cotação inválido.");
  else if (timestamp > Date.now() + 5 * 60_000) messages.push("Horário da cotação está no futuro.");
  else if (Date.now() - timestamp > 7 * 86_400_000) messages.push("Cotação desatualizada há mais de sete dias.");
  return messages;
}

function divergencePercent(current: number, previous?: number) {
  if (!finite(previous) || previous <= 0) return 0;
  return Math.abs((current - previous) / previous) * 100;
}

async function fetchYahooQuote(ticker: string, range: string, interval: string): Promise<MarketQuote> {
  const symbol = marketProviderTicker(ticker);
  const endpoint = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=false&events=div%2Csplits`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "Mozilla/5.0 AlfaTec Invest Pro" },
      cache: "no-store",
      signal: controller.signal
    });
    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    const meta = result?.meta as YahooMeta | undefined;
    if (!response.ok || !result || !finite(meta?.regularMarketPrice) || meta.regularMarketPrice <= 0) {
      throw new Error("Cotação não encontrada no provedor principal.");
    }
    if (meta.currency && meta.currency !== "BRL") throw new Error("Moeda incompatível retornada pelo provedor: " + meta.currency + ".");
    const timestamps: number[] = Array.isArray(result.timestamp) ? result.timestamp : [];
    const closes: Array<number | null> = result?.indicators?.quote?.[0]?.close ?? [];
    const volumes: Array<number | null> = result?.indicators?.quote?.[0]?.volume ?? [];
    const history = timestamps.map((timestamp, index) => toHistoryPoint(timestamp, closes[index], volumes[index])).filter((point): point is PricePoint => Boolean(point));
    const previousClose = meta.previousClose ?? meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? history.at(-2)?.price ?? meta.regularMarketPrice;
    const change = meta.regularMarketChange ?? meta.regularMarketPrice - previousClose;
    const changePercent = meta.regularMarketChangePercent ?? (previousClose ? change / previousClose * 100 : 0);
    const updatedAt = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString();
    const type = inferAssetType(ticker);
    const incomeEvents = B3_TYPES.has(type)
      ? buildIncomeEvents(ticker, type, result?.events?.dividends, updatedAt, symbol)
      : [];
    return {
      ticker,
      exchange: type === "CRIPTO" ? "CRYPTO" : "BVMF",
      providerTicker: symbol,
      name: meta.longName ?? meta.shortName ?? ticker,
      price: roundMarketValue(meta.regularMarketPrice),
      currency: "BRL",
      change: roundMarketValue(change),
      changePercent: Number(changePercent.toFixed(4)),
      previousClose: roundMarketValue(previousClose),
      open: finite(meta.regularMarketOpen) ? roundMarketValue(meta.regularMarketOpen) : undefined,
      dayHigh: finite(meta.regularMarketDayHigh) ? roundMarketValue(meta.regularMarketDayHigh) : undefined,
      dayLow: finite(meta.regularMarketDayLow) ? roundMarketValue(meta.regularMarketDayLow) : undefined,
      volume: finite(meta.regularMarketVolume) ? meta.regularMarketVolume : undefined,
      marketStatus: marketLabel(meta.marketState),
      marketState: meta.marketState ?? "UNKNOWN",
      dataStatus: "Dado validado",
      source: "Yahoo Finance",
      sourceUrl: sourceUrl(symbol),
      updatedAt,
      consultedAt: new Date().toISOString(),
      isCached: false,
      history,
      incomeEvents,
      incomeSummary: summarizeIncomeEvents(incomeEvents, updatedAt, "Yahoo Finance"),
      priceConfidence: "high",
      validationMessages: []
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBrapiQuote(ticker: string): Promise<MarketQuote | null> {
  if (!process.env.BRAPI_TOKEN || inferAssetType(ticker) === "CRIPTO") return null;
  const endpoint = new URL("https://brapi.dev/api/v2/stocks/quote");
  endpoint.searchParams.set("symbols", ticker);
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + process.env.BRAPI_TOKEN
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000)
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const item = payload?.results?.[0];
  const data = item?.data ?? item;
  if (!data || !finite(data.regularMarketPrice) || data.regularMarketPrice <= 0 || data.currency !== "BRL") return null;
  const updatedAt = typeof data.regularMarketTime === "string" && Number.isFinite(Date.parse(data.regularMarketTime))
    ? new Date(data.regularMarketTime).toISOString()
    : typeof payload.requestedAt === "string" && Number.isFinite(Date.parse(payload.requestedAt))
      ? new Date(payload.requestedAt).toISOString()
      : new Date().toISOString();
  const previousClose = finite(data.regularMarketPreviousClose) ? data.regularMarketPreviousClose : data.regularMarketPrice;
  const change = finite(data.regularMarketChange) ? data.regularMarketChange : data.regularMarketPrice - previousClose;
  const changePercent = finite(data.regularMarketChangePercent)
    ? data.regularMarketChangePercent
    : previousClose > 0 ? change / previousClose * 100 : 0;
  const symbol = marketProviderTicker(ticker);
  return {
    ticker,
    exchange: "BVMF",
    providerTicker: symbol,
    name: data.longName ?? data.shortName ?? ticker,
    price: roundMarketValue(data.regularMarketPrice),
    currency: "BRL",
    change: roundMarketValue(change),
    changePercent: Number(changePercent.toFixed(4)),
    previousClose: roundMarketValue(previousClose),
    open: finite(data.regularMarketOpen) ? roundMarketValue(data.regularMarketOpen) : undefined,
    dayHigh: finite(data.regularMarketDayHigh) ? roundMarketValue(data.regularMarketDayHigh) : undefined,
    dayLow: finite(data.regularMarketDayLow) ? roundMarketValue(data.regularMarketDayLow) : undefined,
    volume: finite(data.regularMarketVolume) ? data.regularMarketVolume : undefined,
    marketStatus: "Última cotação disponível",
    marketState: "UNKNOWN",
    dataStatus: "Dado validado por fonte secundária",
    source: "Brapi",
    sourceUrl: "https://brapi.dev/docs/acoes",
    updatedAt,
    consultedAt: new Date().toISOString(),
    isCached: false,
    history: [],
    incomeEvents: [],
    incomeSummary: summarizeIncomeEvents([], updatedAt, "Brapi"),
    priceConfidence: "medium",
    validationMessages: ["Fonte secundária utilizada; histórico e proventos serão atualizados quando a fonte principal estiver disponível."]
  };
}
async function fetchSerpApiPrice(ticker: string): Promise<MarketQuote | null> {
  if (!process.env.SERPAPI_KEY || inferAssetType(ticker) === "CRIPTO") return null;
  const endpoint = new URL("https://serpapi.com/search.json");
  endpoint.searchParams.set("engine", "google_finance");
  endpoint.searchParams.set("q", `${ticker}:BVMF`);
  endpoint.searchParams.set("api_key", process.env.SERPAPI_KEY);
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json();
  const raw = data?.markets?.[0] ?? data?.summary ?? data?.finance_results ?? data;
  const price = typeof raw?.extracted_price === "number"
    ? raw.extracted_price
    : Number(String(raw?.price ?? "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
  if (!finite(price) || price <= 0) return null;
  const now = new Date().toISOString();
  const symbol = marketProviderTicker(ticker);
  return {
    ticker,
    exchange: "BVMF",
    providerTicker: symbol,
    name: raw?.title ?? ticker,
    price: roundMarketValue(price),
    currency: "BRL",
    change: 0,
    changePercent: 0,
    marketStatus: "Status do mercado indisponível",
    marketState: "UNKNOWN",
    dataStatus: "Dado validado por fonte secundária",
    source: "Google Finance via SerpApi",
    sourceUrl: `https://www.google.com/finance/beta/quote/${ticker}:BVMF`,
    updatedAt: now,
    consultedAt: now,
    isCached: false,
    history: [],
    incomeEvents: [],
    incomeSummary: summarizeIncomeEvents([], now, "Google Finance via SerpApi"),
    priceConfidence: "medium",
    validationMessages: ["Fonte secundária utilizada; histórico de proventos indisponível nesta consulta."]
  };
}

async function fetchSecondaryQuote(ticker: string) {
  return await fetchBrapiQuote(ticker).catch(() => null)
    ?? await fetchSerpApiPrice(ticker).catch(() => null);
}
function cachedFallback(cached: MarketQuote, reason: string): MarketQuote {
  return {
    ...cached,
    isCached: true,
    dataStatus: "Último preço válido - atualização pendente",
    priceConfidence: "low",
    consultedAt: new Date().toISOString(),
    validationMessages: Array.from(new Set([...(cached.validationMessages ?? []), reason]))
  };
}

export async function getMarketQuote(input: { ticker: string; range?: string; interval?: string; forceRefresh?: boolean }) {
  const ticker = normalizeTicker(input.ticker);
  if (!ticker) throw new Error("Ticker obrigatório.");
  const range = input.range ?? "1y";
  const interval = input.interval ?? (range === "1d" ? "5m" : "1d");
  const symbol = marketProviderTicker(ticker);
  const cacheKey = `quote:${symbol}:${range}:${interval}`;
  const lastValidKey = `last-valid:${symbol}`;
  const [cached, lastValid] = await Promise.all([readCache(cacheKey), readCache(lastValidKey)]);
  if (!input.forceRefresh && cached && cached.expiresAt > Date.now()) {
    return { ...cached.value, isCached: true, dataStatus: "Dado validado em cache" };
  }

  try {
    let primary = await fetchYahooQuote(ticker, range, interval);
    const messages = validateQuote(primary, symbol);
    const divergence = divergencePercent(primary.price, lastValid?.value.price);
    const divergenceLimit = inferAssetType(ticker) === "CRIPTO" ? 60 : 35;
    if (divergence > divergenceLimit) {
      const secondary = await fetchSecondaryQuote(ticker);
      const providersAgree = secondary && divergencePercent(primary.price, secondary.price) <= 5;
      if (!providersAgree && lastValid) {
        return cachedFallback(lastValid.value, `Divergência de ${divergence.toFixed(2)}% aguardando validação.`);
      }
      if (providersAgree) messages.push("Movimento extremo confirmado por uma segunda fonte.");
    }
    if (messages.length) {
      const secondary = await fetchSecondaryQuote(ticker);
      if (secondary && validateQuote(secondary, symbol).length === 0) primary = secondary;
      else if (lastValid) return cachedFallback(lastValid.value, messages.join(" "));
      else throw new Error(messages.join(" "));
    }
    const ttl = ["REGULAR", "PRE", "POST"].includes(primary.marketState) ? 60_000 : 15 * 60_000;
    await Promise.all([
      writeCache(cacheKey, ticker, primary, ttl),
      writeCache(lastValidKey, ticker, primary, 365 * 86_400_000)
    ]);
    return primary;
  } catch (error) {
    const secondary = await fetchSecondaryQuote(ticker);
    if (secondary && validateQuote(secondary, symbol).length === 0) {
      await Promise.all([
        writeCache(cacheKey, ticker, secondary, 60_000),
        writeCache(lastValidKey, ticker, secondary, 365 * 86_400_000)
      ]);
      return secondary;
    }
    if (lastValid) return cachedFallback(lastValid.value, error instanceof Error ? error.message : "Fonte indisponível.");
    if (cached) return cachedFallback(cached.value, error instanceof Error ? error.message : "Fonte indisponível.");
    throw error;
  }
}

export async function listMarketDataHealth() {
  if (!hasDatabaseUrl) {
    return Array.from(memoryCache.entries()).map(([key, entry]) => ({
      key,
      ticker: entry.value.ticker,
      source: entry.value.source,
      status: entry.value.dataStatus,
      confidence: entry.value.priceConfidence,
      updatedAt: entry.value.updatedAt,
      expiresAt: new Date(entry.expiresAt).toISOString()
    }));
  }
  await ensureCacheTable();
  return prisma.$queryRaw<Array<{ key: string; ticker: string; value: MarketQuote; expiresAt: Date; updatedAt: Date }>>`SELECT "key", "ticker", "value", "expiresAt", "updatedAt" FROM "MarketDataCache" WHERE "key" LIKE 'last-valid:%' ORDER BY "updatedAt" DESC LIMIT 250`;
}

export async function clearMarketDataCache(tickerInput?: string) {
  const ticker = tickerInput ? normalizeTicker(tickerInput) : "";
  for (const [key, entry] of memoryCache) if (!ticker || entry.value.ticker === ticker) memoryCache.delete(key);
  if (!hasDatabaseUrl) return;
  await ensureCacheTable();
  if (ticker) await prisma.$executeRaw`DELETE FROM "MarketDataCache" WHERE "ticker" = ${ticker}`;
  else await prisma.$executeRawUnsafe(`DELETE FROM "MarketDataCache"`);
}
