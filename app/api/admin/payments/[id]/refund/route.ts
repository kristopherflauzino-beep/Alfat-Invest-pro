import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, authErrorResponse } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/server/request-security";
import { verifyPassword } from "@/lib/auth/password";
import { refundPayment, paymentErrorStatus } from "@/lib/payments/payment-service";
export const runtime = "nodejs";
const schema = z.object({ amountInCents: z.number().int().positive().optional(), adminPassword: z.string().min(1).max(256) }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Reautenticacao administrativa obrigatoria." }, { status: 422 });
    if (!await verifyPassword(parsed.data.adminPassword, admin.passwordHash)) return NextResponse.json({ error: "Reautenticacao administrativa invalida." }, { status: 403 });
    const { id } = await params;
    return NextResponse.json(await refundPayment(id, admin.id, parsed.data.amountInCents));
  } catch (error) {
    const auth = authErrorResponse(error); if (auth.status !== 500) return auth;
    const result = paymentErrorStatus(error); return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
