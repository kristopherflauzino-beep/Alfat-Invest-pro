import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse } from "@/lib/auth/session";
import { requireResourceAccess } from "@/lib/plans/server-access";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";
import type { PortfolioMethodProfile } from "@/lib/portfolio/alfatec-portfolio-method";
export const runtime = "nodejs";
const schema = z.object({ totalEquity: z.number().min(0).max(1000000000000), score: z.number().int().min(0).max(100).nullable(), allocations: z.array(z.object({ id: z.enum(["reserva_caixa", "renda_fixa", "acoes_brasileiras", "fiis", "etfs_brasileiros", "exterior", "criptomoedas", "outros"]), currentPercent: z.number().min(0).max(100), targetPercent: z.number().min(0).max(100) }).strict()).max(8) }).strict();
function isProfile(value: unknown): value is PortfolioMethodProfile { return Boolean(value && typeof value === "object" && typeof (value as PortfolioMethodProfile).userId === "string"); }
const requireAccount = (request: Request) => requireResourceAccess(request, "alfatec_portfolio_method");
export async function POST(request: Request) { try { assertSameOrigin(request); const account = await requireAccount(request); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Snapshot inválido." }, { status: 422 }); const state = await readCoreState(); const profiles = (Array.isArray(state.portfolioProfiles) ? state.portfolioProfiles : []).filter(isProfile); const index = profiles.findIndex((item) => item.userId === account.id); if (index < 0) return NextResponse.json({ error: "Salve o perfil antes de registrar o histórico." }, { status: 409 }); const profile = profiles[index]; profile.history = [{ id: randomUUID(), createdAt: new Date().toISOString(), totalEquity: parsed.data.totalEquity, score: parsed.data.score, profileName: profile.profileName, allocations: parsed.data.allocations }, ...(profile.history || [])].slice(0, 60); profile.updatedAt = new Date().toISOString(); profiles[index] = profile; state.portfolioProfiles = profiles; await writeCoreState(state); return NextResponse.json({ profile }, { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { if (error instanceof AuthError) return authErrorResponse(error); return requestErrorResponse(error); } }
