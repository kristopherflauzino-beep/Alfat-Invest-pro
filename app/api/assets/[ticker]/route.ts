import { NextResponse } from "next/server";
import { getAsset, localAssets, normalizeTicker } from "@/lib/market-data";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ ticker: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { ticker } = await params;
  const clean = normalizeTicker(ticker);
  const asset = getAsset(clean, localAssets);
  return NextResponse.json({
    ticker: clean,
    source: asset.source,
    externalProviderReady: Boolean(process.env.BRAPI_TOKEN),
    asset
  });
}
