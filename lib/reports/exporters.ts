"use client";

import type { jsPDF as JsPdfDocument } from "jspdf";
import { filterReportSections } from "@/lib/reports/build-report";
import {
  formatReportCell,
  type PdfOptions,
  type ReportCell,
  type ReportDocumentData,
  type ReportExportOptions,
  type ReportSection
} from "@/lib/reports/types";

const teal: [number, number, number] = [13, 148, 136];
const navy: [number, number, number] = [15, 23, 42];
const slate: [number, number, number] = [71, 85, 105];

export function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 120);
}

export function reportFilename(report: ReportDocumentData, extension: string) {
  const date = report.generatedAt.slice(0, 10);
  const kind = report.reportType.toLowerCase().includes("admin") || report.title.toLowerCase().includes("administrativo") ? "Administrativo" : "Carteira";
  const user = sanitizeFilename(report.user.name);
  return `ALFATEC_Invest_Pro_Relatorio_${kind}_${user}_${date}.${extension}`;
}

export function choosePdfOrientation(report: ReportDocumentData, requested: PdfOptions["orientation"]) {
  if (requested !== "auto") return requested;
  const wide = report.sections.some((section) => (section.table?.columns.length ?? 0) > 6);
  return wide ? "landscape" : "portrait";
}

function selectedReport(report: ReportDocumentData, options: ReportExportOptions) {
  if (!options.sectionIds.length) throw new Error("Selecione ao menos uma seção do relatório.");
  return filterReportSections(report, options.sectionIds);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

async function loadLogoDataUrl() {
  try {
    const response = await fetch("/logo-alfatec-report.png", { cache: "force-cache" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function splitLines(doc: JsPdfDocument, value: string, width: number) {
  return doc.splitTextToSize(value, width) as string[];
}

function drawMetricGrid(doc: JsPdfDocument, metrics: ReportDocumentData["summary"], y: number, pageWidth: number) {
  const margin = 14;
  const gap = 4;
  const columns = pageWidth > 250 ? 4 : 3;
  const width = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const height = 18;
  metrics.forEach((metric, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + column * (width + gap);
    const top = y + row * (height + gap);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, top, width, height, 2, 2, "F");
    doc.setTextColor(...slate); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.text(metric.label, x + 3, top + 5);
    doc.setTextColor(...navy); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(splitLines(doc, formatReportCell(metric.value), width - 6).slice(0, 2), x + 3, top + 11);
  });
  return y + Math.ceil(metrics.length / columns) * (height + gap);
}

function drawChart(doc: JsPdfDocument, section: ReportSection, y: number, pageWidth: number, pageHeight: number) {
  const chart = section.chart;
  if (!chart?.items.length) return y;
  const items = chart.items.slice(0, 10);
  const needed = 12 + items.length * 7;
  if (y + needed > pageHeight - 24) { doc.addPage(); y = 28; }
  const max = Math.max(...items.map((item) => Math.abs(item.value)), 1);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...navy);
  doc.text(chart.title, 14, y); y += 5;
  items.forEach((item) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...slate);
    doc.text(splitLines(doc, item.label, 42)[0] ?? item.label, 14, y + 3.5);
    doc.setFillColor(226, 232, 240); doc.roundedRect(58, y, pageWidth - 93, 4, 1, 1, "F");
    doc.setFillColor(...teal); doc.roundedRect(58, y, Math.max(1, (pageWidth - 93) * Math.abs(item.value) / max), 4, 1, 1, "F");
    const suffix = chart.format === "percent" ? "%" : "";
    const label = chart.format === "currency" ? item.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : `${item.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${suffix}`;
    doc.setTextColor(...navy); doc.text(label, pageWidth - 14, y + 3.5, { align: "right" });
    y += 7;
  });
  return y + 3;
}

export async function createPdfArtifact(report: ReportDocumentData, pdf: PdfOptions) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableModule.default;
  const orientation = choosePdfOrientation(report, pdf.orientation);
  const doc = new jsPDF({ orientation: orientation === "landscape" ? "landscape" : "portrait", unit: "mm", format: pdf.pageSize });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logo = pdf.includeLogo ? await loadLogoDataUrl() : null;
  let y = 28;

  if (pdf.includeCover) {
    doc.setFillColor(...navy); doc.rect(0, 0, pageWidth, pageHeight, "F");
    if (logo) doc.addImage(logo, "PNG", pageWidth / 2 - 25, 28, 50, 50, undefined, "FAST");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(25);
    doc.text("ALFATEC INVEST PRO", pageWidth / 2, 94, { align: "center" });
    doc.setTextColor(34, 211, 238); doc.setFontSize(14);
    doc.text(report.title.toUpperCase(), pageWidth / 2, 108, { align: "center" });
    doc.setTextColor(226, 232, 240); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Cliente: ${report.user.name}`, pageWidth / 2, 124, { align: "center" });
    doc.text(`Período: ${report.period.label}`, pageWidth / 2, 132, { align: "center" });
    doc.addPage(); y = 28;
  }

  doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text(report.title, 14, y);
  y += 7; doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...slate);
  doc.text(`Tipo: ${report.reportType}`, 14, y); y += 5;
  doc.text(`Cliente: ${report.user.name}${report.user.email ? ` · ${report.user.email}` : ""}`, 14, y); y += 5;
  doc.text(`Período: ${report.period.label}`, 14, y); y += 5;
  if (pdf.includeGeneratedAt) { doc.text(`Gerado em: ${new Date(report.generatedAt).toLocaleString("pt-BR")}`, 14, y); y += 5; }
  doc.text(`Dados atualizados em: ${new Date(report.dataUpdatedAt).toLocaleString("pt-BR")}`, 14, y); y += 7;
  y = drawMetricGrid(doc, report.summary, y, pageWidth) + 2;

  for (const section of report.sections) {
    if (y > pageHeight - 38) { doc.addPage(); y = 28; }
    doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(section.title, 14, y); y += 5;
    if (section.description) {
      doc.setTextColor(...slate); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      const lines = splitLines(doc, section.description, pageWidth - 28);
      doc.text(lines, 14, y); y += lines.length * 3.6 + 2;
    }
    if (section.unavailableReason) {
      doc.setFillColor(255, 247, 237); doc.roundedRect(14, y, pageWidth - 28, 11, 2, 2, "F");
      doc.setTextColor(154, 52, 18); doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text(splitLines(doc, section.unavailableReason, pageWidth - 34).slice(0, 2), 17, y + 5); y += 15;
    }
    if (section.metrics?.length) y = drawMetricGrid(doc, section.metrics, y, pageWidth) + 1;
    if (section.bullets?.length) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...slate);
      for (const bullet of section.bullets.slice(0, 20)) {
        const lines = splitLines(doc, `• ${bullet}`, pageWidth - 32);
        if (y + lines.length * 3.6 > pageHeight - 22) { doc.addPage(); y = 28; }
        doc.text(lines, 17, y); y += lines.length * 3.6 + 1;
      }
      y += 2;
    }
    y = drawChart(doc, section, y, pageWidth, pageHeight);
    if (section.table?.rows.length) {
      autoTable(doc, {
        startY: y,
        head: [section.table.columns.map((column) => column.label)],
        body: section.table.rows.map((row) => row.map(formatReportCell)),
        margin: { top: 22, right: 14, bottom: 20, left: 14 },
        theme: "grid",
        styles: { font: "helvetica", fontSize: section.table.columns.length > 7 ? 6.5 : 7.5, cellPadding: 2, overflow: "linebreak", textColor: navy },
        headStyles: { fillColor: teal, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        rowPageBreak: "avoid",
        showHead: "everyPage"
      });
      y = ((doc as JsPdfDocument & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;
    } else y += 5;
  }

  if (pdf.includeDisclaimer) {
    if (y > pageHeight - 48) { doc.addPage(); y = 28; }
    doc.setFillColor(241, 245, 249); doc.roundedRect(14, y, pageWidth - 28, 28, 2, 2, "F");
    doc.setTextColor(...slate); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text(splitLines(doc, report.disclaimer, pageWidth - 34), 17, y + 6);
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    if (pdf.includeWatermark) {
      doc.setTextColor(226, 232, 240); doc.setFontSize(34); doc.setFont("helvetica", "bold");
      doc.text("ALFATEC INVEST PRO", pageWidth / 2, pageHeight / 2, { align: "center", angle: 35 });
    }
    if (pdf.includeHeader && (!pdf.includeCover || page > 1)) {
      doc.setDrawColor(226, 232, 240); doc.line(14, 19, pageWidth - 14, 19);
      if (logo) doc.addImage(logo, "PNG", 14, 5, 12, 12, undefined, "FAST");
      doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text("ALFATEC INVEST PRO", logo ? 29 : 14, 10);
      doc.setFont("helvetica", "normal"); doc.setTextColor(...slate);
      doc.text(report.title, logo ? 29 : 14, 14);
    }
    if (pdf.includeFooter) {
      doc.setDrawColor(226, 232, 240); doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
      doc.setTextColor(...slate); doc.setFont("helvetica", "normal"); doc.setFontSize(6.8);
      doc.text("Documento informativo · análises não constituem garantia de rentabilidade.", 14, pageHeight - 8);
      if (pdf.includePagination) doc.text(`Página ${page} de ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: "right" });
    }
  }
  const blob = doc.output("blob");
  const filename = reportFilename(report, "pdf");
  return { blob, filename, pages: totalPages };
}

