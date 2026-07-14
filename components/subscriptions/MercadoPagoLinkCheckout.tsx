"use client";

import { CheckCircle2, Clock3, ExternalLink, LoaderCircle, ShieldCheck, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { MERCADO_PAGO_PAYMENT_LINK, subscriptionStatusLabels, type ManualSubscriptionRequest } from "@/lib/subscriptions/manual-subscription";

type Plan = { id: string; name: string; value: number; durationDays: number; status: string; permissions: string[] };
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const benefitLabels: Record<string, string> = { mercado: "Mercado", oportunidades: "Oportunidades", comparador: "Comparador", carteira: "Minha Carteira", radar: "Radar IA", relatorios: "Relatórios", graham_valuation: "Valuation Graham", alfatec_fiis: "Método AlfaTec FIIs", alfatec_crypto_method: "Método AlfaTec Cripto", alfatec_portfolio_method: "Análise e Balanceamento" };

export function MercadoPagoLinkCheckout({ plans, currentPlanId, userName, userEmail }: { plans: Plan[]; currentPlanId?: string; userName: string; userEmail: string }) {
  const available = useMemo(() => plans.filter((plan) => plan.status === "ativo"), [plans]);
  const [planId, setPlanId] = useState(currentPlanId && available.some((plan) => plan.id === currentPlanId) ? currentPlanId : available[0]?.id ?? "");
  const [requests, setRequests] = useState<ManualSubscriptionRequest[]>([]);
  const [requestId, setRequestId] = useState("");
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const idempotencyKey = useRef("");
  const plan = available.find((item) => item.id === planId);

  const load = useCallback(async () => {
    const response = await fetch("/api/subscription-requests", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Não foi possível carregar as solicitações.");
    setRequests(body.requests || []);
  }, []);
  useEffect(() => { void load().catch((reason) => setError(reason.message)); }, [load]);
  useEffect(() => { setOpened(false); setRequestId(""); idempotencyKey.current = ""; }, [planId]);

  async function createRequest() {
    if (!plan) throw new Error("Selecione um plano.");
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    const response = await fetch("/api/subscription-requests", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey.current }, body: JSON.stringify({ planId: plan.id }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Não foi possível registrar a solicitação.");
    setRequestId(body.request.id);
    setRequests((current) => [body.request, ...current.filter((item) => item.id !== body.request.id)]);
    return body.request as ManualSubscriptionRequest;
  }

  function openPayment(event: MouseEvent<HTMLAnchorElement>) {
    if (opened || loading) { event.preventDefault(); return; }
    setOpened(true); setLoading(true); setError(""); setMessage("Registrando solicitação para conferência manual...");
    void createRequest().then(() => setMessage("Solicitação registrada como Aguardando confirmação.")).catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }

  async function reportPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const currentRequest = requestId ? requests.find((item) => item.id === requestId) : await createRequest();
      if (!currentRequest) throw new Error("Solicitação não encontrada.");
      const response = await fetch(`/api/subscription-requests/${currentRequest.id}/report`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: String(form.get("fullName") || ""), email: String(form.get("email") || ""), planId, approximatePaymentDate: String(form.get("paymentDate") || ""), transactionId: String(form.get("transactionId") || ""), note: String(form.get("note") || "") }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível enviar a informação.");
      setMessage(body.message); setShowReport(false); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível enviar a informação."); }
    finally { setLoading(false); }
  }

  if (!plan) return <p className="rounded-2xl bg-amber-500/10 p-4 text-sm font-semibold text-amber-700 dark:text-amber-200">Nenhum plano ativo está disponível.</p>;
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">{available.map((item) => <button key={item.id} type="button" onClick={() => setPlanId(item.id)} className={`min-h-28 rounded-2xl border p-4 text-left transition ${item.id === planId ? "border-cyan-500 bg-cyan-500/10" : "border-slate-200 bg-white hover:border-cyan-300 dark:border-white/10 dark:bg-white/5"}`}><span className="block text-sm font-black">{item.name}</span><strong className="mt-2 block text-2xl">{brl.format(item.value)}</strong><span className="text-xs text-slate-500 dark:text-slate-300">{item.durationDays} dias</span></button>)}</div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
      <div className="flex items-start gap-3"><WalletCards className="mt-1 h-6 w-6 text-cyan-500" /><div><h4 className="text-lg font-black">Resumo da contratação</h4><p className="text-sm text-slate-500 dark:text-slate-300">Plano {plan.name}, {plan.durationDays} dias, valor oficial de {brl.format(plan.value)}.</p></div></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{plan.permissions.filter((item) => benefitLabels[item]).slice(0, 8).map((permission) => <span key={permission} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm dark:bg-white/5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{benefitLabels[permission]}</span>)}</div>
      <p className="mt-4 rounded-2xl bg-blue-500/10 p-4 text-sm text-blue-800 dark:text-blue-200"><ShieldCheck className="mr-2 inline h-5 w-5" />O pagamento será realizado no ambiente seguro do Mercado Pago. Após a confirmação do pagamento, sua assinatura será analisada e ativada pelo administrador.</p>
      <a href={MERCADO_PAGO_PAYMENT_LINK} target="_blank" rel="noopener noreferrer" onClick={openPayment} aria-disabled={opened || loading} className={`mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#009ee3] px-5 py-3 font-black text-white shadow-sm transition hover:bg-[#008ac6] focus:outline-none focus:ring-4 focus:ring-cyan-300 dark:focus:ring-cyan-800 ${(opened || loading) ? "pointer-events-none opacity-70" : ""}`}>{loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ExternalLink className="h-5 w-5" />}Pagar com Mercado Pago</a>
      <button type="button" onClick={() => setShowReport((value) => !value)} className="mt-3 min-h-11 w-full rounded-2xl border border-cyan-500 px-4 py-3 text-sm font-black text-cyan-700 dark:text-cyan-300">Já realizei o pagamento</button>
    </div>
    {showReport && <form onSubmit={reportPayment} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950 sm:grid-cols-2"><h4 className="sm:col-span-2 text-lg font-black">Informar pagamento realizado</h4><Field name="fullName" label="Nome completo" defaultValue={userName} required /><Field name="email" type="email" label="E-mail da conta" defaultValue={userEmail} required /><label className="text-sm font-bold">Plano escolhido<input readOnly value={plan.name} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 dark:border-white/10 dark:bg-white/5" /></label><Field name="paymentDate" type="date" label="Data aproximada do pagamento" defaultValue={new Date().toISOString().slice(0, 10)} required /><Field name="transactionId" label="Identificação da transação (opcional)" /><label className="text-sm font-bold sm:col-span-2">Observação opcional<textarea name="note" maxLength={500} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950" /></label><button disabled={loading} className="sm:col-span-2 min-h-11 rounded-2xl bg-cyan-500 px-4 py-3 font-black text-white disabled:opacity-60">Enviar para verificação</button></form>}
    {message && <p className="rounded-2xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{message}</p>}{error && <p className="rounded-2xl bg-red-500/10 p-4 text-sm font-semibold text-red-700 dark:text-red-200">{error}</p>}
    {requests.length > 0 && <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950"><h4 className="font-black">Minhas solicitações</h4><div className="mt-3 space-y-2">{requests.slice(0, 6).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5"><span><strong>{item.planName}</strong><small className="block text-slate-500 dark:text-slate-300">{new Date(item.requestedAt).toLocaleString("pt-BR")}</small></span><span className="inline-flex items-center gap-1 font-bold"><Clock3 className="h-4 w-4" />{subscriptionStatusLabels[item.status]}</span></div>)}</div></div>}
  </div>;
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="text-sm font-bold">{label}<input {...props} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white" /></label>; }
