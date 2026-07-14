import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth/session";
import { readCoreState } from "@/lib/server/core-state";
import { isSubscriptionRequest } from "@/lib/subscriptions/manual-subscription";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const state = await readCoreState();
    const requests = (Array.isArray(state.subscriptionRequests) ? state.subscriptionRequests : []).filter(isSubscriptionRequest).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return NextResponse.json({ requests }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return authErrorResponse(error); }
}
