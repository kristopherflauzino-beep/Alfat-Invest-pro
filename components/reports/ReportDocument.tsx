import { ReportFooter } from "@/components/reports/ReportFooter";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportSection } from "@/components/reports/ReportSection";
import { ReportSummary } from "@/components/reports/ReportSummary";
import type { ReportDocumentData } from "@/lib/reports/types";

type PreviewPage = { number: number; total: number; first: boolean; last: boolean };

export function ReportDocument({ report, watermark = false, previewPage, pageWidth = 980, pageHeight }: { report: ReportDocumentData; watermark?: boolean; previewPage?: PreviewPage; pageWidth?: number; pageHeight?: number }) {
  const firstPage = previewPage?.first ?? true;
  const lastPage = previewPage?.last ?? true;
  return (
    <article data-report-page={previewPage?.number} className="report-document relative w-full max-w-none overflow-hidden bg-white p-10 text-slate-950 shadow-xl" style={{ width: pageWidth, minHeight: pageHeight }}>
      {watermark && <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center text-5xl font-black text-slate-100 [transform:rotate(-30deg)]">ALFATEC INVEST PRO</div>}
      <div className="relative z-10">
        <ReportHeader report={report} compact={!firstPage} />
        {firstPage && (
          <>
            <section className="mt-5 border-b border-slate-200 pb-5">
              <p className="mb-3 text-[9px] font-black uppercase text-teal-700">Informações do relatório</p>
              <div className="grid grid-cols-3 gap-3 text-xs text-slate-600">
                <p><strong className="block text-slate-900">Cliente</strong>{report.user.name}</p>
                <p><strong className="block text-slate-900">Período</strong>{report.period.label}</p>
                <p><strong className="block text-slate-900">Dados atualizados em</strong>{new Date(report.dataUpdatedAt).toLocaleString("pt-BR")}</p>
              </div>
            </section>
            <section className="mt-5">
              <p className="mb-3 text-[9px] font-black uppercase text-teal-700">Resumo da carteira</p>
              <ReportSummary metrics={report.summary} />
            </section>
          </>
        )}
        {report.sections.map((section) => <ReportSection key={section.id} section={section} />)}
        {lastPage && (
          <aside className="mt-8 rounded-md border border-slate-200 bg-slate-50 p-4 text-[10px] leading-5 text-slate-600">
            <p className="font-black text-slate-900">Fontes</p>
            <p>{report.sources.length ? report.sources.join(" · ") : "Dado indisponível na fonte consultada."}</p>
            <p className="mt-2">{report.disclaimer}</p>
          </aside>
        )}
        <ReportFooter report={report} pageNumber={previewPage?.number} totalPages={previewPage?.total} />
      </div>
    </article>
  );
}
