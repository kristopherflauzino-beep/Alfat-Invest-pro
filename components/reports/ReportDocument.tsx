import { ReportFooter } from "@/components/reports/ReportFooter";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportSection } from "@/components/reports/ReportSection";
import { ReportSummary } from "@/components/reports/ReportSummary";
import type { ReportDocumentData } from "@/lib/reports/types";

export function ReportDocument({ report, watermark = false }: { report: ReportDocumentData; watermark?: boolean }) {
  return (
    <article className="report-document relative mx-auto w-full max-w-[980px] overflow-hidden bg-white p-5 text-slate-950 shadow-xl sm:p-8 lg:p-10">
      {watermark && <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center text-5xl font-black text-slate-100 [transform:rotate(-30deg)]">ALFATEC INVEST PRO</div>}
      <div className="relative z-10">
        <ReportHeader report={report} />
        <div className="mt-5 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
          <p><strong className="text-slate-900">Cliente:</strong> {report.user.name}</p>
          <p><strong className="text-slate-900">Período:</strong> {report.period.label}</p>
          <p><strong className="text-slate-900">Gerado em:</strong> {new Date(report.generatedAt).toLocaleString("pt-BR")}</p>
          <p><strong className="text-slate-900">Dados atualizados em:</strong> {new Date(report.dataUpdatedAt).toLocaleString("pt-BR")}</p>
        </div>
        <div className="mt-5"><ReportSummary metrics={report.summary} /></div>
        {report.sections.map((section) => <ReportSection key={section.id} section={section} />)}
        <aside className="mt-8 rounded-md border border-slate-200 bg-slate-50 p-4 text-[10px] leading-5 text-slate-600">
          <p className="font-black text-slate-900">Fontes</p>
          <p>{report.sources.length ? report.sources.join(" · ") : "Dado indisponível na fonte consultada."}</p>
          <p className="mt-2">{report.disclaimer}</p>
        </aside>
        <ReportFooter report={report} />
      </div>
    </article>
  );
}
