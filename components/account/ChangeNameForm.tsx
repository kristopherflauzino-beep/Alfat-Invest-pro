"use client";

import { Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

export type AccountIdentity = {
  id: string;
  name: string;
  email: string;
  nameChangeCount?: number;
};

export function ChangeNameForm({
  account,
  onUpdated
}: {
  account: AccountIdentity;
  onUpdated: (account: AccountIdentity) => void;
}) {
  const [name, setName] = useState(account.name);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setName(account.name), [account.name]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const nextName = name.trim();
    if (nextName.length < 2 || nextName.length > 120) {
      setError("O nome deve possuir entre 2 e 120 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/account/name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível alterar o nome.");
      onUpdated(body.user);
      setMessage(body.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível alterar o nome.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
        <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Nome atual</span>
        <p className="mt-1 font-black">{account.name}</p>
      </div>
      <label className="text-sm font-bold">
        Novo nome
        <div className="relative mt-2">
          <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={120}
            autoComplete="name"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </label>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Alterações realizadas: {account.nameChangeCount || 0}. Clientes podem fazer até 3 alterações em 30 dias.
      </p>
      {message && <p className="rounded-2xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p className="rounded-2xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>}
      <button disabled={loading || name.trim() === account.name} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
        <Save className="h-4 w-4" />
        {loading ? "Salvando..." : "Salvar alteração"}
      </button>
    </form>
  );
}
