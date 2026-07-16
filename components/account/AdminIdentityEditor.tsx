"use client";

import { Save, UserPen } from "lucide-react";
import { useEffect, useState } from "react";
import type { AccountIdentity } from "@/components/account/ChangeNameForm";

export function AdminIdentityEditor({
  client,
  onUpdated
}: {
  client: AccountIdentity;
  onUpdated: (account: AccountIdentity) => void;
}) {
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(client.name);
    setEmail(client.email);
  }, [client.name, client.email]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users/" + encodeURIComponent(client.id) + "/identity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, reason })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível alterar o cadastro.");
      onUpdated(body.user);
      setReason("");
      setMessage(body.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar o cadastro.");
    } finally {
      setLoading(false);
    }
  }

  const field = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white";

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
      <div className="mb-3 flex items-center gap-2 font-black"><UserPen className="h-5 w-5 text-cyan-500" />Editar nome e e-mail</div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-bold">Nome<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required className={field} /></label>
        <label className="text-sm font-bold">E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required className={field} /></label>
      </div>
      <label className="mt-3 block text-sm font-bold">Motivo da alteração<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={500} required placeholder="Informe o motivo para a auditoria" className={field} /></label>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">A alteração de e-mail encerra as sessões do cliente. Senhas nunca são exibidas ou modificadas aqui.</p>
      {message && <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>}
      <button disabled={loading} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-500 px-4 font-black text-white disabled:opacity-50">
        <Save className="h-4 w-4" />{loading ? "Salvando..." : "Salvar cadastro"}
      </button>
    </form>
  );
}
