"use client";

import Link from "next/link";
import { CheckCircle2, LoaderCircle, MailCheck } from "lucide-react";
import { useState } from "react";

export function EmailChangeConfirmation({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(token ? "" : "Link inválido ou incompleto.");

  async function confirm() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/account/email-change/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível confirmar o novo e-mail.");
      setMessage(body.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível confirmar o novo e-mail.");
    } finally {
      setLoading(false);
    }
  }

  if (message) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-200">
          <CheckCircle2 className="mb-2 h-7 w-7" />
          <strong className="block text-base">Novo e-mail confirmado</strong>
          <span className="mt-2 block text-sm">{message}</span>
        </div>
        <Link href="/" className="flex min-h-12 items-center justify-center rounded-2xl bg-cyan-500 px-4 font-black text-white">
          Entrar novamente
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        Confirme a alteração para vincular o novo endereço à sua conta. Este link é de uso único.
      </p>
      {error && <p className="rounded-2xl bg-red-500/10 p-4 text-sm font-semibold text-red-700 dark:text-red-200">{error}</p>}
      <button
        type="button"
        onClick={confirm}
        disabled={loading || !token}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 font-black text-white disabled:opacity-50"
      >
        {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <MailCheck className="h-5 w-5" />}
        {loading ? "Confirmando..." : "Confirmar novo e-mail"}
      </button>
      <Link href="/" className="block text-center text-sm font-bold text-cyan-600 dark:text-cyan-300">
        Voltar ao login
      </Link>
    </div>
  );
}
