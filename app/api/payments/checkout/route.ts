import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAccount, authErrorResponse } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/server/request-security";
import { createCheckout, paymentErrorStatus } from "@/lib/payments/payment-service";
export const runtime = "nodejs";
const schema = z.object({ planId: z.string().min(1).max(50), paymentMethod: z.enum(["pix", "credit_card"]), autoRenew: z.boolean().optional(), renewalMode: z.enum(["today", "extend"]).optional() }).strict();
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await requireAccount(request);
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: "Dados do checkout invalidos." }, { status: 422 });
    const idempotencyKey = (request.headers.get("idempotency-key") || crypto.randomUUID()).slice(0, 150);
    const configuredUrl = process.env.PAYMENT_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    const appUrl = configuredUrl || new URL(request.url).origin;
    const result = await createCheckout(account.id, { ...input.data, idempotencyKey, appUrl });
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const auth = authErrorResponse(error); if (auth.status !== 500) return auth;
    const result = paymentErrorStatus(error); return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
