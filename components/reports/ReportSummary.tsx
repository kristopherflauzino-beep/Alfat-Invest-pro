import { formatReportCell, type ReportMetric } from "@/lib/reports/types";

export function ReportSummary({ metrics }: { metrics: ReportMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase text-slate-500">{metric.label}</p>
          <p className="mt-1 text-sm font-black text-slate-950">{formatReportCell(metric.value)}</p>
        </div>
      ))}
    </div>
  );
}
