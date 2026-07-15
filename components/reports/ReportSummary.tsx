import { formatReportCell, type ReportMetric } from "@/lib/reports/types";

export function ReportSummary({ metrics }: { metrics: ReportMetric[] }) {
  return (
    <div className="grid auto-rows-fr grid-cols-3 gap-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex min-h-20 flex-col justify-center rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase text-slate-500">{metric.label}</p>
          <p className="mt-1 break-words text-sm font-black text-slate-950">{formatReportCell(metric.value)}</p>
        </div>
      ))}
    </div>
  );
}
