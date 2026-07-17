import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireAccount } from "@/lib/auth/session";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";
import type { AppNotification } from "@/lib/notifications/notifications";
import { ensurePlanLifecycleNotifications, dueEmailJobIds } from "@/lib/notifications/plan-lifecycle";
import { deliverPlanEmailJob } from "@/lib/email/email-jobs";
import { FREE_DAILY_NOTIFICATION_LIMIT, isFreePlan } from "@/lib/plans/access";

export const runtime = "nodejs";
const actionSchema = z.object({
  action: z.enum(["mark_read", "mark_all_read", "delete"]),
  id: z.string().max(100).optional()
}).strict();

function isNotification(value: unknown): value is AppNotification {
  return Boolean(value && typeof value === "object" && typeof (value as AppNotification).id === "string" && typeof (value as AppNotification).userId === "string");
}

export async function GET(request: Request) {
  try {
    const account = await requireAccount(request);
    let state = await readCoreState();
    const lifecycle = ensurePlanLifecycleNotifications(state, account);
    if (lifecycle.changed) await writeCoreState(state);
    const dueJobs = Array.from(new Set([...lifecycle.emailJobIds, ...dueEmailJobIds(state, account.id)]));
    for (const jobId of dueJobs) await deliverPlanEmailJob(jobId).catch(() => undefined);
    if (lifecycle.changed || dueJobs.length > 0) state = await readCoreState();
    const plan = state.plans.find((item) => item.id === account.planId);
    const free = account.role !== "ADMIN" && isFreePlan(account.planId, plan?.name);
    const ownNotifications = (Array.isArray(state.notifications) ? state.notifications : [])
      .filter(isNotification)
      .filter((item) => item.userId === account.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const dailyCounts = new Map<string, number>();
    const notifications = free ? ownNotifications.filter((item) => {
      const day = item.createdAt.slice(0, 10);
      const count = dailyCounts.get(day) ?? 0;
      dailyCounts.set(day, count + 1);
      return count < FREE_DAILY_NOTIFICATION_LIMIT;
    }) : ownNotifications;
    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((item) => !item.readAt).length,
      dailyLimit: free ? FREE_DAILY_NOTIFICATION_LIMIT : null
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await requireAccount(request);
    const parsed = actionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Ação inválida." }, { status: 422 });
    const state = await readCoreState();
    const notifications = (Array.isArray(state.notifications) ? state.notifications : []).filter(isNotification);
    const now = new Date().toISOString();
    if (parsed.data.action === "mark_all_read") {
      state.notifications = notifications.map((item) => item.userId === account.id ? { ...item, readAt: item.readAt || now } : item);
    } else {
      if (!parsed.data.id) return NextResponse.json({ error: "Notificação não informada." }, { status: 422 });
      const own = notifications.find((item) => item.id === parsed.data.id && item.userId === account.id);
      if (!own) return NextResponse.json({ error: "Notificação não encontrada." }, { status: 404 });
      state.notifications = parsed.data.action === "delete"
        ? notifications.filter((item) => item.id !== own.id)
        : notifications.map((item) => item.id === own.id ? { ...item, readAt: item.readAt || now } : item);
    }
    await writeCoreState(state);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}