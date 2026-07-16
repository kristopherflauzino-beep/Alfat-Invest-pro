"use client";

import { BookmarkPlus, FolderOpen, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { StockOpportunityFilterState } from "@/lib/opportunities/stock-filters";

type SavedFilter = {
  id: string;
  name: string;
  filters: StockOpportunityFilterState;
  createdAt: string;
};

export function SavedFilterSelector({
  currentFilters,
  onLoad
}: {
  currentFilters: StockOpportunityFilterState;
  onLoad: (filters: StockOpportunityFilterState) => void;
}) {
  const [items, setItems] = useState<SavedFilter[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadItems = useCallback(async () => {
    const response = await fetch("/api/opportunity-filters", { cache: "no-store" });
    if (!response.ok) return;
    const body = await response.json().catch(() => ({ items: [] }));
    setItems(Array.isArray(body.items) ? body.items : []);
  }, []);

  useEffect(() => { void loadItems(); }, [loadItems]);

  async function save() {
    if (name.trim().length < 2) {
      setMessage("Informe um nome para o filtro.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/opportunity-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, filters: currentFilters })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível salvar o filtro.");
      setName("");
      setMessage("Filtro salvo.");
      await loadItems();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o filtro.");
    } finally {
      setLoading(false);
    }
  }

  function load() {
    const selected = items.find((item) => item.id === selectedId);
    if (!selected) {
      setMessage("Selecione um filtro salvo.");
      return;
    }
    onLoad(selected.filters);
    setMessage("Filtro carregado.");
  }

  const field = "h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950 dark:text-white";

  return (
    <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/5 md:grid-cols-2">
      <div className="flex min-w-0 gap-2">
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Nome do filtro" className={field + " flex-1"} />
        <button type="button" onClick={save} disabled={loading} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-500 text-white disabled:opacity-50" title="Salvar filtro" aria-label="Salvar filtro">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex min-w-0 gap-2">
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className={field + " flex-1"}>
          <option value="">Carregar filtro salvo</option>
          {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button type="button" onClick={load} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-800 text-white dark:bg-white/10" title="Carregar filtro" aria-label="Carregar filtro"><FolderOpen className="h-4 w-4" /></button>
      </div>
      {message && <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 md:col-span-2">{message}</p>}
    </div>
  );
}
