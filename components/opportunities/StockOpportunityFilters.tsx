"use client";

import { Filter, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { OpportunitySortSelector } from "./OpportunitySortSelector";
import { SavedFilterSelector } from "./SavedFilterSelector";
import {
  activeStockFilters,
  clearStockFilter,
  defaultStockOpportunityFilters,
  type StockOpportunityFilterState
} from "@/lib/opportunities/stock-filters";

function NumericField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}

export function StockOpportunityFilters({
  value,
  onChange,
  sectors,
  segments,
  resultCount
}: {
  value: StockOpportunityFilterState;
  onChange: (value: StockOpportunityFilterState) => void;
  sectors: string[];
  segments: string[];
  resultCount: number;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const set = <K extends keyof StockOpportunityFilterState>(key: K, next: StockOpportunityFilterState[K]) => {
    setDraft((current) => ({ ...current, [key]: next }));
  };
  const checkboxes: Array<{ key: keyof StockOpportunityFilterState; label: string }> = [
    { key: "onlyPositiveLpa", label: "Somente LPA positivo" },
    { key: "onlyPositiveVpa", label: "Somente VPA positivo" },
    { key: "onlyBelowGraham", label: "Preço abaixo do Número de Graham" },
    { key: "onlyUpdated", label: "Somente dados atualizados" },
    { key: "onlyFavorites", label: "Somente favoritos" }
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <NumericField label="Score mínimo" value={draft.minScore} onChange={(next) => set("minScore", next)} />
        <label className="text-sm font-bold">Setor<select value={draft.sector} onChange={(event) => set("sector", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white"><option value="">Todos</option>{sectors.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="text-sm font-bold">Segmento<select value={draft.segment} onChange={(event) => set("segment", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white"><option value="">Todos</option>{segments.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <NumericField label="Preço mínimo" value={draft.minPrice} onChange={(next) => set("minPrice", next)} />
        <NumericField label="Preço máximo" value={draft.maxPrice} onChange={(next) => set("maxPrice", next)} />
        <NumericField label="P/L máximo" value={draft.maxPl} onChange={(next) => set("maxPl", next)} />
        <NumericField label="P/VP máximo" value={draft.maxPvp} onChange={(next) => set("maxPvp", next)} />
        <NumericField label="ROE mínimo (%)" value={draft.minRoe} onChange={(next) => set("minRoe", next)} />
        <NumericField label="Dividend Yield mínimo (%)" value={draft.minDividendYield} onChange={(next) => set("minDividendYield", next)} />
        <NumericField label="Liquidez mínima" value={draft.minLiquidity} onChange={(next) => set("minLiquidity", next)} />
        <NumericField label="Margem de segurança mínima (%)" value={draft.minSafetyMargin} onChange={(next) => set("minSafetyMargin", next)} />
        <NumericField label="Potencial Graham mínimo (%)" value={draft.minGrahamPotential} onChange={(next) => set("minGrahamPotential", next)} />
        <NumericField label="Dívida líquida/EBITDA máxima" value={draft.maxNetDebtEbitda} onChange={(next) => set("maxNetDebtEbitda", next)} />
        <NumericField label="Crescimento mínimo (%)" value={draft.minGrowth} onChange={(next) => set("minGrowth", next)} />
        <NumericField label="Volatilidade máxima (%)" value={draft.maxVolatility} onChange={(next) => set("maxVolatility", next)} />
        <label className="text-sm font-bold">Confiança mínima<select value={draft.minimumConfidence} onChange={(event) => set("minimumConfidence", event.target.value as StockOpportunityFilterState["minimumConfidence"])} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white"><option value="Insuficiente">Sem limite</option><option value="Baixa">Baixa</option><option value="Media">Média</option><option value="Alta">Alta</option></select></label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {checkboxes.map((item) => (
          <label key={item.key} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-semibold dark:bg-white/5">
            <input type="checkbox" checked={Boolean(draft[item.key])} onChange={(event) => set(item.key, event.target.checked as never)} className="h-4 w-4 accent-cyan-500" />
            {item.label}
          </label>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
        <OpportunitySortSelector value={draft.sortBy} onChange={(sortBy) => { const next = { ...draft, sortBy }; setDraft(next); onChange(next); }} />
        <button type="button" onClick={() => onChange(draft)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 font-black text-white"><Filter className="h-4 w-4" />Aplicar filtros</button>
        <button type="button" onClick={() => { setDraft(defaultStockOpportunityFilters); onChange(defaultStockOpportunityFilters); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 font-black text-slate-700 dark:bg-white/10 dark:text-white"><RotateCcw className="h-4 w-4" />Limpar filtros</button>
      </div>
      <p className="text-sm font-black text-cyan-700 dark:text-cyan-300">{resultCount} oportunidades encontradas</p>
      <ActiveFilterChips filters={activeStockFilters(value)} onRemove={(key) => onChange(clearStockFilter(value, key))} />
      <SavedFilterSelector currentFilters={value} onLoad={(filters) => { setDraft(filters); onChange(filters); }} />
      <p className="text-xs text-slate-500 dark:text-slate-400">Campos com valor zero não aplicam limite. O cálculo Graham usa somente o Número de Graham; dados ausentes não são substituídos por zero.</p>
    </div>
  );
}
