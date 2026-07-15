import { NextResponse } from "next/server";
import { authErrorResponse, requireAccount } from "@/lib/auth/session";
import { readCoreState } from "@/lib/server/core-state";
import { normalizeSubscriptionRequests } from "@/lib/subscriptions/manual-subscription";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const account = await requireAccount(request);
    const state = await readCoreState();
    const requests = normalizeSubscriptionRequests(state.subscriptionRequests)
      .filter((item) => item.userId === account.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ internalNote: _internalNote, history, idempotencyKey: _idempotencyKey, ...item }) => ({
        ...item,
        history: history.map(({ internalNote: _historyInternal, ...entry }) => entry)
      }));
    return NextResponse.json({ requests }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}