async function exportPdf(report: ReportDocumentData, pdf: PdfOptions) {
  const artifact = await createPdfArtifact(report, pdf);
  downloadBlob(artifact.blob, artifact.filename);
  return artifact.filename;
}

function excelValue(cell: ReportCell) {
  if (cell.value === null || cell.value === undefined) return "Dado indisponível";
  if ((cell.format === "date" || cell.format === "datetime") && typeof cell.value === "string") {
    const parsed = new Date(cell.value);
    return Number.isNaN(parsed.getTime()) ? cell.value : parsed;
  }
  return cell.value;
}

function applyExcelFormat(target: { numFmt?: string }, cell: ReportCell) {
  if (cell.format === "currency") target.numFmt = 'R$ #,##0.00;[Red]-R$ #,##0.00';
  if (cell.format === "percent") target.numFmt = '0.00"%"';
  if (cell.format === "date") target.numFmt = "dd/mm/yyyy";
  if (cell.format === "datetime") target.numFmt = "dd/mm/yyyy hh:mm";
}

export async function createXlsxArtifact(report: ReportDocumentData) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ALFATEC INVEST PRO";
  workbook.created = new Date(report.generatedAt);
  const summary = workbook.addWorksheet("Resumo", { views: [{ state: "frozen", ySplit: 6 }] });
  summary.addRow(["ALFATEC INVEST PRO"]); summary.addRow([report.title]); summary.addRow(["Cliente", report.user.name]); summary.addRow(["Período", report.period.label]); summary.addRow(["Gerado em", new Date(report.generatedAt)]); summary.addRow([]);
  report.summary.forEach((metric) => { const row = summary.addRow([metric.label, excelValue(metric.value)]); applyExcelFormat(row.getCell(2), metric.value); });
  summary.getCell("A1").font = { bold: true, color: { argb: "FF0D9488" }, size: 18 };
  summary.getCell("A2").font = { bold: true, size: 14 };
  summary.columns = [{ width: 34 }, { width: 28 }];
  const usedNames = new Set<string>(["Resumo"]);
  report.sections.forEach((section, sectionIndex) => {
    let name = sanitizeFilename(section.title).slice(0, 28) || `Secao_${sectionIndex + 1}`;
    let candidate = name; let suffix = 2;
    while (usedNames.has(candidate)) { candidate = `${name.slice(0, 25)}_${suffix}`; suffix += 1; }
    usedNames.add(candidate);
    const sheet = workbook.addWorksheet(candidate, { views: [{ state: "frozen", ySplit: 3 }] });
    sheet.addRow([section.title]); sheet.addRow([section.description ?? section.unavailableReason ?? ""]); sheet.addRow([]);
    sheet.getCell("A1").font = { bold: true, color: { argb: "FF0F172A" }, size: 15 };
    if (section.metrics?.length) {
      section.metrics.forEach((metric) => { const row = sheet.addRow([metric.label, excelValue(metric.value)]); applyExcelFormat(row.getCell(2), metric.value); });
      sheet.addRow([]);
    }
    if (section.bullets?.length) { section.bullets.forEach((bullet) => sheet.addRow(["•", bullet])); sheet.addRow([]); }
    if (section.table?.rows.length) {
      const headerRow = sheet.addRow(section.table.columns.map((column) => column.label));
      headerRow.eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } }; });
      section.table.rows.forEach((cells) => {
        const row = sheet.addRow(cells.map(excelValue));
        cells.forEach((cell, index) => applyExcelFormat(row.getCell(index + 1), cell));
      });
      sheet.autoFilter = { from: { row: headerRow.number, column: 1 }, to: { row: headerRow.number + section.table.rows.length, column: section.table.columns.length } };
    }
    sheet.columns.forEach((column) => {
      let maxLength = 12;
      column.eachCell?.({ includeEmpty: true }, (cell) => { maxLength = Math.max(maxLength, String(cell.value ?? "").length + 2); });
      column.width = Math.min(42, maxLength);
    });
  });
  const output = await workbook.xlsx.writeBuffer();
  const filename = reportFilename(report, "xlsx");
  return { blob: new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename };
}

