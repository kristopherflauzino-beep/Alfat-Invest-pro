import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth/session";
import { readCoreState } from "@/lib/server/core-state";
import { normalizeSubscriptionRequests } from "@/lib/subscriptions/manual-subscription";
import type { PlanEmailJob } from "@/lib/email/email-jobs";

export const runtime = "nodejs";

function isEmailJob(value: unknown): value is PlanEmailJob {
  return Boolean(value && typeof value === "object" && (value as PlanEmailJob).kind === "plan");
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const state = await readCoreState();
    const requests = normalizeSubscriptionRequests(state.subscriptionRequests).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const emailJobs = (Array.isArray(state.emailJobs) ? state.emailJobs : [])
      .filter(isEmailJob)
      .filter((item) => item.status !== "sent")
      .map(({ input: _input, ...item }) => item)
      .slice(0, 50);
    return NextResponse.json({ requests, emailJobs }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}