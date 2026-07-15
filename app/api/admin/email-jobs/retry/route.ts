import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireAdmin } from "@/lib/auth/session";
import { deliverPlanEmailJob } from "@/lib/email/email-jobs";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.object({ jobId: z.string().uuid() }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Envio não informado." }, { status: 422 });
    const job = await deliverPlanEmailJob(parsed.data.jobId);
    if (!job) return NextResponse.json({ error: "Envio não encontrado." }, { status: 404 });
    return NextResponse.json({ job }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}