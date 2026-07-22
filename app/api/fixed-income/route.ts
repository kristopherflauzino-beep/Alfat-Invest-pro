import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse } from "@/lib/auth/session";
import { fixedIncomeIndexers, fixedIncomeTypes, type FixedIncomeInvestment } from "@/lib/fixed-income/types";
import { requireResourceAccess } from "@/lib/plans/server-access";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fieldsSchema = z.object({
  type: z.enum(fixedIncomeTypes),
  name: z.string().trim().min(2).max(120),
  broker: z.string().trim().max(80).optional(),
  institution: z.string().trim().max(80).optional(),
  issuerName: z.string().trim().max(120).optional(),
  maskedAccount: z.string().trim().max(40).optional(),
  principalInCents: z.number().int().positive().max(100_000_000_000),
  applicationDate: z.iso.date(),
  maturityDate: z.iso.date().optional(),
  liquidityType: z.enum(["daily", "at_maturity", "after_grace_period", "custom"]),
  gracePeriodDays: z.number().int().min(0).max(36500).optional(),
  indexer: z.enum(fixedIncomeIndexers),
  indexerPercentage: z.number().min(0).max(1000).optional(),
  fixedRateAnnual: z.number().min(-50).max(1000).optional(),
  spreadAnnual: z.number().min(-50).max(1000).optional(),
  incomeTaxType: z.enum(["regressive", "exempt", "other"]),
  taxExempt: z.boolean(),
  iofApplicable: z.boolean(),
  fgcCovered: z.boolean(),
  fgcLimitInCents: z.number().int().positive().max(10_000_000_000).optional(),
  interestFrequency: z.enum(["at_maturity", "monthly", "semiannual", "annual"]),
  marking: z.enum(["curve", "market"]),
  marketValueInCents: z.number().int().positive().max(100_000_000_000).optional(),
  status: z.enum(["active", "matured", "redeemed", "cancelled"]),
  notes: z.string().trim().max(500).optional()
}).strict().superRefine((value, context) => {
  if (value.maturityDate && value.maturityDate < value.applicationDate) {
    context.addIssue({ code: "custom", path: ["maturityDate"], message: "O vencimento deve ser posterior à aplicação." });
  }
  if (value.maskedAccount && !/[xX*•]/.test(value.maskedAccount)) {
    context.addIssue({ code: "custom", path: ["maskedAccount"], message: "Informe apenas a conta mascarada." });
  }
  if (value.marking === "market" && !value.marketValueInCents) {
    context.addIssue({ code: "custom", path: ["marketValueInCents"], message: "Informe o valor de mercado." });
  }
});

const updateSchema = z.object({ id: z.string().uuid(), data: fieldsSchema }).strict();

function isInvestment(value: unknown): value is FixedIncomeInvestment {
  return Boolean(value && typeof value === "object" && typeof (value as FixedIncomeInvestment).id === "string" && typeof (value as FixedIncomeInvestment).userId === "string");
}

async function accountFor(request: Request) {
  return requireResourceAccess(request, "renda_fixa");
}

export async function GET(request: Request) {
  try {
    const account = await accountFor(request);
    const state = await readCoreState();
    const investments = (Array.isArray(state.fixedIncomeInvestments) ? state.fixedIncomeInvestments : [])
      .filter(isInvestment)
      .filter((item) => item.userId === account.id)
      .sort((a, b) => b.applicationDate.localeCompare(a.applicationDate));
    return NextResponse.json({ investments }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await accountFor(request);
    const parsed = fieldsSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });
    const state = await readCoreState();
    const now = new Date().toISOString();
    const investment: FixedIncomeInvestment = { ...parsed.data, id: randomUUID(), userId: account.id, createdAt: now, updatedAt: now };
    const values = (Array.isArray(state.fixedIncomeInvestments) ? state.fixedIncomeInvestments : []).filter(isInvestment);
    state.fixedIncomeInvestments = [investment, ...values];
    state.auditLogs = [{ id: randomUUID(), action: "renda_fixa_criada", userId: account.id, userName: account.name, details: `${investment.type} ${investment.name} cadastrado sem credenciais bancárias.`, createdAt: now, risk: "baixo" }, ...(state.auditLogs ?? [])];
    await writeCoreState(state);
    return NextResponse.json({ investment }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await accountFor(request);
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });
    const state = await readCoreState();
    const values = (Array.isArray(state.fixedIncomeInvestments) ? state.fixedIncomeInvestments : []).filter(isInvestment);
    const current = values.find((item) => item.id === parsed.data.id && item.userId === account.id);
    if (!current) return NextResponse.json({ error: "Investimento não encontrado." }, { status: 404 });
    const updated: FixedIncomeInvestment = { ...current, ...parsed.data.data, id: current.id, userId: current.userId, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
    state.fixedIncomeInvestments = values.map((item) => item.id === updated.id ? updated : item);
    await writeCoreState(state);
    return NextResponse.json({ investment: updated }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await accountFor(request);
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Identificador inválido." }, { status: 422 });
    const state = await readCoreState();
    const values = (Array.isArray(state.fixedIncomeInvestments) ? state.fixedIncomeInvestments : []).filter(isInvestment);
    const current = values.find((item) => item.id === id && item.userId === account.id);
    if (!current) return NextResponse.json({ error: "Investimento não encontrado." }, { status: 404 });
    state.fixedIncomeInvestments = values.filter((item) => item.id !== id);
    state.auditLogs = [{ id: randomUUID(), action: "renda_fixa_excluida", userId: account.id, userName: account.name, details: `${current.type} ${current.name} removido da carteira.`, createdAt: new Date().toISOString(), risk: "medio" }, ...(state.auditLogs ?? [])];
    await writeCoreState(state);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}
