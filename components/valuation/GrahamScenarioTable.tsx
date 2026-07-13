"use client";

import type { GrahamScenario } from "@/lib/valuation/graham";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percent = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function pct(value: number | null) {
  return value === null ? "-" : `${value >= 0 ? "+" : ""}${percent.format(value)}%`;
}

export function GrahamScenarioTable({ scenarios }: { scenarios: GrahamScenario[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600 dark:bg-white/5 dark:text-slate-300">
          <tr>
            <th className="p-3">Cenário</th>
            <th className="p-3">g</th>
            <th className="p-3">Y</th>
            <th className="p-3">Valor intrínseco</th>
            <th className="p-3">Potencial</th>
            <th className="p-3">Margem</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((scenario) => (
            <tr key={scenario.label} className="border-t border-slate-100 dark:border-white/10">
              <td className="p-3 font-black">{scenario.label}</td>
              <td className="p-3">{percent.format(scenario.growth)}%</td>
              <td className="p-3">{percent.format(scenario.y)}%</td>
              <td className="p-3 font-black">{scenario.value === null ? "-" : money.format(scenario.value)}</td>
              <td className="p-3">{pct(scenario.potential)}</td>
              <td className="p-3">{pct(scenario.safetyMargin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
