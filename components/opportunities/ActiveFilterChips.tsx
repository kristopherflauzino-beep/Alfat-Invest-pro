"use client";

import { X } from "lucide-react";
import type { ActiveStockFilter, StockOpportunityFilterState } from "@/lib/opportunities/stock-filters";

export function ActiveFilterChips({
  filters,
  onRemove
}: {
  filters: ActiveStockFilter[];
  onRemove: (key: keyof StockOpportunityFilterState) => void;
}) {
  if (!filters.length) return <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum filtro ativo.</p>;
  return (
    <div>
      <p className="mb-2 text-sm font-black">Filtros ativos: {filters.length}</p>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => onRemove(filter.key)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 text-xs font-bold text-cyan-800 hover:bg-cyan-500/20 dark:text-cyan-200"
            title={"Remover filtro " + filter.label}
          >
            {filter.label}<X className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
