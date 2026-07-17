"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, FileSpreadsheet, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import type { AlfatecCryptoAnalysis } from "@/lib/analysis/alfatec-crypto";
import { FREE_REPORT_FORMATS, FREE_REPORT_SECTIONS } from "@/lib/plans/access";
import type { AlfatecFiiAnalysis } from "@/lib/analysis/alfatec-fii";
import { adminReportSections, clientReportSections } from "@/lib/reports/catalog";
import {
  buildAdminReport,
  buildClientReport,
  type ReportAudit,
  type ReportEmailJob,
  type ReportNotification,
  type ReportExport,
  type ReportPayment,
  type ReportPlan,
  type ReportSubscriptionRequest,
  type ReportUser
} from "@/lib/reports/build-report";
import { formatReportCell } from "@/lib/reports/types";
import { analyzePortfolio } from "@/lib/portfolio";
import type { Asset, PortfolioAnalysis, PortfolioPosition } from "@/lib/types";
import { ReportExportModal } from "@/components/reports/ReportExportModal";

type AdminContext = {
  subscriptionRequests: ReportSubscriptionRequest[];
  emailJobs: ReportEmailJob[];
  notifications: ReportNotification[];
  reportExports: ReportExport[];
};

type IndividualContext = {
  account: ReportUser;
  payments: ReportPayment[];
  portfolio: PortfolioPosition[];
};

type Props = {
  mode: "client" | "admin";
  freeMode?: boolean;
  user: ReportUser;
  accounts?: ReportUser[];
  plans?: ReportPlan[];
  payments?: ReportPayment[];
  auditLogs?: ReportAudit[];
  portfolio: PortfolioAnalysis;
  assets: Asset[];
  fiiAnalyses: Array<{ asset: Asset; analysis: AlfatecFiiAnalysis }>;
  cryptoAnalyses: AlfatecCryptoAnalysis[];
};

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function label(start: string, end: string) { return `${new Date(`${start}T12:00:00`).toLocaleDateString("pt-BR")} a ${new Date(`${end}T12:00:00`).toLocaleDateString("pt-BR")}`; }

function quickPeriod(kind: string) {
  const now = new Date(); let start = new Date(now); let end = new Date(now);
  if (kind === "7d") start.setDate(now.getDate() - 6);
  if (kind === "30d") start.setDate(now.getDate() - 29);
  if (kind === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (kind === "previous") { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); }
  if (kind === "year") start = new Date(now.getFullYear(), 0, 1);
  return { start: iso(start), end: iso(end), label: label(iso(start), iso(end)) };
}

