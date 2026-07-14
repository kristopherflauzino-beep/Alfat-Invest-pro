import { NextResponse } from "next/server";

export class RequestSecurityError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || request.headers.get("host") || ""}`;
  try {
    if (new URL(origin).host !== new URL(expected).host) throw new RequestSecurityError(403, "Origem da requisicao nao autorizada.");
  } catch (error) {
    if (error instanceof RequestSecurityError) throw error;
    throw new RequestSecurityError(403, "Origem da requisicao invalida.");
  }
}

export function requestErrorResponse(error: unknown) {
  if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "Nao foi possivel concluir a solicitacao." }, { status: 500 });
}
