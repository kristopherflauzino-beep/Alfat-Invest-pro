"use client";

import type { StockOpportunitySort } from "@/lib/opportunities/stock-filters";

export function OpportunitySortSelector({
  value,
  onChange
}: {
  value: StockOpportunitySort;
  onChange: (value: StockOpportunitySort) => void;
}) {
  return (
    <label className="block text-sm font-bold">
      Ordenar por
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as StockOpportunitySort)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
      >
        <option value="score_desc">Maior score</option>
        <option value="price_asc">Menor preço</option>
        <option value="change_desc">Maior variação</option>
        <option value="pl_asc">Menor P/L</option>
        <option value="pvp_asc">Menor P/VP</option>
        <option value="roe_desc">Maior ROE</option>
        <option value="dy_desc">Maior Dividend Yield</option>
        <option value="margin_desc">Maior margem de segurança</option>
        <option value="potential_desc">Maior potencial Graham</option>
        <option value="liquidity_desc">Maior liquidez</option>
        <option value="risk_asc">Menor risco</option>
        <option value="confidence_desc">Maior confiança</option>
      </select>
    </label>
  );
}
