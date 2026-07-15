"use client";

import Link from "next/link";
import { KeyRound, LoaderCircle, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { PasswordRequirements } from "./PasswordRequirements";
import { PasswordVisibilityButton } from "./PasswordVisibilityButton";

export function ResetPasswordForm({ token }: { token: string }) {
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setTokenError("Link inválido ou incompleto."); setValidating(false); return; }
    void fetch("/api/auth/password-reset/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "Link inválido."); })
      .catch((reason) => setTokenError(reason.message))
      .finally(() => setValidating(false));
  }, [token]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) { setError("As senhas informadas não são iguais."); return; }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password-reset/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword: password, confirmPassword: confirmation }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível alterar a senha.");
      setMessage(body.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  }

  if (validating) return <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />Validando link seguro...</div>;
  if (tokenError) return <div className="space-y-4"><p className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">{tokenError}</p><Link href="/esqueci-minha-senha" className="flex min-h-11 items-center justify-center rounded-2xl bg-cyan-500 px-4 font-black text-white">Solicitar novo link</Link></div>;
  if (message) return <div className="space-y-4"><div className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-200"><strong className="block text-base">Senha alterada com sucesso</strong><span className="mt-2 block">{message}</span></div><Link href="/" className="flex min-h-11 items-center justify-center rounded-2xl bg-cyan-500 px-4 font-black text-white">Entrar na plataforma</Link></div>;

  return <form onSubmit={submit} className="space-y-4"><label className="block text-sm font-bold">Nova senha<div className="relative mt-2"><KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={256} autoComplete="new-password" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900 dark:text-white" /><PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword((value) => !value)} /></div></label><label className="block text-sm font-bold">Confirmar nova senha<div className="relative mt-2"><KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input type={showConfirmation ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required maxLength={256} autoComplete="new-password" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-900 dark:text-white" /><PasswordVisibilityButton visible={showConfirmation} onToggle={() => setShowConfirmation((value) => !value)} /></div></label><PasswordRequirements password={password} confirmation={confirmation} />{error && <p className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">{error}</p>}<button disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 font-black text-white disabled:opacity-60"><Save className="h-4 w-4" />{loading ? "Salvando..." : "Salvar nova senha"}</button><Link href="/" className="block text-center text-sm font-bold text-cyan-600 dark:text-cyan-300">Cancelar e voltar ao login</Link></form>;
}