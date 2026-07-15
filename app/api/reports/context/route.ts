import { NextResponse } from "next/server";
import { authErrorResponse, requireAccount } from "@/lib/auth/session";
import { publicAccount, readCoreState } from "@/lib/server/core-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stringField(value: unknown, key: string) {
  if (!value || typeof value !== "object") return "";
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : "";
}

function noStore(response: NextResponse) {
  response.headers.set("cache-control", "private, no-store, max-age=0");
  return response;
}

export async function GET(request: Request) {
  try {
    const actor = await requireAccount(request);
    if (actor.role !== "ADMIN" && (!actor.permissions.includes("relatorios") || ["bloqueado", "vencido"].includes(actor.status))) {
      return noStore(NextResponse.json({ error: "Acesso aos relatórios não autorizado." }, { status: 403 }));
    }
    const state = await readCoreState();
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope");
    if (scope === "admin") {
      if (actor.role !== "ADMIN") return noStore(NextResponse.json({ error: "Acesso permitido somente ao administrador." }, { status: 403 }));
      return noStore(NextResponse.json({
        subscriptionRequests: (state.subscriptionRequests ?? []).map((item) => {
          if (!item || typeof item !== "object") return item;
          const { internalNote: _internalNote, history: _history, idempotencyKey: _idempotencyKey, ...safe } = item as Record<string, unknown>;
          return safe;
        }),
        emailJobs: (state.emailJobs ?? []).map((item) => {
          if (!item || typeof item !== "object") return item;
          const { html: _html, text: _text, recipient: _recipient, ...safe } = item as Record<string, unknown>;
          return safe;
        }),
        notifications: state.notifications ?? [],
        reportExports: state.reportExports ?? []
      }));
    }
    const requestedUserId = (url.searchParams.get("userId") ?? actor.id).trim();
    if (requestedUserId.length > 100) return noStore(NextResponse.json({ error: "Identificador inválido." }, { status: 400 }));
    if (requestedUserId !== actor.id && actor.role !== "ADMIN") return noStore(NextResponse.json({ error: "Você só pode gerar relatórios dos seus próprios dados." }, { status: 403 }));
    const account = state.accounts.find((item) => item.id === requestedUserId);
    if (!account) return noStore(NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 }));
    const payments = (state.payments ?? []).filter((item) => stringField(item, "clientId") === requestedUserId);
    const portfolio = (state.portfolio ?? [])
      .filter((item) => stringField(item, "userId") === requestedUserId || (requestedUserId === actor.id && !stringField(item, "userId")))
      .map((item) => item && typeof item === "object" ? Object.fromEntries(Object.entries(item as Record<string, unknown>).filter(([key]) => key !== "userId")) : item);
    return noStore(NextResponse.json({ account: publicAccount(account), payments, portfolio }));
  } catch (error) {
    return noStore(authErrorResponse(error));
  }
}
