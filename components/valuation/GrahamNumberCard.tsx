"use client";

import { AlertTriangle, BadgeCheck } from "lucide-react";
import { GrahamConfidenceBadge } from "@/components/valuation/GrahamConfidenceBadge";
import { GrahamDataSourceInfo } from "@/components/valuation/GrahamDataSourceInfo";
import type { GrahamAnalysis } from "@/lib/valuation/graham";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percent = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatMoney(value?: number | null) {
  return value === undefined || value === null ? "-" : money.format(value);
}

function formatPercent(value?: number | null) {
  return value === undefined || value === null ? "-" : `${value >= 0 ? "+" : ""}${percent.format(value)}%`;
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  );
}

export function GrahamNumberCard({ analysis }: { analysis: GrahamAnalysis }) {
  const Icon = analysis.applicable ? BadgeCheck : AlertTriangle;

  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/80">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-500">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">Número de Graham</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Preço máximo estimado por LPA e VPA.</p>
        </div>
      </div>

      {!analysis.applicable && (
        <div className="rounded-2xl bg-amber-500/10 p-4 text-sm font-semibold text-amber-700 dark:text-amber-300">
          {analysis.reason ?? "Dados insuficientes para calcular o Número de Graham."}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Tile label="Preço atual" value={formatMoney(analysis.price)} />
        <Tile label="LPA" value={formatMoney(analysis.lpa)} />
        <Tile label="VPA" value={formatMoney(analysis.vpa)} />
        <Tile label="Valor de Graham" value={formatMoney(analysis.value)} />
        <Tile label="Diferença" value={formatMoney(analysis.difference)} />
        <Tile label="Potencial Graham" value={formatPercent(analysis.potential)} />
        <Tile label="Margem de segurança" value={formatPercent(analysis.safetyMargin)} />
        <Tile label="Situação" value={analysis.classification ?? "Não aplicável"} />
        <Tile label="Ticker" value={analysis.ticker} />
      </div>

      <div className="mt-4 grid gap-3">
        <GrahamConfidenceBadge confidence={analysis.confidence} reason={analysis.confidenceReason} />
        <GrahamDataSourceInfo source={analysis.source} sourceUrl={analysis.sourceUrl} priceDate={analysis.priceDate} lpaDate={analysis.lpaDate} vpaDate={analysis.vpaDate} />
      </div>
    </div>
  );
}
