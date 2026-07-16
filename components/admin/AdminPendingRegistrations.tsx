"use client";

import { CheckCircle2, Clock3, MailCheck, RefreshCw, Save, ShieldCheck, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  username: string;
  email: string;
  planName: string;
  planPriceInCents: number;
  durationDays: number;
  status: string;
  emailVerifiedAt?: string;
  paymentLinkOpenedAt?: string;
  paymentReportedAt?: string;
  paymentName?: string;
  approximatePaymentDate?: string;
  transactionId?: string;
  customerNote?: string;
  paymentConfirmedAt?: string;
  adminNote?: string;
  activatedAt?: string;
  createdAt: string;
};
type Draft = { confirmationDate: string; startDate: string; expiryDate: string; transactionId: string; adminNote: string };
type Action = "confirm_payment" | "activate" | "reject" | "cancel" | "add_note";
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const statusLabels: Record<string, string> = {
  awaiting_email_confirmation: "E-mail não confirmado",
  awaiting_payment: "Aguardando pagamento",
  payment_under_review: "Pagamento em análise",
  paid: "Pagamento confirmado",
  activated: "Conta ativada",
  rejected: "Recusado",
  cancelled: "Cancelado",
  expired: "Expirado"
};
const today = () => new Date().toISOString().slice(0, 10);
const expiryFrom = (durationDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + durationDays);
  return date.toISOString().slice(0, 10);
};

export function AdminPendingRegistrations() {
  const [items, setItems] = useState<Item[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/pending-registrations", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Não foi possível carregar os cadastros provisórios.");
    const values = (body.registrations || []) as Item[];
    setItems(values);
    setDrafts((current) => Object.fromEntries(values.map((item) => [item.id, current[item.id] || {
      confirmationDate: item.paymentConfirmedAt?.slice(0, 10) || today(),
      startDate: today(),
      expiryDate: expiryFrom(item.durationDays),
      transactionId: item.transactionId || "",
      adminNote: item.adminNote || ""
    }])));
  }, []);
  useEffect(() => { void load().catch((reason) => setError(reason.message)); }, [load]);
  const operational = useMemo(() => items.filter((item) => !["activated", "rejected", "cancelled", "expired"].includes(item.status)), [items]);

  function update(id: string, key: keyof Draft, value: string) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  }

  async function act(item: Item, action: Action) {
    const draft = drafts[item.id];
    if (!draft || !window.confirm("Confirma esta ação administrativa?")) return;
    setWorking(item.id + action);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/pending-registrations/" + item.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirmationDate: draft.confirmationDate || undefined, startDate: draft.startDate || undefined, expiryDate: draft.expiryDate || undefined, transactionId: draft.transactionId || undefined, adminNote: draft.adminNote || undefined, confirmedAction: true })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Operação não concluída.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Operação não concluída.");
    } finally {
      setWorking("");
    }
  }

  async function resendEmail(item: Item) {
    setWorking(item.id + ":resend");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/pending-registrations/" + item.id + "/resend-email", {
        method: "POST"
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível reenviar a confirmação.");
      setMessage(body.message || "E-mail de confirmação reenviado.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível reenviar a confirmação.");
    } finally {
      setWorking("");
    }
  }

  return <section className="mb-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">Cadastros aguardando pagamento</h3><p className="text-sm text-slate-500 dark:text-slate-300">A conta só é criada após confirmar o pagamento e ativar manualmente.</p></div><button type="button" onClick={() => void load()} className="rounded-xl bg-slate-950 p-3 text-white dark:bg-white dark:text-slate-950" aria-label="Atualizar cadastros"><RefreshCw className="h-4 w-4" /></button></div>
    {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-800 dark:text-red-200">{error}</p>}
    {message && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200">{message}</p>}
    <div className="space-y-3">
      {operational.map((item) => {
        const draft = drafts[item.id];
        if (!draft) return null;
        return <article key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-black">{item.name}</h4><p className="text-sm text-slate-500 dark:text-slate-300">{item.email} · @{item.username}</p><p className="mt-1 text-sm"><strong>{item.planName}</strong> · {brl.format(item.planPriceInCents / 100)} · {item.durationDays} dias</p></div><span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-800 dark:text-cyan-200">{statusLabels[item.status] || item.status}</span></div>
          <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-300 sm:grid-cols-3"><span>Criado: {new Date(item.createdAt).toLocaleString("pt-BR")}</span><span>E-mail: {item.emailVerifiedAt ? "confirmado" : "não confirmado"}</span><span>Pagamento informado: {item.paymentReportedAt ? new Date(item.paymentReportedAt).toLocaleString("pt-BR") : "-"}</span></div>
          {item.customerNote && <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm dark:bg-white/5"><strong>Cliente:</strong> {item.customerNote}</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Confirmação" type="date" value={draft.confirmationDate} onChange={(value) => update(item.id, "confirmationDate", value)} />
            <Field label="Início" type="date" value={draft.startDate} onChange={(value) => update(item.id, "startDate", value)} />
            <Field label="Vencimento" type="date" value={draft.expiryDate} onChange={(value) => update(item.id, "expiryDate", value)} />
            <Field label="Transação" value={draft.transactionId} onChange={(value) => update(item.id, "transactionId", value)} />
            <Field label="Observação" value={draft.adminNote} onChange={(value) => update(item.id, "adminNote", value)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.status === "awaiting_email_confirmation" && <Button icon={MailCheck} label="Reenviar confirmação" disabled={Boolean(working)} onClick={() => void resendEmail(item)} />}
            {["awaiting_payment", "payment_under_review"].includes(item.status) && <Button icon={CheckCircle2} label="Confirmar pagamento" disabled={Boolean(working)} onClick={() => void act(item, "confirm_payment")} />}
            {item.status === "paid" && <Button icon={ShieldCheck} label="Ativar conta" disabled={Boolean(working)} onClick={() => void act(item, "activate")} />}
            {!["paid", "activated"].includes(item.status) && <Button icon={XCircle} label="Recusar" disabled={Boolean(working)} onClick={() => void act(item, "reject")} />}
            <Button icon={Save} label="Salvar observação" disabled={Boolean(working)} onClick={() => void act(item, "add_note")} />
          </div>
        </article>;
      })}
      {operational.length === 0 && <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-300"><Clock3 className="mr-2 inline h-4 w-4" />Nenhum cadastro provisório aguardando ação.</p>}
    </div>
  </section>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="text-xs font-bold text-slate-500 dark:text-slate-300">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} maxLength={type === "text" ? 1000 : undefined} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white" /></label>;
}
function Button({ icon: Icon, label, disabled, onClick }: { icon: typeof CheckCircle2; label: string; disabled: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-800 hover:bg-cyan-500 hover:text-white disabled:opacity-50 dark:bg-white/10 dark:text-white"><Icon className="h-4 w-4" />{label}</button>;
}
