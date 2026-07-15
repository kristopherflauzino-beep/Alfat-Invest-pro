"use client";

import { CheckCircle2, Clock3, ExternalLink, LoaderCircle, ShieldCheck, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MERCADO_PAGO_PAYMENT_LINK,
  subscriptionStatusLabels,
  type ManualSubscriptionRequest
} from "@/lib/subscriptions/manual-subscription";

type Plan = { id: string; name: string; value: number; durationDays: number; status: string; permissions: string[] };
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const benefitLabels: Record<string, string> = {
  mercado: "Mercado", oportunidades: "Oportunidades", comparador: "Comparador", carteira: "Minha Carteira",
  radar: "Radar IA", relatorios: "Relatórios", graham_valuation: "Valuation Graham",
  alfatec_fiis: "Método AlfaTec FIIs", alfatec_crypto_method: "Método AlfaTec Cripto",
  alfatec_portfolio_method: "Análise e Balanceamento", notificacoes: "Notificações"
};

export function MercadoPagoLinkCheckout({ plans, currentPlanId, userName, userEmail }: { plans: Plan[]; currentPlanId?: string; userName: string; userEmail: string }) {
  const available = useMemo(() => plans.filter((plan) => plan.status === "ativo"), [plans]);
  const [planId, setPlanId] = useState(currentPlanId && available.some((plan) => plan.id === currentPlanId) ? currentPlanId : available[0]?.id ?? "");
  const [requests, setRequests] = useState<ManualSubscriptionRequest[]>([]);
  const [activeIntent, setActiveIntent] = useState<ManualSubscriptionRequest | null>(null);
  const [confirmedPayment, setConfirmedPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const plan = available.find((item) => item.id === planId);

  const load = useCallback(async () => {
    const response = await fetch("/api/subscription-requests", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Não foi possível carregar as solicitações.");
    setRequests(body.requests || []);
  }, []);

  useEffect(() => { void load().catch((reason) => setError(reason.message)); }, [load]);
  useEffect(() => { setActiveIntent(null); setConfirmedPayment(false); setMessage(""); setError(""); }, [planId]);

  async function openPayment() {
    if (!plan || loading) return;
    const paymentWindow = window.open("about:blank", "_blank");
    if (paymentWindow) paymentWindow.opener = null;
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/subscription-requests/payment-link/open", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan.id })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível registrar o acesso ao pagamento.");
      setActiveIntent(body.intent);
      setRequests((current) => [body.intent, ...current.filter((item) => item.id !== body.intent.id)]);
      if (paymentWindow) paymentWindow.location.href = body.paymentUrl;
      else window.open(body.paymentUrl, "_blank", "noopener,noreferrer");
      setMessage("Acesso registrado. A intenção permanece válida por 24 horas.");
    } catch (reason) {
      paymentWindow?.close();
      setError(reason instanceof Error ? reason.message : "Não foi possível abrir o Mercado Pago.");
    } finally { setLoading(false); }
  }

  async function requestVerification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeIntent || !confirmedPayment) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(`/api/subscription-requests/${activeIntent.id}/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmedPayment: true, paymentName: String(form.get("paymentName") || userName),
          approximatePaymentDate: String(form.get("paymentDate") || "") || undefined,
          transactionReference: String(form.get("transactionReference") || "") || undefined,
          customerNote: String(form.get("customerNote") || "") || undefined })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível solicitar a verificação.");
      setMessage(body.message); setActiveIntent(null); setConfirmedPayment(false); await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível solicitar a verificação.");
    } finally { setLoading(false); }
  }

  if (!plan) return <p className="rounded-2xl bg-amber-500/10 p-4 text-sm font-semibold text-amber-700 dark:text-amber-200">Nenhum plano ativo está disponível.</p>;

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">{available.map((item) => <button key={item.id} type="button" onClick={() => setPlanId(item.id)} className={`min-h-28 rounded-2xl border p-4 text-left transition ${item.id === planId ? "border-cyan-500 bg-cyan-500/10" : "border-slate-200 bg-white hover:border-cyan-300 dark:border-white/10 dark:bg-white/5"}`}><span className="block text-sm font-black">{item.name}</span><strong className="mt-2 block text-2xl">{brl.format(item.value)}</strong><span className="text-xs text-slate-500 dark:text-slate-300">{item.durationDays} dias</span></button>)}</div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
      <div className="flex items-start gap-3"><WalletCards className="mt-1 h-6 w-6 text-cyan-500" /><div><h4 className="text-lg font-black">Resumo da contratação</h4><p className="text-sm text-slate-500 dark:text-slate-300">Plano {plan.name}, {plan.durationDays} dias, valor oficial de {brl.format(plan.value)}.</p></div></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{plan.permissions.filter((item) => benefitLabels[item]).slice(0, 8).map((permission) => <span key={permission} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm dark:bg-white/5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{benefitLabels[permission]}</span>)}</div>
      <p className="mt-4 rounded-2xl bg-blue-500/10 p-4 text-sm text-blue-800 dark:text-blue-200"><ShieldCheck className="mr-2 inline h-5 w-5" />O pagamento será realizado no ambiente seguro do Mercado Pago. Após a confirmação, sua assinatura será analisada e ativada manualmente pelo administrador.</p>
      <button type="button" onClick={() => void openPayment()} disabled={loading} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#009ee3] px-5 py-3 font-black text-white transition hover:bg-[#008ac6] focus:outline-none focus:ring-4 focus:ring-cyan-300 disabled:opacity-60 dark:focus:ring-cyan-800">{loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ExternalLink className="h-5 w-5" />}Pagar com Mercado Pago</button>
      <a href={MERCADO_PAGO_PAYMENT_LINK} target="_blank" rel="noopener noreferrer" className="sr-only">Abrir link oficial do Mercado Pago</a>
    </div>
    {activeIntent && <form onSubmit={requestVerification} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950 sm:grid-cols-2">
      <div className="sm:col-span-2"><h4 className="text-lg font-black">Solicitar verificação do pagamento</h4><p className="text-sm text-slate-500 dark:text-slate-300">Use esta opção somente depois de concluir o pagamento no Mercado Pago.</p></div>
      <Field name="paymentName" label="Nome completo" defaultValue={userName} required /><Field name="email" type="email" label="E-mail da conta" defaultValue={userEmail} readOnly />
      <Field name="paymentDate" type="date" label="Data aproximada do pagamento" defaultValue={new Date().toISOString().slice(0, 10)} required /><Field name="transactionReference" label="Identificação da transação (opcional)" />
      <label className="text-sm font-bold sm:col-span-2">Observação opcional<textarea name="customerNote" maxLength={500} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white" /></label>
      <label className="sm:col-span-2 flex items-start gap-3 rounded-2xl bg-amber-500/10 p-4 text-sm font-semibold"><input type="checkbox" checked={confirmedPayment} onChange={(event) => setConfirmedPayment(event.target.checked)} className="mt-1 h-4 w-4" />Confirmo que já realizei o pagamento no ambiente do Mercado Pago.</label>
      <button disabled={loading || !confirmedPayment} className="sm:col-span-2 min-h-11 rounded-2xl bg-cyan-500 px-4 py-3 font-black text-white disabled:opacity-60">Solicitar verificação</button>
    </form>}
    {message && <p className="rounded-2xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{message}</p>}{error && <p className="rounded-2xl bg-red-500/10 p-4 text-sm font-semibold text-red-700 dark:text-red-200">{error}</p>}
    {requests.length > 0 && <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950"><h4 className="font-black">Minhas solicitações</h4><div className="mt-3 space-y-2">{requests.slice(0, 8).map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5"><div className="flex flex-wrap items-center justify-between gap-2"><span><strong>{item.planName}</strong><small className="block text-slate-500 dark:text-slate-300">{new Date(item.createdAt).toLocaleString("pt-BR")}</small></span><span className="inline-flex items-center gap-1 font-bold"><Clock3 className="h-4 w-4" />{subscriptionStatusLabels[item.status]}</span></div>{item.publicNote && <p className="mt-2 border-t border-slate-200 pt-2 text-slate-600 dark:border-white/10 dark:text-slate-300"><strong>Administrador:</strong> {item.publicNote}</p>}</div>)}</div></div>}
  </div>;
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="text-sm font-bold">{label}<input {...props} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 disabled:opacity-70 dark:border-white/10 dark:bg-slate-950 dark:text-white" /></label>;
}