async function exportXlsx(report: ReportDocumentData) {
  const artifact = await createXlsxArtifact(report);
  downloadBlob(artifact.blob, artifact.filename);
  return artifact.filename;
}

function csvEscape(value: string) {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function createCsvArtifact(report: ReportDocumentData) {
  const rows: string[][] = [["ALFATEC INVEST PRO"], [report.title], ["Cliente", report.user.name], ["Período", report.period.label], ["Gerado em", new Date(report.generatedAt).toLocaleString("pt-BR")], []];
  report.sections.forEach((section) => {
    rows.push([section.title]);
    if (section.description) rows.push([section.description]);
    if (section.unavailableReason) rows.push([section.unavailableReason]);
    section.metrics?.forEach((metric) => rows.push([metric.label, formatReportCell(metric.value)]));
    section.bullets?.forEach((bullet) => rows.push(["Item", bullet]));
    if (section.table?.rows.length) {
      rows.push(section.table.columns.map((column) => column.label));
      section.table.rows.forEach((row) => rows.push(row.map(formatReportCell)));
    }
    rows.push([]);
  });
  const content = "\ufeff" + rows.map((row) => row.map(csvEscape).join(";")).join("\r\n");
  const filename = reportFilename(report, "csv");
  return { blob: new Blob([content], { type: "text/csv;charset=utf-8" }), filename };
}

async function exportCsv(report: ReportDocumentData) {
  const artifact = await createCsvArtifact(report);
  downloadBlob(artifact.blob, artifact.filename);
  return artifact.filename;
}

export async function createJsonArtifact(report: ReportDocumentData) {
  const filename = reportFilename(report, "json");
  return { blob: new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" }), filename };
}

async function exportJson(report: ReportDocumentData) {
  const artifact = await createJsonArtifact(report);
  downloadBlob(artifact.blob, artifact.filename);
  return artifact.filename;
}

function wrapCanvasText(context: CanvasRenderingContext2D, textValue: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3) {
  const words = textValue.split(/\s+/); let line = ""; let lineCount = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y + lineCount * lineHeight); line = word; lineCount += 1;
      if (lineCount >= maxLines) return y + lineCount * lineHeight;
    } else line = candidate;
  }
  if (lineCount < maxLines) { context.fillText(line, x, y + lineCount * lineHeight); lineCount += 1; }
  return y + lineCount * lineHeight;
}

