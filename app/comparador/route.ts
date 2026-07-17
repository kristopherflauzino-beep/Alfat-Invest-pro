import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/session";
import { requireResourceAccess } from "@/lib/plans/server-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireResourceAccess(request, "comparador");
    return NextResponse.redirect(new URL("/?menu=comparador", request.url));
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 403) {
      return NextResponse.json({ error: "Seu plano atual não possui acesso a este recurso." }, { status: 403 });
    }
    return authErrorResponse(error);
  }
}
