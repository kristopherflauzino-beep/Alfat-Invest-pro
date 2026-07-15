export const reportFormats = ["pdf", "xlsx", "csv", "json", "png"] as const;

export type ReportFormat = (typeof reportFormats)[number];
export type ReportCellFormat = "text" | "number" | "currency" | "percent" | "date" | "datetime";

export type ReportCell = {
  value: string | number | null;
  format?: ReportCellFormat;
};

export type ReportMetric = {
  label: string;
  value: ReportCell;
};

export type ReportColumn = {
  key: string;
  label: string;
  width?: number;
};

export type ReportTable = {
  columns: ReportColumn[];
  rows: ReportCell[][];
};

export type ReportChart = {
  title: string;
  items: Array<{ label: string; value: number }>;
  format?: "currency" | "percent" | "number";
};

export type ReportSection = {
  id: string;
  group: string;
  title: string;
  description?: string;
  metrics?: ReportMetric[];
  table?: ReportTable;
  bullets?: string[];
  chart?: ReportChart;
  unavailableReason?: string;
};

export type ReportDocumentData = {
  version: "1.0";
  title: string;
  reportType: string;
  user: { id: string; name: string; email?: string };
  generatedAt: string;
  period: { start: string; end: string; label: string };
  dataUpdatedAt: string;
  sources: string[];
  summary: ReportMetric[];
  sections: ReportSection[];
  disclaimer: string;
};

export type PdfOrientation = "auto" | "portrait" | "landscape";
export type PdfPageSize = "a4" | "letter";

export type PdfOptions = {
  orientation: PdfOrientation;
  pageSize: PdfPageSize;
  includeCover: boolean;
  includeLogo: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
  includePagination: boolean;
  includeGeneratedAt: boolean;
  includeDisclaimer: boolean;
  includeWatermark: boolean;
};

export type ReportExportOptions = {
  format: ReportFormat;
  sectionIds: string[];
  pdf: PdfOptions;
};

export const defaultPdfOptions: PdfOptions = {
  orientation: "auto",
  pageSize: "a4",
  includeCover: false,
  includeLogo: true,
  includeHeader: true,
  includeFooter: true,
  includePagination: true,
  includeGeneratedAt: true,
  includeDisclaimer: true,
  includeWatermark: false
};

export const reportDisclaimer =
  "Este relatório possui caráter exclusivamente informativo e educacional. As análises, scores, projeções e indicadores apresentados não constituem promessa de rentabilidade nem recomendação individual de compra ou venda. Investimentos envolvem riscos, e decisões devem considerar os objetivos, o perfil e as condições do investidor.";

export function reportCell(value: ReportCell["value"], format: ReportCellFormat = "text"): ReportCell {
  return { value, format };
}

export function formatReportCell(cell: ReportCell) {
  if (cell.value === null || cell.value === undefined || cell.value === "") return "Dado indisponível";
  if (typeof cell.value === "string") {
    if (cell.format === "date" || cell.format === "datetime") {
      const date = new Date(cell.value);
      if (!Number.isNaN(date.getTime())) {
        return cell.format === "datetime" ? date.toLocaleString("pt-BR") : date.toLocaleDateString("pt-BR");
      }
    }
    return cell.value;
  }
  if (cell.format === "currency") return cell.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (cell.format === "percent") return `${cell.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  return cell.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
