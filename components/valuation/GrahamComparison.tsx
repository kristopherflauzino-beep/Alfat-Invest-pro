"use client";

import type { Asset } from "@/lib/types";
import { analisarNumeroGraham } from "@/lib/valuation/graham";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percent = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtMoney(value?: number | null) {
  return value === undefined || value === null ? "-" : money.format(value);
}

function fmtPercent(value?: number | null) {
  return value === undefined || value === null ? "-" : `${value >= 0 ? "+" : ""}${percent.format(value)}%`;
}

export function GrahamComparison({ a, b }: { a: Asset; b: Asset }) {
  const grahamA = analisarNumeroGraham(a);
  const grahamB = analisarNumeroGraham(b);
  const winner = grahamA.applicable && grahamB.applicable
    ? (grahamA.safetyMargin ?? -Infinity) >= (grahamB.safetyMargin ?? -Infinity) ? grahamA : grahamB
    : null;

  const rows = [
    ["Preço atual", fmtMoney(grahamA.price), fmtMoney(grahamB.price)],
    ["LPA", fmtMoney(grahamA.lpa), fmtMoney(grahamB.lpa)],
    ["VPA", fmtMoney(grahamA.vpa), fmtMoney(grahamB.vpa)],
    ["Valor de Graham", fmtMoney(grahamA.value), fmtMoney(grahamB.value)],
    ["Margem de segurança", fmtPercent(grahamA.safetyMargin), fmtPercent(grahamB.safetyMargin)],
    ["Potencial", fmtPercent(grahamA.potential), fmtPercent(grahamB.potential)],
    ["Classificação", grahamA.classification ?? "Não aplicável — LPA ou VPA inválido", grahamB.classification ?? "Não aplicável — LPA ou VPA inválido"]
  ];

  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-black">Número de Graham no comparador</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">A fórmula com crescimento não é usada nesta seção.</p>
        </div>
        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-700 dark:text-cyan-300">
          {winner ? `Maior margem segundo este método: ${winner.ticker}` : "Maior margem segundo este método: não aplicável"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-500 dark:text-slate-300"><tr><th className="p-3">Indicador</th><th className="p-3">{a.ticker}</th><th className="p-3">{b.ticker}</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row[0]} className="border-t border-slate-200 dark:border-white/10"><td className="p-3 text-slate-500 dark:text-slate-300">{row[0]}</td><td className="p-3 font-black">{row[1]}</td><td className="p-3 font-black">{row[2]}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Maior margem não significa automaticamente melhor investimento; o método precisa ser combinado com liquidez, qualidade, endividamento, risco e dados atualizados.</p>
    </div>
  );
}
