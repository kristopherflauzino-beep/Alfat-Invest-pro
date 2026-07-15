import { NextResponse } from "next/server";
import { z } from "zod";
import { hashResetToken, resetTokenState, type PasswordResetTokenRecord } from "@/lib/auth/password-reset";
import { readCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.object({ token: z.string().min(32).max(200) }).strict();
function isToken(value: unknown): value is PasswordResetTokenRecord {
  return Boolean(value && typeof value === "object" && typeof (value as PasswordResetTokenRecord).tokenHash === "string");
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ valid: false, error: "Link inválido ou expirado." }, { status: 422 });
    const state = await readCoreState();
    const record = (Array.isArray(state.passwordResetTokens) ? state.passwordResetTokens : [])
      .filter(isToken)
      .find((item) => item.tokenHash === hashResetToken(parsed.data.token));
    const valid = resetTokenState(record) === "valid";
    return NextResponse.json(
      valid ? { valid: true } : { valid: false, error: "Link inválido, expirado ou já utilizado." },
      { status: valid ? 200 : 410, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return requestErrorResponse(error);
  }
}