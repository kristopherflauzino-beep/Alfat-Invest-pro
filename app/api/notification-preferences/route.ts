import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireAccount } from "@/lib/auth/session";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";
import { mergeNotificationPreferences, notificationTopics } from "@/lib/notifications/notifications";

export const runtime = "nodejs";
const preferenceSchema = z.object({
  topic: z.enum([
    "opportunities", "portfolio_rebalancing", "portfolio_allocation", "portfolio_score",
    "fii_score", "crypto_score", "graham_changes", "dividends", "corporate_events",
    "price_alerts", "risk_alerts", "stale_data", "plan_expiration", "payment_status",
    "subscription_status", "platform_updates", "admin_messages", "security"
  ]),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  frequency: z.enum(["immediate", "daily", "weekly", "in_app_only"])
}).strict();
const bodySchema = z.object({ preferences: z.array(preferenceSchema).length(notificationTopics.length) }).strict();

export async function GET(request: Request) {
  try {
    const account = await requireAccount(request);
    const state = await readCoreState();
    const preferences = mergeNotificationPreferences(account.id, Array.isArray(state.notificationPreferences) ? state.notificationPreferences : []);
    return NextResponse.json({ preferences, topics: notificationTopics }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await requireAccount(request);
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Preferências inválidas." }, { status: 422 });
    const essential = new Set(notificationTopics.filter((item) => item.essential).map((item) => item.topic));
    const now = new Date().toISOString();
    const requested = parsed.data.preferences.map((item) => ({
      id: account.id + ":" + item.topic,
      userId: account.id,
      topic: item.topic,
      inAppEnabled: essential.has(item.topic) ? true : item.inAppEnabled,
      emailEnabled: essential.has(item.topic) ? true : item.frequency === "in_app_only" ? false : item.emailEnabled,
      frequency: essential.has(item.topic) ? "immediate" as const : item.frequency,
      createdAt: now,
      updatedAt: now
    }));
    const state = await readCoreState();
    const others = (Array.isArray(state.notificationPreferences) ? state.notificationPreferences : []).filter((value) => !value || typeof value !== "object" || (value as { userId?: string }).userId !== account.id);
    state.notificationPreferences = [...requested, ...others];
    await writeCoreState(state);
    return NextResponse.json({ preferences: requested }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}