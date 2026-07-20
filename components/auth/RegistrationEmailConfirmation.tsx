"use client";

import Link from "next/link";
import { CheckCircle2, LoaderCircle, MailCheck } from "lucide-react";
import { useState } from "react";

export function RegistrationEmailConfirmation({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [continuationUrl, setContinuationUrl] = useState("");
  const [activated, setActivated] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(token ? "" : "Link inválido ou incompleto.");

  async function confirm() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/email-verification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível confirmar o e-mail.");
      setMessage(body.message);
      setActivated(Boolean(body.activated));
      setContinuationUrl(body.continuationUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível confirmar o e-mail.");
    } finally {
      setLoading(false);
    }
  }

  if (activated) {
    return <div className="space-y-4">
      <div className="rounded-2xl bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-200">
        <CheckCircle2 className="mb-2 h-7 w-7" />
        <strong className="block">Conta gratuita ativada</strong>
        <span className="mt-2 block text-sm">{message}</span>
      </div>
      <Link href="/" className="flex min-h-12 items-center justify-center rounded-2xl bg-emerald-500 px-4 font-black text-white">Entrar na plataforma</Link>
    </div>;
  }

  if (continuationUrl) {
    return <div className="space-y-4">
      <div className="rounded-2xl bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-200">
        <CheckCircle2 className="mb-2 h-7 w-7" />
        <strong className="block">E-mail confirmado</strong>
        <span className="mt-2 block text-sm">{message}</span>
      </div>
      <Link href={continuationUrl} className="flex min-h-12 items-center justify-center rounded-2xl bg-cyan-500 px-4 font-black text-white">Continuar para o pagamento</Link>
    </div>;
  }

  return <div className="space-y-4">
    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Confirme o endereço para concluir a etapa de e-mail. Contas gratuitas são liberadas após a confirmação; planos pagos seguem para a etapa de pagamento.</p>
    {error && <p className="rounded-2xl bg-red-500/10 p-4 text-sm font-semibold text-red-800 dark:text-red-200">{error}</p>}
    <button type="button" onClick={confirm} disabled={loading || !token} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 font-black text-white disabled:opacity-50">
      {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <MailCheck className="h-5 w-5" />}
      {loading ? "Confirmando..." : "Confirmar meu e-mail"}
    </button>
    <Link href="/" className="block text-center text-sm font-bold text-cyan-600 dark:text-cyan-300">Voltar ao login</Link>
  </div>;
}