export async function createPngArtifact(report: ReportDocumentData) {
  const canvas = document.createElement("canvas"); canvas.width = 1600; canvas.height = 1200;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Não foi possível preparar a imagem.");
  context.fillStyle = "#f8fafc"; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0f172a"; context.fillRect(0, 0, canvas.width, 210);
  const logo = new Image(); logo.src = "/logo-alfatec-report.png";
  await new Promise<void>((resolve) => { logo.onload = () => { context.drawImage(logo, 70, 35, 140, 140); resolve(); }; logo.onerror = () => resolve(); });
  context.fillStyle = "#22d3ee"; context.font = "700 28px Arial"; context.fillText("ALFATEC INVEST PRO", 240, 80);
  context.fillStyle = "#ffffff"; context.font = "800 46px Arial"; wrapCanvasText(context, report.title, 240, 135, 1240, 52, 2);
  context.fillStyle = "#334155"; context.font = "24px Arial"; context.fillText(`${report.user.name} · ${report.period.label}`, 70, 260);
  const columns = 3; const cardWidth = 460; const cardHeight = 150; const gap = 35;
  report.summary.slice(0, 6).forEach((metric, index) => {
    const x = 70 + (index % columns) * (cardWidth + gap); const y = 310 + Math.floor(index / columns) * (cardHeight + gap);
    context.fillStyle = "#ffffff"; context.strokeStyle = "#cbd5e1"; context.lineWidth = 2; context.beginPath(); context.roundRect(x, y, cardWidth, cardHeight, 12); context.fill(); context.stroke();
    context.fillStyle = "#64748b"; context.font = "22px Arial"; context.fillText(metric.label, x + 28, y + 45);
    context.fillStyle = "#0f172a"; context.font = "700 34px Arial"; wrapCanvasText(context, formatReportCell(metric.value), x + 28, y + 98, cardWidth - 56, 38, 2);
  });
  const firstSection = report.sections.find((section) => section.bullets?.length);
  let y = 720; context.fillStyle = "#0f172a"; context.font = "700 30px Arial"; context.fillText(firstSection?.title ?? "Resumo", 70, y); y += 50;
  context.fillStyle = "#475569"; context.font = "22px Arial";
  (firstSection?.bullets ?? ["Consulte o relatório completo para detalhes, fontes e limitações."]).slice(0, 5).forEach((bullet) => { y = wrapCanvasText(context, `• ${bullet}`, 90, y, 1400, 31, 2) + 14; });
  context.fillStyle = "#64748b"; context.font = "18px Arial"; context.fillText(`Gerado em ${new Date(report.generatedAt).toLocaleString("pt-BR")}`, 70, 1150);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Não foi possível gerar o PNG.")), "image/png", 1));
  const filename = reportFilename(report, "png"); return { blob, filename };
}

async function exportPng(report: ReportDocumentData) {
  const artifact = await createPngArtifact(report);
  downloadBlob(artifact.blob, artifact.filename);
  return artifact.filename;
}

export async function exportReport(input: ReportDocumentData, options: ReportExportOptions) {
  const report = selectedReport(input, options);
  if (options.format === "pdf") return exportPdf(report, options.pdf);
  if (options.format === "xlsx") return exportXlsx(report);
  if (options.format === "csv") return exportCsv(report);
  if (options.format === "json") return exportJson(report);
  return exportPng(report);
}
