"use client";

import { AtSign, KeyRound, MailCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { PasswordVisibilityButton } from "@/components/auth/PasswordVisibilityButton";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const mismatch = useMemo(
    () => Boolean(newEmail && confirmEmail && newEmail.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()),
    [newEmail, confirmEmail]
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (mismatch) {
      setError("Os e-mails informados não são iguais.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/account/email-change/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, confirmEmail, currentPassword })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível solicitar a alteração.");
      setMessage(body.message);
      setNewEmail("");
      setConfirmEmail("");
      setCurrentPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível solicitar a alteração.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white";

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="text-sm font-bold">
        E-mail atual
        <div className="relative">
          <AtSign className="absolute left-4 top-1/2 mt-1 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input value={currentEmail} readOnly className={inputClass + " cursor-not-allowed bg-slate-100 pl-12 dark:bg-slate-900"} />
        </div>
      </label>
      <label className="text-sm font-bold">
        Novo e-mail
        <input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required maxLength={254} autoComplete="email" className={inputClass} />
      </label>
      <label className="text-sm font-bold">
        Confirmar novo e-mail
        <input type="email" value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} required maxLength={254} className={inputClass} />
      </label>
      {mismatch && <p className="text-sm font-semibold text-red-600 dark:text-red-300">Os e-mails informados não são iguais.</p>}
      <label className="text-sm font-bold">
        Senha atual
        <div className="relative">
          <KeyRound className="absolute left-4 top-1/2 mt-1 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type={showPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            maxLength={256}
            autoComplete="current-password"
            className={inputClass + " pl-12 pr-12"}
          />
          <PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
        </div>
      </label>
      <p className="rounded-2xl bg-cyan-500/10 p-3 text-xs text-cyan-800 dark:text-cyan-200">
        O e-mail só será alterado depois que você abrir o link enviado ao novo endereço. O link expira em 30 minutos.
      </p>
      {message && <p className="rounded-2xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p className="rounded-2xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>}
      <button disabled={loading || mismatch} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
        <MailCheck className="h-4 w-4" />
        {loading ? "Enviando..." : "Enviar confirmação"}
      </button>
    </form>
  );
}
