import { NextResponse } from "next/server";
import { normalizeTicker } from "@/lib/market-data";

export const runtime = "nodejs";

type SerpApiFinanceResult = {
  title?: string;
  price?: string | number;
  currency?: string;
  extracted_price?: number;
  price_movement?: {
    price?: string | number;
    percentage?: string | number;
    movement?: string;
  };
  link?: string;
};

function numberFrom(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeExchange(value: string | null) {
  const exchange = (value ?? "BVMF").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return exchange || "BVMF";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticker = normalizeTicker(url.searchParams.get("ticker") ?? "");
  const exchange = normalizeExchange(url.searchParams.get("exchange"));

  if (!ticker) {
    return NextResponse.json({ error: "Ticker obrigatório." }, { status: 400 });
  }

  if (!process.env.SERPAPI_KEY) {
    return NextResponse.json({ error: "Fonte Google Finance não configurada." }, { status: 503 });
  }

  const googleQuote = `${ticker}:${exchange}`;
  const sourceUrl = `https://www.google.com/finance/beta/quote/${googleQuote}`;
  const serpUrl = new URL("https://serpapi.com/search.json");
  serpUrl.searchParams.set("engine", "google_finance");
  serpUrl.searchParams.set("q", googleQuote);
  serpUrl.searchParams.set("api_key", process.env.SERPAPI_KEY);

  try {
    const response = await fetch(serpUrl, { next: { revalidate: 60 } });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.error ?? "Não foi possível consultar a fonte Google Finance." }, { status: response.status });
    }

    const result = (data?.markets?.[0] ?? data?.summary ?? data?.finance_results ?? data) as SerpApiFinanceResult;
    const price = numberFrom(result.extracted_price ?? result.price);
    const change = numberFrom(result.price_movement?.price);
    const changePercent = numberFrom(result.price_movement?.percentage);

    if (price === undefined) {
      return NextResponse.json({ error: "Ativo não encontrado na fonte Google Finance." }, { status: 404 });
    }

    return NextResponse.json({
      ticker,
      exchange,
      name: result.title ?? googleQuote,
      price,
      currency: result.currency ?? "BRL",
      change: result.price_movement?.movement === "Down" && change && change > 0 ? -change : change ?? 0,
      changePercent: result.price_movement?.movement === "Down" && changePercent && changePercent > 0 ? -changePercent : changePercent ?? 0,
      source: "Google Finance via provedor externo",
      sourceUrl: result.link ?? sourceUrl,
      updatedAt: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar a fonte Google Finance agora." }, { status: 502 });
  }
}