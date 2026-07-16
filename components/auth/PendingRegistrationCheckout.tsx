"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, ExternalLink, LoaderCircle, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MERCADO_PAGO_PAYMENT_LINK } from "@/lib/subscriptions/manual-subscription";

type Registration = {
  id: string;
  name: string;
  emailMasked: string;
  planName: string;
  planPriceInCents: number;
  durationDays: number;
  status: string;
  expiresAt: string;
  paymentLinkOpenedAt?: string;
  paymentReportedAt?: string;
  activatedAt?: string;
};

const statusLabels: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  payment_under_review: "Pagamento em análise",
  paid: "Pagamento confirmado",
  activated: "Conta ativada",
  rejected: "Pagamento recusado",
  cancelled: "Cadastro cancelado",
  expired: "Cadastro expirado"
};
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PendingRegistrationCheckout({ token }: { token: string }) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showReport, setShowReport] = useState(false);

  const load = useCallback(async () => {
    if (!token) throw new Error("Link de continuação inválido.");
    const response = await fetch("/api/auth/register/status?token=" + encodeURIComponent(token), { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Não foi possível consultar o cadastro.");
    setRegistration(body.registration);
  }, [token]);

  useEffect(() => {
    void load().catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }, [load]);

  function recordPaymentLinkOpen() {
    if (sending) return;
    setSending(true);
    void fetch("/api/auth/register/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open", continuationToken: token }),
      keepalive: true
    }).then(() => load()).catch(() => undefined).finally(() => setSending(false));
  }

  async function reportPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/register/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report",
          continuationToken: token,
          paymentName: String(form.get("paymentName") || ""),
          approximatePaymentDate: String(form.get("paymentDate") || ""),
          transactionId: String(form.get("transactionId") || "") || undefined,
          customerNote: String(form.get("customerNote") || "") || undefined
        })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível registrar a solicitação.");
      setMessage(body.message);
      setShowReport(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registrar a solicitação.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="flex items-center gap-2 text-sm"><LoaderCircle className="h-5 w-5 animate-spin" />Carregando cadastro...</div>;
  if (error && !registration) return <div className="space-y-4"><p className="rounded-2xl bg-red-500/10 p-4 text-sm font-semibold text-red-800 dark:text-red-200">{error}</p><Link href="/" className="block text-center font-bold text-cyan-600 dark:text-cyan-300">Voltar ao início</Link></div>;
  if (!registration) return null;

  const closed = ["rejected", "cancelled", "expired"].includes(registration.status);
  const activated = registration.status === "activated";
  return <div className="space-y-5">
    <ol className="grid grid-cols-5 gap-1 text-center text-[9px] font-black sm:text-xs">
      {["Dados", "Plano", "E-mail", "Pagamento", "Ativação"].map((stage, index) => <li key={stage} className={"min-w-0 rounded-xl px-1 py-2 " + (index <= (activated ? 4 : 3) ? "bg-cyan-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300")}><span className="block">{index + 1}</span><span className="block break-words">{stage}</span></li>)}
    </ol>
    <div className="rounded-3xl border border-slate-200 p-5 dark:border-white/10">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Resumo da contratação</p><h2 className="mt-1 text-xl font-black">{registration.planName}</h2><p className="text-sm text-slate-500 dark:text-slate-300">{registration.durationDays} dias · {registration.emailMasked}</p></div><strong className="text-2xl">{brl.format(registration.planPriceInCents / 100)}</strong></div>
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-100 p-3 text-sm font-bold dark:bg-white/5"><Clock3 className="h-5 w-5 text-cyan-500" />{statusLabels[registration.status] || registration.status}</div>
    </div>

    {activated ? <div className="rounded-2xl bg-emerald-500/10 p-5 text-emerald-800 dark:text-emerald-200"><CheckCircle2 className="mb-2 h-7 w-7" /><strong className="block text-lg">Conta ativada com sucesso</strong><p className="mt-2 text-sm">Seu pagamento foi confirmado e sua conta está pronta para uso.</p><Link href="/" className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 font-black text-white">Entrar na plataforma</Link></div> : null}

    {!activated && !closed && <div className="rounded-3xl border border-slate-200 p-5 dark:border-white/10">
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300"><ShieldCheck className="mr-2 inline h-5 w-5 text-cyan-500" />O pagamento será realizado no ambiente seguro do Mercado Pago. Após a confirmação, sua assinatura será analisada e ativada pelo administrador.</p>
      <a href={MERCADO_PAGO_PAYMENT_LINK} target="_blank" rel="noopener noreferrer" onClick={recordPaymentLinkOpen} aria-label="Pagar com Mercado Pago em nova aba" className={"mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#009ee3] px-5 font-black text-white hover:bg-[#008ac6] " + (sending ? "pointer-events-none opacity-60" : "")}><ExternalLink className="h-5 w-5" />Pagar com Mercado Pago</a>
      <button type="button" onClick={() => setShowReport(true)} className="mt-3 min-h-11 w-full rounded-2xl border border-cyan-500 px-4 font-black text-cyan-700 dark:text-cyan-200">Já realizei o pagamento</button>
    </div>}

    {showReport && !closed && !activated && <form onSubmit={reportPayment} className="grid gap-3 rounded-3xl border border-slate-200 p-5 dark:border-white/10 sm:grid-cols-2">
      <div className="sm:col-span-2"><h3 className="font-black">Solicitar verificação</h3><p className="text-xs text-slate-500 dark:text-slate-300">O envio não ativa a conta automaticamente.</p></div>
      <Field name="paymentName" label="Nome completo" defaultValue={registration.name} required />
      <Field name="paymentDate" type="date" label="Data aproximada" defaultValue={new Date().toISOString().slice(0, 10)} required />
      <Field name="transactionId" label="Identificação da transação (opcional)" />
      <label className="text-xs font-bold sm:col-span-2">Observação opcional<textarea name="customerNote" maxLength={500} className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white" /></label>
      <button disabled={sending} className="min-h-11 rounded-xl bg-cyan-500 px-4 font-black text-white disabled:opacity-50 sm:col-span-2">{sending ? "Enviando..." : "Enviar para análise"}</button>
    </form>}
    {message && <p className="rounded-2xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-200">{message}</p>}
    {error && registration && <p className="rounded-2xl bg-red-500/10 p-4 text-sm font-semibold text-red-800 dark:text-red-200">{error}</p>}
    <button type="button" onClick={() => void load()} className="min-h-11 w-full rounded-xl bg-slate-100 px-4 font-black text-slate-700 dark:bg-white/10 dark:text-white">Atualizar status</button>
  </div>;
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="text-xs font-bold">{label}<input {...props} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white" /></label>;
}
