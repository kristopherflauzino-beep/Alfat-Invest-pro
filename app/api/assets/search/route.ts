import { NextResponse } from "next/server";
import { assetTypeOptions, createGeneratedAsset, localAssets, normalizeTicker, searchAssets } from "@/lib/market-data";
import type { AssetType } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const typeParam = url.searchParams.get("type") ?? "TODOS";
  const type = assetTypeOptions.some((item) => item.value === typeParam) ? (typeParam as AssetType | "TODOS") : "TODOS";

  const local = searchAssets(query, type, localAssets);
  const dynamicTicker = normalizeTicker(query);
  const generated = dynamicTicker ? createGeneratedAsset(dynamicTicker) : undefined;

  return NextResponse.json({
    query,
    type,
    count: local.length,
    source: "local-with-dynamic-fallback",
    externalProviderReady: Boolean(process.env.BRAPI_TOKEN),
    generatedWhenMissing: generated,
    assets: local.slice(0, 100)
  });
}