export function ReportCenter({ mode, freeMode = false, user, accounts = [], plans = [], payments = [], auditLogs = [], portfolio, assets, fiiAnalyses, cryptoAnalyses }: Props) {
  const [period, setPeriod] = useState(() => quickPeriod("year"));
  const [clientId, setClientId] = useState("");
  const [planId, setPlanId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scope, setScope] = useState<"admin" | "individual">("admin");
  const [adminContext, setAdminContext] = useState<AdminContext>({ subscriptionRequests: [], emailJobs: [], notifications: [], reportExports: [] });
  const [individual, setIndividual] = useState<IndividualContext | null>(null);
  const [loadingIndividual, setLoadingIndividual] = useState(false);
  const [contextError, setContextError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const clients = useMemo(() => accounts.filter((account) => account.role === "CLIENTE"), [accounts]);

  useEffect(() => {
    if (mode !== "admin") return;
    const controller = new AbortController();
    fetch("/api/reports/context?scope=admin", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os dados administrativos."); return payload; })
      .then((payload) => setAdminContext({ subscriptionRequests: payload.subscriptionRequests ?? [], emailJobs: payload.emailJobs ?? [], notifications: payload.notifications ?? [], reportExports: payload.reportExports ?? [] }))
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setContextError(error.message); });
    return () => controller.abort();
  }, [mode]);

  async function loadIndividual() {
    if (!clientId) { setContextError("Selecione um cliente para gerar o relatório individual."); return; }
    setLoadingIndividual(true); setContextError("");
    try {
      const response = await fetch(`/api/reports/context?userId=${encodeURIComponent(clientId)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar o relatório individual.");
      setIndividual(payload); setScope("individual");
    } catch (error) { setContextError(error instanceof Error ? error.message : "Não foi possível carregar o cliente."); }
    finally { setLoadingIndividual(false); }
  }

  const report = useMemo(() => {
    if (mode === "client") return buildClientReport({ user, portfolio, assets, fiiAnalyses, cryptoAnalyses, plans, payments, period });
    if (scope === "individual" && individual) {
      return buildClientReport({ user: individual.account, portfolio: analyzePortfolio(individual.portfolio, assets), assets, fiiAnalyses, cryptoAnalyses, plans, payments: individual.payments, period });
    }
    return buildAdminReport({ user, accounts, plans, payments, auditLogs, subscriptionRequests: adminContext.subscriptionRequests, emailJobs: adminContext.emailJobs, notifications: adminContext.notifications, reportExports: adminContext.reportExports, filters: { period, clientId: clientId || undefined, planId: planId || undefined, status: statusFilter || undefined } });
  }, [mode, user, portfolio, assets, fiiAnalyses, cryptoAnalyses, period, scope, individual, accounts, plans, payments, auditLogs, adminContext, clientId, planId, statusFilter]);
  const catalog = useMemo(() => mode === "admin" && scope === "admin"
    ? adminReportSections
    : freeMode
      ? clientReportSections.filter((section) => (FREE_REPORT_SECTIONS as readonly string[]).includes(section.id))
      : clientReportSections, [mode, scope, freeMode]);
  const canExport = mode === "client" || scope === "admin" || Boolean(individual);

  return (
    <div className="space-y-6">
      {mode === "admin" && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f172a]">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de relatório administrativo">
            <button type="button" role="tab" aria-selected={scope === "admin"} onClick={() => setScope("admin")} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-black ${scope === "admin" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white"}`}><ShieldCheck className="h-4 w-4" />Relatórios administrativos</button>
            <button type="button" role="tab" aria-selected={scope === "individual"} onClick={() => { if (individual) setScope("individual"); else void loadIndividual(); }} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-black ${scope === "individual" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white"}`}><UserRound className="h-4 w-4" />Relatório individual</button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Selecionar cliente<select value={clientId} onChange={(event) => { setClientId(event.target.value); setIndividual(null); }} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-950 dark:border-white/15 dark:bg-slate-950 dark:text-white"><option value="">Todos os clientes</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.email} · {client.id}</option>)}</select></label>
            <button type="button" onClick={loadIndividual} disabled={!clientId || loadingIndividual} className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{loadingIndividual ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}Carregar relatório individual</button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f172a]">
        <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-teal-600 dark:text-cyan-300" /><div><h3 className="font-black text-slate-950 dark:text-white">Filtros do relatório</h3><p className="text-xs text-slate-500 dark:text-slate-300">Os filtros alteram somente o documento, nunca os dados salvos.</p></div></div>
        <div className="mt-4 flex flex-wrap gap-2">{[["today","Hoje"],["7d","Últimos 7 dias"],["30d","Últimos 30 dias"],["month","Mês atual"],["previous","Mês anterior"],["year","Ano atual"]].map(([id, title]) => <button type="button" key={id} onClick={() => setPeriod(quickPeriod(id))} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-bold hover:border-teal-500 dark:border-white/15">{title}</button>)}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Data inicial<input type="date" value={period.start} onChange={(event) => setPeriod((current) => ({ ...current, start: event.target.value, label: label(event.target.value, current.end) }))} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-950 dark:border-white/15 dark:bg-slate-950 dark:text-white" /></label>
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Data final<input type="date" value={period.end} onChange={(event) => setPeriod((current) => ({ ...current, end: event.target.value, label: label(current.start, event.target.value) }))} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-950 dark:border-white/15 dark:bg-slate-950 dark:text-white" /></label>
          {mode === "admin" && scope === "admin" && <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Plano<select value={planId} onChange={(event) => setPlanId(event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-950 dark:border-white/15 dark:bg-slate-950 dark:text-white"><option value="">Todos</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>}
          {mode === "admin" && scope === "admin" && <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-950 dark:border-white/15 dark:bg-slate-950 dark:text-white"><option value="">Todos</option><option value="ativo">Ativo</option><option value="pendente">Pendente</option><option value="bloqueado">Bloqueado</option><option value="vencido">Vencido</option></select></label>}
        </div>
      </div>

      {freeMode && <div className="rounded-lg border border-cyan-300 bg-cyan-500/10 p-4 text-sm font-semibold text-cyan-900 dark:border-cyan-400/30 dark:text-cyan-100">O Plano FREE permite relatório resumido somente em PDF. Formatos e seções avançadas ficam disponíveis após o upgrade.</div>}
      {contextError && <p className="rounded-md border border-red-300 bg-red-500/10 p-4 text-sm font-semibold text-red-600 dark:text-red-300">{contextError}</p>}
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f172a]">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><FileSpreadsheet className="h-6 w-6 text-teal-600 dark:text-cyan-300" /><div><p className="text-xs font-black uppercase text-teal-600 dark:text-cyan-300">Documento independente</p><h3 className="text-xl font-black text-slate-950 dark:text-white">{report.title}</h3><p className="text-sm text-slate-500 dark:text-slate-300">{report.user.name} · {report.period.label}</p></div></div><button type="button" onClick={() => setModalOpen(true)} disabled={!canExport} className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-5 py-3 font-black text-white disabled:opacity-50"><Download className="h-5 w-5" />Exportar relatório</button></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{report.summary.slice(0, 8).map((metric) => <div key={metric.label} className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950"><p className="text-xs font-bold text-slate-500 dark:text-slate-300">{metric.label}</p><p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{formatReportCell(metric.value)}</p></div>)}</div>
        <div className="mt-5 grid gap-3 text-xs text-slate-500 dark:text-slate-300 sm:grid-cols-3"><p><strong className="text-slate-800 dark:text-white">Dados atualizados:</strong><br />{new Date(report.dataUpdatedAt).toLocaleString("pt-BR")}</p><p><strong className="text-slate-800 dark:text-white">Fontes:</strong><br />{report.sources.join(" · ") || "Dado indisponível"}</p><p><strong className="text-slate-800 dark:text-white">Seções disponíveis:</strong><br />{catalog.length}</p></div>
      </div>

      <ReportExportModal open={modalOpen} onClose={() => setModalOpen(false)} report={report} catalog={catalog} allowedFormats={freeMode ? FREE_REPORT_FORMATS : undefined} fixedSections={freeMode} />
    </div>
  );
}
