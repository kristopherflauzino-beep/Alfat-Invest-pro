import { NextResponse } from "next/server";
import { z } from "zod";
import { stockFilterSchema } from "@/lib/opportunities/stock-filters";
import { authErrorResponse, requireAccount } from "@/lib/auth/session";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";
const saveSchema = z.object({ name: z.string().trim().min(2).max(60), filters: stockFilterSchema }).strict();
const deleteSchema = z.object({ id: z.string().min(1).max(100) }).strict();

type SavedFilter = {
  id: string;
  userId: string;
  name: string;
  filters: z.infer<typeof stockFilterSchema>;
  createdAt: string;
  updatedAt: string;
};

function isSavedFilter(value: unknown): value is SavedFilter {
  return Boolean(value && typeof value === "object" && typeof (value as SavedFilter).id === "string" && typeof (value as SavedFilter).userId === "string");
}

export async function GET(request: Request) {
  try {
    const account = await requireAccount(request);
    const state = await readCoreState();
    const items = (Array.isArray(state.savedOpportunityFilters) ? state.savedOpportunityFilters : [])
      .filter(isSavedFilter)
      .filter((item) => item.userId === account.id)
      .map(({ userId: _userId, ...item }) => item);
    return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await requireAccount(request);
    const parsed = saveSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Revise o nome e os filtros informados." }, { status: 422 });
    const state = await readCoreState();
    const items = (Array.isArray(state.savedOpportunityFilters) ? state.savedOpportunityFilters : []).filter(isSavedFilter);
    const now = new Date().toISOString();
    const existing = items.find((item) => item.userId === account.id && item.name.toLowerCase() === parsed.data.name.toLowerCase());
    const saved: SavedFilter = existing
      ? { ...existing, name: parsed.data.name, filters: parsed.data.filters, updatedAt: now }
      : { id: crypto.randomUUID(), userId: account.id, name: parsed.data.name, filters: parsed.data.filters, createdAt: now, updatedAt: now };
    const own = items.filter((item) => item.userId === account.id && item.id !== saved.id);
    if (!existing && own.length >= 20) return NextResponse.json({ error: "Limite de 20 filtros salvos atingido." }, { status: 409 });
    const other = items.filter((item) => item.userId !== account.id);
    state.savedOpportunityFilters = [saved, ...own, ...other];
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: existing ? "filtro_oportunidade_atualizado" : "filtro_oportunidade_salvo",
      userId: account.id,
      userName: account.name,
      details: "Filtro de ações: " + saved.name,
      origin: "opportunities",
      result: "success",
      createdAt: now,
      risk: "baixo"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    const { userId: _userId, ...publicSaved } = saved;
    return NextResponse.json({ item: publicSaved }, { status: existing ? 200 : 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await requireAccount(request);
    const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Filtro inválido." }, { status: 422 });
    const state = await readCoreState();
    const items = (Array.isArray(state.savedOpportunityFilters) ? state.savedOpportunityFilters : []).filter(isSavedFilter);
    if (!items.some((item) => item.id === parsed.data.id && item.userId === account.id)) {
      return NextResponse.json({ error: "Filtro não encontrado." }, { status: 404 });
    }
    state.savedOpportunityFilters = items.filter((item) => !(item.id === parsed.data.id && item.userId === account.id));
    await writeCoreState(state);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
