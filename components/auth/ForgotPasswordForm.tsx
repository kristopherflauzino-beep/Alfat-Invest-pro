"use client";

import Link from "next/link";
import { Mail, Send } from "lucide-react";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password-reset/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível concluir a solicitação.");
      setMessage(body.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a solicitação.");
    } finally {
      setLoading(false);
    }
  }
  if (message) return <div className="space-y-4"><div className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-200"><strong className="block text-base">Verifique seu e-mail</strong><span className="mt-2 block">{message}</span><span className="mt-2 block">Confira também a pasta de spam.</span></div><Link href="/" className="flex min-h-11 items-center justify-center rounded-2xl bg-cyan-500 px-4 font-black text-white">Voltar ao login</Link></div>;
  return <form onSubmit={submit} className="space-y-4"><label className="block text-sm font-bold">E-mail cadastrado<div className="relative mt-2"><Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900 dark:text-white" placeholder="voce@exemplo.com" /></div></label>{error && <p className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">{error}</p>}<button disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 font-black text-white disabled:opacity-60"><Send className="h-4 w-4" />{loading ? "Enviando..." : "Enviar link de recuperação"}</button><Link href="/" className="block text-center text-sm font-bold text-cyan-600 dark:text-cyan-300">Voltar ao login</Link></form>;
}