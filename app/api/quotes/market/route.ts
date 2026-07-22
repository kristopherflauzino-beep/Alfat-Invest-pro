import { NextResponse } from "next/server";
import { getMarketQuote } from "@/lib/market-data/service";
import { normalizeTicker } from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticker = normalizeTicker(url.searchParams.get("ticker") ?? "");
  const range = url.searchParams.get("range") ?? "1y";
  const interval = url.searchParams.get("interval") ?? (range === "1d" ? "5m" : "1d");
  const forceRefresh = url.searchParams.get("refresh") === "1";

  if (!ticker) {
    return NextResponse.json({ error: "Ticker obrigatório." }, { status: 400 });
  }

  try {
    const quote = await getMarketQuote({ ticker, range, interval, forceRefresh });
    return NextResponse.json(quote, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Market-Data-Source": quote.source
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Fonte financeira indisponível agora.",
      ticker
    }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}
