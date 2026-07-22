"use client";

import { DatabaseZap, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type HealthItem = { key: string; ticker: string; source: string; status: string; confidence: string; price?: number; currency?: string; updatedAt: string; expiresAt: string };
type HealthResponse = { items: HealthItem[]; summary: { monitored: number; valid: number; attention: number; insufficient: number } };
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function MarketDataHealthPanel() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [ticker, setTicker] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() { const response = await fetch("/api/admin/market-data/health", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setData(body); }
  useEffect(() => { void load().catch((reason) => setError(reason.message)); }, []);
  async function action(name: "revalidate" | "clear_cache") {
    setBusy(true); setError("");
    try { const response = await fetch("/api/admin/market-data/health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, ticker: ticker.trim() || undefined }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Ação não concluída."); }
    finally { setBusy(false); }
  }
  return <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f172a]"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><DatabaseZap className="h-5 w-5 text-cyan-500" /><h3 className="font-black">Saúde dos dados de mercado</h3></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Últimos preços válidos persistidos, fonte, validade e confiança.</p></div><button type="button" onClick={() => void load()} className="rounded-md bg-slate-100 p-3 dark:bg-white/10" aria-label="Atualizar painel"><RefreshCw className="h-4 w-4" /></button></div>
    {data && <div className="mt-4 grid gap-3 sm:grid-cols-4">{[["Monitorados",data.summary.monitored],["Válidos",data.summary.valid],["Atenção",data.summary.attention],["Insuficientes",data.summary.insufficient]].map(([label,value]) => <div key={label} className="rounded-md bg-slate-50 p-3 dark:bg-white/5"><small>{label}</small><strong className="block text-xl">{value}</strong></div>)}</div>}
    <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase())} placeholder="Ticker, por exemplo GARE11" className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 dark:border-white/10 dark:bg-[#020817]" /><button disabled={busy || !ticker.trim()} onClick={() => void action("revalidate")} className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 font-bold text-white disabled:opacity-50"><RefreshCw className="h-4 w-4" />Revalidar</button><button disabled={busy} onClick={() => void action("clear_cache")} className="inline-flex items-center justify-center gap-2 rounded-md bg-red-500/10 px-4 font-bold text-red-700 dark:text-red-300"><Trash2 className="h-4 w-4" />Limpar cache</button></div>
    {error && <p className="mt-3 rounded-md bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">{error}</p>}
    <div className="mt-4 max-h-80 overflow-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="text-left text-slate-500"><th className="p-2">Ticker</th><th className="p-2">Preço</th><th className="p-2">Fonte</th><th className="p-2">Estado</th><th className="p-2">Confiança</th><th className="p-2">Atualização</th></tr></thead><tbody>{data?.items.map((item) => <tr key={item.key} className="border-t border-slate-100 dark:border-white/10"><td className="p-2 font-black">{item.ticker}</td><td className="p-2">{item.price === undefined ? "Indisponível" : brl.format(item.price)}</td><td className="p-2">{item.source}</td><td className="p-2">{item.status}</td><td className="p-2">{item.confidence}</td><td className="p-2">{new Date(item.updatedAt).toLocaleString("pt-BR")}</td></tr>)}</tbody></table>{data && !data.items.length && <p className="p-3 text-sm text-slate-500">O cache será preenchido à medida que os ativos forem consultados.</p>}</div>
  </div>;
}
