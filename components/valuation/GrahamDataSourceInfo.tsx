"use client";

import { ExternalLink } from "lucide-react";

export function GrahamDataSourceInfo({
  source,
  sourceUrl,
  priceDate,
  lpaDate,
  vpaDate
}: {
  source: string;
  sourceUrl?: string;
  priceDate?: string;
  lpaDate?: string;
  vpaDate?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
      <p className="font-black text-slate-800 dark:text-slate-100">Fonte dos dados</p>
      <p className="mt-1">{source}</p>
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-bold text-cyan-700 dark:text-cyan-300">
          Abrir fonte <ExternalLink className="h-3 w-3" />
        </a>
      )}
      <div className="mt-3 grid gap-1 sm:grid-cols-3">
        <span>Preço: {priceDate ? new Date(priceDate).toLocaleString("pt-BR") : "-"}</span>
        <span>LPA: {lpaDate ? new Date(lpaDate).toLocaleDateString("pt-BR") : "-"}</span>
        <span>VPA: {vpaDate ? new Date(vpaDate).toLocaleDateString("pt-BR") : "-"}</span>
      </div>
    </div>
  );
}
