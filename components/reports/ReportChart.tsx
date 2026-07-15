import type { ReportChart as ReportChartData } from "@/lib/reports/types";

export function ReportChart({ chart }: { chart: ReportChartData }) {
  const max = Math.max(...chart.items.map((item) => Math.abs(item.value)), 1);
  return (
    <div className="mt-4 rounded-md border border-slate-200 p-3">
      <h4 className="text-xs font-black text-slate-900">{chart.title}</h4>
      <div className="mt-3 space-y-2">
        {chart.items.slice(0, 10).map((item) => (
          <div key={item.label} className="grid grid-cols-[110px_1fr_72px] items-center gap-2 text-[10px] text-slate-600">
            <span className="truncate">{item.label}</span>
            <span className="h-2 overflow-hidden rounded bg-slate-200"><span className="block h-full rounded bg-teal-500" style={{ width: `${Math.max(2, Math.abs(item.value) / max * 100)}%` }} /></span>
            <span className="text-right font-bold text-slate-800">{item.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{chart.format === "percent" ? "%" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
