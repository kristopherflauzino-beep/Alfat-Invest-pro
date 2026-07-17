import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/session";
import { requireResourceAccess, type RestrictedResource } from "@/lib/plans/server-access";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await params;
    if (!(["comparador", "radar"] as string[]).includes(resource)) {
      return NextResponse.json({ error: "Recurso não encontrado." }, { status: 404 });
    }
    await requireResourceAccess(request, resource as RestrictedResource);
    return NextResponse.json({ allowed: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 403) {
      return NextResponse.json({ error: "Seu plano atual não possui acesso a este recurso." }, { status: 403 });
    }
    return authErrorResponse(error);
  }
}
