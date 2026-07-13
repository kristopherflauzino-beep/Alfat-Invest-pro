"use client";

import { AlertTriangle, Calculator } from "lucide-react";
import { GrahamScenarioTable } from "@/components/valuation/GrahamScenarioTable";
import type { GrahamScenario } from "@/lib/valuation/graham";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percent = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtPct(value: number | null) {
  return value === null ? "-" : `${value >= 0 ? "+" : ""}${percent.format(value)}%`;
}

export function GrahamGrowthCard({
  price,
  lpa,
  growth,
  y,
  value,
  potential,
  safetyMargin,
  sourceLabel,
  updatedAt,
  scenarios,
  warning,
  canEdit,
  onGrowthChange,
  onYChange
}: {
  price?: number;
  lpa?: number;
  growth: number;
  y: number;
  value: number | null;
  potential: number | null;
  safetyMargin: number | null;
  sourceLabel: string;
  updatedAt?: string;
  scenarios: GrahamScenario[];
  warning?: string;
  canEdit: boolean;
  onGrowthChange: (value: number) => void;
  onYChange: (value: number) => void;
}) {
  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/80">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-500">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">Graham com crescimento</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Simulação sensível às premissas de crescimento e rendimento Y.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><p className="text-xs text-slate-500 dark:text-slate-400">Preço atual</p><p className="mt-1 font-black">{price ? money.format(price) : "-"}</p></div>
        <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><p className="text-xs text-slate-500 dark:text-slate-400">LPA</p><p className="mt-1 font-black">{lpa ? money.format(lpa) : "-"}</p></div>
        <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><p className="text-xs text-slate-500 dark:text-slate-400">Parâmetro 8,5</p><p className="mt-1 font-black">Empresa sem crescimento</p></div>
        <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><p className="text-xs text-slate-500 dark:text-slate-400">Parâmetro 4,4</p><p className="mt-1 font-black">Referência histórica</p></div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Crescimento esperado (%)</span>
          <input disabled={!canEdit} type="number" step="0.1" min="0" value={growth} onChange={(event) => onGrowthChange(Number(event.target.value))} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none dark:border-white/10 dark:bg-white/5" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Rendimento Y (%)</span>
          <input disabled={!canEdit} type="number" step="0.1" min="0" value={y} onChange={(event) => onYChange(Number(event.target.value))} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none dark:border-white/10 dark:bg-white/5" />
        </label>
      </div>

      {warning && (
        <div className="mt-4 flex gap-2 rounded-2xl bg-amber-500/10 p-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {warning}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><p className="text-xs text-slate-500 dark:text-slate-400">Valor intrínseco</p><p className="mt-1 font-black">{value === null ? "-" : money.format(value)}</p></div>
        <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><p className="text-xs text-slate-500 dark:text-slate-400">Potencial</p><p className="mt-1 font-black">{fmtPct(potential)}</p></div>
        <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><p className="text-xs text-slate-500 dark:text-slate-400">Margem</p><p className="mt-1 font-black">{fmtPct(safetyMargin)}</p></div>
      </div>

      <p className="mt-4 rounded-2xl bg-cyan-500/10 p-3 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
        Resultado com parâmetros informados/configurados. Fonte: {sourceLabel}. Atualização: {updatedAt ? new Date(updatedAt).toLocaleString("pt-BR") : "-"}.
      </p>

      <div className="mt-4">
        <GrahamScenarioTable scenarios={scenarios} />
      </div>
    </div>
  );
}
