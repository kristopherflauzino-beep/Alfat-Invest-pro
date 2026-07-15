import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAccount } from "@/lib/auth/session";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";

export const runtime = "nodejs";

const schema = z.object({
  format: z.enum(["pdf", "xlsx", "csv", "json", "png"]),
  sections: z.array(z.string().min(1).max(80)).min(1).max(60),
  reportType: z.string().min(1).max(180),
  targetUserId: z.string().min(1).max(100),
  period: z.object({ start: z.iso.date(), end: z.iso.date(), label: z.string().min(1).max(100) }).strict()
}).strict();

function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  try {
    const actor = await requireAccount(request);
    if (actor.role !== "ADMIN" && (!actor.permissions.includes("relatorios") || ["bloqueado", "vencido"].includes(actor.status))) {
      return NextResponse.json({ error: "Acesso aos relatórios não autorizado." }, { status: 403 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados da exportação inválidos." }, { status: 422 });
    const input = parsed.data;
    if (input.period.start > input.period.end) return NextResponse.json({ error: "Período inválido." }, { status: 422 });
    if (input.targetUserId !== actor.id && actor.role !== "ADMIN") return NextResponse.json({ error: "Você só pode exportar seus próprios dados." }, { status: 403 });
    const state = await readCoreState();
    if (!state.accounts.some((account) => account.id === input.targetUserId)) return NextResponse.json({ error: "Usuário do relatório não encontrado." }, { status: 404 });
    const now = Date.now();
    const windowStart = now - 10 * 60 * 1_000;
    const events = Array.isArray(state.reportRateEvents) ? state.reportRateEvents as Array<{ userId?: string; createdAt?: string }> : [];
    const recent = events.filter((event) => event.userId === actor.id && new Date(event.createdAt ?? 0).getTime() >= windowStart);
    if (recent.length >= 15) {
      const response = NextResponse.json({ error: "Muitas exportações em pouco tempo. Tente novamente em alguns minutos." }, { status: 429 });
      response.headers.set("retry-after", "600"); return response;
    }
    const createdAt = new Date(now).toISOString();
    const record = { id: crypto.randomUUID(), userId: actor.id, userName: actor.name, targetUserId: input.targetUserId, format: input.format, reportType: input.reportType, sections: input.sections, period: input.period, result: "authorized", createdAt };
    state.reportRateEvents = [...events.filter((event) => new Date(event.createdAt ?? 0).getTime() >= now - 24 * 60 * 60 * 1_000), { userId: actor.id, createdAt }];
    state.reportExports = [record, ...(Array.isArray(state.reportExports) ? state.reportExports : [])].slice(0, 2_000);
    state.auditLogs = [{ id: crypto.randomUUID(), action: "exportacao_relatorio", userId: actor.id, userName: actor.name, details: `${input.reportType} em ${input.format.toUpperCase()} com ${input.sections.length} seção(ões).`, createdAt, risk: "baixo" }, ...state.auditLogs].slice(0, 1_000);
    await writeCoreState(state);
    return NextResponse.json({ ok: true, exportId: record.id });
  } catch (error) {
    return authErrorResponse(error);
  }
}
