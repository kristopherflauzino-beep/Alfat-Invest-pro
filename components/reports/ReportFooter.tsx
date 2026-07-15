import type { ReportDocumentData } from "@/lib/reports/types";

export function ReportFooter({ report, pageNumber, totalPages }: { report: ReportDocumentData; pageNumber?: number; totalPages?: number }) {
  return (
    <footer className="mt-8 border-t border-slate-300 pt-4 text-[10px] leading-4 text-slate-500">
      <div className="flex flex-wrap justify-between gap-2">
        <span>ALFATEC INVEST PRO</span>
        <span>Gerado em {new Date(report.generatedAt).toLocaleString("pt-BR")}</span>
        <span>{pageNumber && totalPages ? "Página " + pageNumber + " de " + totalPages : "Documento informativo"}</span>
      </div>
    </footer>
  );
}
