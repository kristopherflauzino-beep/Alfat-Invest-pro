import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAdmin } from "@/lib/auth/session";
import { clearMarketDataCache, getMarketQuote, listMarketDataHealth } from "@/lib/market-data/service";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["revalidate", "clear_cache"]),
  ticker: z.string().trim().max(24).optional()
}).strict();

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const entries = await listMarketDataHealth();
    const items = entries.map((entry) => {
      if ("value" in entry) {
        return {
          key: entry.key,
          ticker: entry.ticker,
          source: entry.value.source,
          status: entry.value.dataStatus,
          confidence: entry.value.priceConfidence,
          price: entry.value.price,
          currency: entry.value.currency,
          updatedAt: entry.value.updatedAt,
          expiresAt: entry.expiresAt.toISOString()
        };
      }
      return entry;
    });
    return NextResponse.json({
      items,
      summary: {
        monitored: items.length,
        valid: items.filter((item) => item.confidence === "high").length,
        attention: items.filter((item) => item.confidence === "medium" || item.confidence === "low").length,
        insufficient: items.filter((item) => item.confidence === "insufficient").length
      }
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin(request);
    const parsed = actionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Ação inválida." }, { status: 422 });
    if (parsed.data.action === "revalidate") {
      if (!parsed.data.ticker) return NextResponse.json({ error: "Informe o ticker." }, { status: 422 });
      const quote = await getMarketQuote({ ticker: parsed.data.ticker, forceRefresh: true });
      return NextResponse.json({ quote }, { headers: { "Cache-Control": "private, no-store" } });
    }
    await clearMarketDataCache(parsed.data.ticker);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return requestErrorResponse(error);
  }
}
