import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/session";
import { getFixedIncomeReferenceRates } from "@/lib/fixed-income/reference-rates";
import { requireResourceAccess } from "@/lib/plans/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireResourceAccess(request, "renda_fixa");
    const force = new URL(request.url).searchParams.get("refresh") === "1";
    const rates = await getFixedIncomeReferenceRates(force);
    return NextResponse.json({ rates }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
