"use client";

import { CalendarDays, CircleDollarSign } from "lucide-react";
import type { Asset } from "@/lib/types";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 8 });
const typeLabel = { dividend: "Dividendo", jcp: "JCP", fii_income: "Rendimento de FII", amortization: "Amortização", capital_return: "Restituição de capital" } as const;
const statusLabel = { announced: "Anunciado", paid: "Pago", estimated: "Estimado", cancelled: "Cancelado" } as const;

export function IncomeEventsCard({ asset, compact = false }: { asset: Asset; compact?: boolean }) {
  const events = asset.incomeEvents ?? [];
  const summary = asset.incomeSummary;
  if (asset.type === "CRIPTO") return null;
  return <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f172a]">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-cyan-500" /><h3 className="font-black">Proventos por ação ou cota</h3></div><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Valores unitários confirmados pela fonte. Ausência de data não é substituída por estimativa.</p></div>{summary && <span className="rounded-md bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-700 dark:text-cyan-200">{summary.frequency}</span>}</div>
    {summary && events.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Último valor por unidade" value={summary.latestAmountPerUnit === undefined ? "Indisponível" : brl.format(summary.latestAmountPerUnit)} /><Metric label="Total em 12 meses" value={brl.format(summary.total12Months)} /><Metric label="Média mensal por unidade" value={brl.format(summary.averageMonthly12Months)} /><Metric label="Eventos em 12 meses" value={String(summary.events12Months)} /></div>}
    {!compact && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="text-left text-slate-500 dark:text-slate-300"><th className="p-2">Data ex</th><th className="p-2">Pagamento</th><th className="p-2">Tipo</th><th className="p-2">Valor por unidade</th><th className="p-2">Status</th><th className="p-2">Fonte</th></tr></thead><tbody>{events.slice(0, 18).map((event) => <tr key={event.id} className="border-t border-slate-100 dark:border-white/10"><td className="p-2">{formatDate(event.exDate)}</td><td className="p-2">{formatDate(event.paymentDate)}</td><td className="p-2 font-semibold">{typeLabel[event.type]}</td><td className="p-2 font-black">{brl.format(event.amountPerUnit)}</td><td className="p-2">{statusLabel[event.status]}</td><td className="p-2"><a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-700 underline dark:text-cyan-300">{event.source}</a></td></tr>)}</tbody></table>{!events.length && <p className="p-4 text-sm text-slate-500 dark:text-slate-300">Histórico de proventos indisponível na fonte consultada.</p>}</div>}
    {summary?.latestPaymentDate && <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300"><CalendarDays className="h-4 w-4" />Último evento em {formatDate(summary.latestPaymentDate)} • atualizado em {new Date(summary.updatedAt).toLocaleString("pt-BR")}.</p>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-slate-50 p-3 dark:bg-white/5"><small className="text-slate-500 dark:text-slate-300">{label}</small><strong className="mt-1 block">{value}</strong></div>;
}
function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "Dado indisponível";
}
