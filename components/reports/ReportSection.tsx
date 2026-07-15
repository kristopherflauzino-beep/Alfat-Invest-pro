import type { ReportSection as ReportSectionData } from "@/lib/reports/types";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportSummary } from "@/components/reports/ReportSummary";
import { ReportTable } from "@/components/reports/ReportTable";

export function ReportSection({ section }: { section: ReportSectionData }) {
  return (
    <section className="report-section mt-7 break-inside-avoid">
      <div className="mb-3 border-l-4 border-teal-500 pl-3">
        <p className="text-[9px] font-bold uppercase text-teal-700">{section.group}</p>
        <h2 className="text-base font-black text-slate-950">{section.title}</h2>
        {section.description && <p className="mt-1 text-[11px] leading-5 text-slate-600">{section.description}</p>}
      </div>
      {section.unavailableReason && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-800">{section.unavailableReason}</p>}
      {section.metrics && <ReportSummary metrics={section.metrics} />}
      {section.bullets && <ul className="mt-3 space-y-2 text-[11px] leading-5 text-slate-700">{section.bullets.map((bullet) => <li key={bullet} className="flex gap-2"><span className="font-black text-teal-600">•</span><span>{bullet}</span></li>)}</ul>}
      {section.chart && <ReportChart chart={section.chart} />}
      {section.table && section.table.rows.length > 0 && <ReportTable table={section.table} />}
    </section>
  );
}
