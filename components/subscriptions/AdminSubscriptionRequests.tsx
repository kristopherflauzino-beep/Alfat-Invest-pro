"use client";

import { Ban, CheckCircle2, Clock3, History, MailWarning, PlayCircle, RefreshCw, Save, ShieldCheck, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import {
  closedSubscriptionStatuses,
  operationalSubscriptionStatuses,
  subscriptionStatusLabels,
  type ManualSubscriptionRequest,
  type SubscriptionRequestStatus
} from "@/lib/subscriptions/manual-subscription";

type Draft = { confirmationDate: string; startDate: string; expiryDate: string; transactionReference: string; publicNote: string; internalNote: string };
type AdminAction = "start_review" | "confirm_payment" | "activate" | "reject" | "cancel" | "expire" | "edit_expiration" | "add_note";
type EmailJobSummary = { id: string; status: string; attempts: number; lastError?: string; nextRetryAt?: string; createdAt: string };

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
const criticalActions = new Set<AdminAction>(["confirm_payment", "activate", "reject", "cancel", "expire", "edit_expiration"]);
const actionLabels: Record<AdminAction, string> = {
  start_review: "Iniciar análise", confirm_payment: "Confirmar pagamento", activate: "Ativar assinatura",
  reject: "Recusar solicitação", cancel: "Cancelar assinatura", expire: "Marcar como expirada",
  edit_expiration: "Salvar vencimento", add_note: "Salvar observações"
};

export function AdminSubscriptionRequests() {
  const [items, setItems] = useState<ManualSubscriptionRequest[]>([]);
  const [emailJobs, setEmailJobs] = useState<EmailJobSummary[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [tab, setTab] = useState<"operational" | "history">("operational");
  const [filter, setFilter] = useState("all");
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/subscription-requests", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Não foi possível carregar as solicitações.");
    const requests = (body.requests || []) as ManualSubscriptionRequest[];
    setItems(requests); setEmailJobs(body.emailJobs || []);
    setDrafts((current) => Object.fromEntries(requests.map((item) => [item.id, current[item.id] || {
      confirmationDate: item.confirmedAt?.slice(0, 10) || today(), startDate: item.activatedAt?.slice(0, 10) || today(),
      expiryDate: item.expiresAt?.slice(0, 10) || addDays(item.durationDays), transactionReference: item.transactionReference || "",
      publicNote: item.publicNote || "", internalNote: item.internalNote || ""
    }])));
  }, []);

  useEffect(() => { void load().catch((reason) => setError(reason.message)); }, [load]);

  const visible = useMemo(() => items.filter((item) => {
    const belongs = tab === "operational" ? operationalSubscriptionStatuses.includes(item.status) : closedSubscriptionStatuses.includes(item.status) || item.status === "awaiting_payment";
    return belongs && (filter === "all" || item.status === filter);
  }), [items, tab, filter]);

  const updateDraft = (id: string, field: keyof Draft, value: string) => setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));

  async function performAction(item: ManualSubscriptionRequest, action: AdminAction) {
    const draft = drafts[item.id];
    if (!draft) return;
    if (action === "reject" && draft.publicNote.trim().length < 3) { setError("Informe no campo público o motivo da recusa."); return; }
    if (criticalActions.has(action) && !window.confirm(`Confirma a ação: ${actionLabels[action]}?`)) return;
    setWorking(item.id + ":" + action); setError("");
    try {
      const response = await fetch("/api/admin/subscription-requests/" + item.id, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirmationDate: draft.confirmationDate || undefined, startDate: draft.startDate || undefined,
          expiryDate: draft.expiryDate || undefined, transactionReference: draft.transactionReference || undefined,
          publicNote: draft.publicNote || undefined, internalNote: draft.internalNote || undefined,
          confirmedAction: criticalActions.has(action) || undefined })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Operação não concluída.");
      setItems((current) => current.map((entry) => entry.id === item.id ? body.request : entry));
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Operação não concluída."); }
    finally { setWorking(""); }
  }

  async function retryEmail(jobId: string) {
    setWorking("email:" + jobId); setError("");
    try {
      const response = await fetch("/api/admin/email-jobs/retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível reenviar o e-mail.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível reenviar o e-mail."); }
    finally { setWorking(""); }
  }

  return <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">Solicitações de assinatura</h3><p className="text-sm text-slate-500 dark:text-slate-300">Confirmação e ativação manual dos pagamentos feitos no link oficial.</p></div><button type="button" onClick={() => void load()} className="rounded-xl bg-slate-950 p-3 text-white dark:bg-white dark:text-slate-950" title="Atualizar"><RefreshCw className="h-4 w-4" /></button></div>
    <div className="flex flex-wrap gap-2" role="tablist"><TabButton active={tab === "operational"} onClick={() => { setTab("operational"); setFilter("all"); }} icon={Clock3}>Operacionais ({items.filter((item) => operationalSubscriptionStatuses.includes(item.status)).length})</TabButton><TabButton active={tab === "history"} onClick={() => { setTab("history"); setFilter("all"); }} icon={History}>Histórico</TabButton></div>
    <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"><option value="all">Todos os status desta aba</option>{Object.entries(subscriptionStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-200">{error}</p>}

    <div className="space-y-4">{visible.map((item) => {
      const draft = drafts[item.id]; if (!draft) return null;
      return <article key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
        <div className="flex flex-wrap justify-between gap-3"><div><h4 className="font-black">{item.userName}</h4><p className="text-sm text-slate-500 dark:text-slate-300">{item.email}</p><p className="mt-1 text-sm"><strong>{item.planName}</strong> · {brl.format(item.amountInCents / 100)} · {item.durationDays} dias</p></div><span className="h-fit rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-700 dark:text-cyan-200">{subscriptionStatusLabels[item.status]}</span></div>
        <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-300 sm:grid-cols-4"><span>Criada: {new Date(item.createdAt).toLocaleString("pt-BR")}</span><span>Verificação: {formatDate(item.verificationRequestedAt)}</span><span>Confirmada: {formatDate(item.confirmedAt)}</span><span>Ativada: {formatDate(item.activatedAt)}</span></div>
        {item.customerNote && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5"><strong>Cliente:</strong> {item.customerNote}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><AdminField label="Confirmação" type="date" value={draft.confirmationDate} onChange={(value) => updateDraft(item.id, "confirmationDate", value)} /><AdminField label="Início" type="date" value={draft.startDate} onChange={(value) => updateDraft(item.id, "startDate", value)} /><AdminField label="Vencimento" type="date" value={draft.expiryDate} onChange={(value) => updateDraft(item.id, "expiryDate", value)} /><AdminField label="Referência da transação" value={draft.transactionReference} onChange={(value) => updateDraft(item.id, "transactionReference", value)} /></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><AdminArea label="Observação pública (visível ao cliente)" value={draft.publicNote} onChange={(value) => updateDraft(item.id, "publicNote", value)} /><AdminArea label="Observação interna (somente admin)" value={draft.internalNote} onChange={(value) => updateDraft(item.id, "internalNote", value)} /></div>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.status === "awaiting_verification" && <Action icon={PlayCircle} label="Iniciar análise" disabled={Boolean(working)} onClick={() => void performAction(item, "start_review")} />}
          {["awaiting_verification", "under_review"].includes(item.status) && <Action icon={CheckCircle2} label="Confirmar pagamento" disabled={Boolean(working)} onClick={() => void performAction(item, "confirm_payment")} />}
          {item.status === "payment_confirmed" && <Action icon={ShieldCheck} label="Ativar assinatura" disabled={Boolean(working)} onClick={() => void performAction(item, "activate")} />}
          {["awaiting_verification", "under_review"].includes(item.status) && <Action icon={XCircle} label="Recusar" disabled={Boolean(working)} onClick={() => void performAction(item, "reject")} />}
          {item.status === "activated" && <Action icon={Ban} label="Cancelar" disabled={Boolean(working)} onClick={() => void performAction(item, "cancel")} />}
          {item.status === "activated" && <Action icon={Clock3} label="Marcar expirada" disabled={Boolean(working)} onClick={() => void performAction(item, "expire")} />}
          {item.status === "activated" && <Action icon={Save} label="Salvar vencimento" disabled={Boolean(working)} onClick={() => void performAction(item, "edit_expiration")} />}
          <Action icon={Save} label="Salvar observações" disabled={Boolean(working)} onClick={() => void performAction(item, "add_note")} />
        </div>
        {tab === "history" && item.history.length > 0 && <details className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5"><summary className="cursor-pointer font-black">Histórico de alterações</summary><ol className="mt-3 space-y-2">{[...item.history].reverse().map((entry) => <li key={entry.id} className="border-l-2 border-cyan-500 pl-3"><strong>{subscriptionStatusLabels[entry.newStatus]}</strong> · {entry.actorName}<small className="block text-slate-500 dark:text-slate-300">{new Date(entry.createdAt).toLocaleString("pt-BR")} · {entry.action}</small>{entry.publicNote && <span className="block">Pública: {entry.publicNote}</span>}{entry.internalNote && <span className="block">Interna: {entry.internalNote}</span>}</li>)}</ol></details>}
      </article>;
    })}{visible.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-300">Nenhuma solicitação neste filtro.</p>}</div>

    {emailJobs.length > 0 && <div className="rounded-2xl border border-amber-300 bg-amber-500/10 p-4 dark:border-amber-300/30"><h4 className="flex items-center gap-2 font-black"><MailWarning className="h-5 w-5" />E-mails pendentes ou com falha</h4><div className="mt-3 space-y-2">{emailJobs.map((job) => <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 p-3 text-sm dark:bg-slate-950/60"><span><strong>{job.status}</strong> · {job.attempts} tentativa(s){job.lastError && <small className="block text-slate-600 dark:text-slate-300">{job.lastError}</small>}</span><button type="button" onClick={() => void retryEmail(job.id)} disabled={Boolean(working)} className="rounded-xl bg-amber-500 px-3 py-2 font-black text-slate-950 disabled:opacity-50">Tentar novamente</button></div>)}</div></div>}
  </section>;
}

function formatDate(value?: string) { return value ? new Date(value).toLocaleString("pt-BR") : "-"; }
function AdminField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="text-xs font-bold text-slate-500 dark:text-slate-300">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white" /></label>; }
function AdminArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-xs font-bold text-slate-500 dark:text-slate-300">{label}<textarea value={value} maxLength={1000} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white" /></label>; }
function Action({ icon: Icon, label, onClick, disabled }: { icon: ComponentType<{ className?: string }>; label: string; onClick: () => void; disabled: boolean }) { return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-800 hover:bg-cyan-500 hover:text-white disabled:opacity-50 dark:bg-white/10 dark:text-white"><Icon className="h-4 w-4" />{label}</button>; }
function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: ComponentType<{ className?: string }>; children: React.ReactNode }) { return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${active ? "bg-cyan-500 text-white" : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white"}`}><Icon className="h-4 w-4" />{children}</button>; }