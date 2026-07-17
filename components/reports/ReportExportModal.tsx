"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Download, Eye, FileImage, FileJson, FileSpreadsheet, FileText, LoaderCircle, X } from "lucide-react";
import { ReportPreviewWorkspace } from "@/components/reports/ReportPreviewWorkspace";
import { filterReportSections } from "@/lib/reports/build-report";
import { exportReport } from "@/lib/reports/exporters";
import { defaultPdfOptions, type PdfOptions, type ReportDocumentData, type ReportFormat } from "@/lib/reports/types";
import type { ReportSectionOption } from "@/lib/reports/catalog";

const formats: Array<{ id: ReportFormat; label: string; extension: string; description: string; icon: typeof FileText }> = [
  { id: "pdf", label: "PDF", extension: ".pdf", description: "Documento paginado com logo, cabeçalho, rodapé e tabelas.", icon: FileText },
  { id: "xlsx", label: "Excel", extension: ".xlsx", description: "Planilha com abas, filtros, datas, moedas e números reais.", icon: FileSpreadsheet },
  { id: "csv", label: "CSV", extension: ".csv", description: "Dados em UTF-8, separados por seção e compatíveis com Excel.", icon: FileSpreadsheet },
  { id: "json", label: "JSON", extension: ".json", description: "Estrutura completa com metadados, fontes e versão.", icon: FileJson },
  { id: "png", label: "PNG", extension: ".png", description: "Imagem em alta resolução do resumo executivo.", icon: FileImage }
];

export function ReportExportModal({ open, onClose, report, catalog, allowedFormats, fixedSections = false }: { open: boolean; onClose: () => void; report: ReportDocumentData; catalog: ReportSectionOption[]; allowedFormats?: readonly ReportFormat[]; fixedSections?: boolean }) {
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [selected, setSelected] = useState<string[]>(catalog.map((item) => item.id));
  const [pdf, setPdf] = useState<PdfOptions>(defaultPdfOptions);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const groups = useMemo(() => [...new Set(catalog.map((item) => item.group))], [catalog]);
  const availableFormats = useMemo(() => allowedFormats?.length ? formats.filter((item) => allowedFormats.includes(item.id)) : formats, [allowedFormats]);
  const previewReport = useMemo(() => filterReportSections(report, selected), [report, selected]);

  useEffect(() => {
    if (!open) return;
    setSelected(catalog.map((item) => item.id)); setFormat(availableFormats[0]?.id ?? "pdf"); setPreview(false); setError(""); setStatus("");
  }, [open, catalog, availableFormats]);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  useEffect(() => {
    if (!open || preview) return;
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape" && !generating) onClose(); };
    window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener);
  }, [open, preview, generating, onClose]);
  if (!open || !mounted) return null;

  async function generate() {
    if (!selected.length) { setError("Selecione ao menos uma seção."); return; }
    setGenerating(true); setError(""); setStatus("Preparando dados...");
    try {
      const audit = await fetch("/api/reports/audit", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ format, sections: selected, reportType: report.reportType, targetUserId: report.user.id, period: report.period })
      });
      const auditPayload = await audit.json().catch(() => ({}));
      if (!audit.ok) throw new Error(auditPayload.error ?? "Não foi possível autorizar a exportação.");
      setStatus(format === "pdf" ? "Renderizando páginas..." : format === "xlsx" ? "Gerando planilhas..." : format === "png" ? "Renderizando imagem..." : "Estruturando dados...");
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      const filename = await exportReport(report, { format, sectionIds: selected, pdf });
      setStatus(`Relatório concluído: ${filename}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar o relatório."); setStatus("");
    } finally { setGenerating(false); }
  }

  const content = (
    <div className={preview ? "" : "fixed inset-0 z-[1000] overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6"} role="dialog" aria-modal="true" aria-label="Exportar relatório">
      <div className={preview ? "mx-auto max-w-6xl" : "mx-auto max-w-5xl rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f172a]"}>
        {preview ? (
          <ReportPreviewWorkspace
            report={previewReport}
            pdf={pdf}
            formatLabel={availableFormats.find((item) => item.id === format)?.label ?? format.toUpperCase()}
            generating={generating}
            status={status}
            error={error}
            onBack={() => setPreview(false)}
            onGenerate={generate}
            onClose={onClose}
          />
        ) : (
          <>
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10 sm:p-6">
              <div><p className="text-xs font-black uppercase text-teal-600 dark:text-cyan-300">AlfaTec Invest Pro</p><h2 className="text-xl font-black text-slate-950 dark:text-white">Exportar relatório</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Escolha o formato, o conteúdo e visualize antes de gerar.</p></div>
              <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-md border border-slate-300 p-2 text-slate-700 dark:border-white/15 dark:text-white"><X className="h-5 w-5" /></button>
            </header>
            <div className="space-y-7 p-5 sm:p-6">
              <section><h3 className="text-sm font-black text-slate-950 dark:text-white">Escolha o formato do arquivo</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{availableFormats.map((item) => { const Icon = item.icon; const active = format === item.id; return <button type="button" key={item.id} onClick={() => setFormat(item.id)} className={`min-h-28 rounded-md border p-3 text-left transition ${active ? "border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/20" : "border-slate-200 hover:border-teal-400 dark:border-white/10"}`}><span className="flex items-center justify-between"><Icon className="h-5 w-5 text-teal-600 dark:text-cyan-300" />{active && <Check className="h-4 w-4 text-teal-600" />}</span><strong className="mt-3 block text-sm text-slate-950 dark:text-white">{item.label} <span className="font-normal text-slate-400">{item.extension}</span></strong><span className="mt-1 block text-[11px] leading-4 text-slate-500 dark:text-slate-300">{item.description}</span></button>; })}</div></section>

              {fixedSections ? <section className="rounded-md border border-cyan-300 bg-cyan-500/10 p-4 text-sm font-semibold text-cyan-900 dark:border-cyan-400/30 dark:text-cyan-100">Relatório resumido com seções fixas do Plano FREE.</section> : (
              <section><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-black text-slate-950 dark:text-white">Conteúdo do relatório</h3><p className="text-xs text-slate-500 dark:text-slate-300">{selected.length} de {catalog.length} seções selecionadas</p></div><div className="flex gap-2"><button type="button" onClick={() => setSelected(catalog.map((item) => item.id))} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-bold dark:border-white/15">Selecionar tudo</button><button type="button" onClick={() => setSelected([])} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-bold dark:border-white/15">Limpar seleção</button></div></div>
                <div className="mt-4 space-y-5">{groups.map((group) => <div key={group}><p className="mb-2 text-xs font-black uppercase text-slate-500 dark:text-slate-300">{group}</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{catalog.filter((item) => item.group === group).map((item) => { const checked = selected.includes(item.id); return <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${checked ? "border-teal-500/50 bg-teal-500/5" : "border-slate-200 dark:border-white/10"}`}><input type="checkbox" checked={checked} onChange={() => setSelected((current) => checked ? current.filter((id) => id !== item.id) : [...current, item.id])} className="mt-1 h-4 w-4 accent-teal-600" /><span><strong className="block text-sm text-slate-900 dark:text-white">{item.label}</strong><span className="text-[11px] leading-4 text-slate-500 dark:text-slate-300">{item.description}</span></span></label>; })}</div></div>)}</div>
              </section>

              )}
              {format === "pdf" && <section><h3 className="text-sm font-black text-slate-950 dark:text-white">Configurações do PDF</h3><div className="mt-3 grid gap-4 rounded-md border border-slate-200 p-4 dark:border-white/10 lg:grid-cols-2"><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Orientação<select value={pdf.orientation} onChange={(event) => setPdf((current) => ({ ...current, orientation: event.target.value as PdfOptions["orientation"] }))} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-950 dark:border-white/15 dark:bg-slate-950 dark:text-white"><option value="auto">Automática</option><option value="portrait">Retrato</option><option value="landscape">Paisagem</option></select></label><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Tamanho<select value={pdf.pageSize} onChange={(event) => setPdf((current) => ({ ...current, pageSize: event.target.value as PdfOptions["pageSize"] }))} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-950 dark:border-white/15 dark:bg-slate-950 dark:text-white"><option value="a4">A4</option><option value="letter">Carta</option></select></label><div className="grid gap-2 sm:grid-cols-2 lg:col-span-2">{([['includeCover','Capa'],['includeLogo','Logo'],['includeHeader','Cabeçalho'],['includeFooter','Rodapé'],['includePagination','Paginação'],['includeGeneratedAt','Data de geração'],['includeDisclaimer','Aviso de risco'],['includeWatermark','Marca d’água']] as Array<[keyof PdfOptions, string]>).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" checked={Boolean(pdf[key])} onChange={(event) => setPdf((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-teal-600" />{label}</label>)}</div></div></section>}

              {error && <p className="rounded-md bg-red-500/15 p-3 text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>}
              {status && <p className="rounded-md bg-emerald-500/15 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{status}</p>}
            </div>
            <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 p-5 dark:border-white/10 sm:p-6"><button type="button" onClick={onClose} disabled={generating} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold dark:border-white/15">Cancelar</button><button type="button" onClick={() => { if (!selected.length) setError("Selecione ao menos uma seção."); else { setError(""); setPreview(true); } }} disabled={generating} className="inline-flex items-center gap-2 rounded-md border border-teal-500 px-4 py-2 text-sm font-black text-teal-700 dark:text-cyan-300"><Eye className="h-4 w-4" />Visualizar relatório</button><button type="button" onClick={generate} disabled={generating || !selected.length} className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-5 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{generating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{generating ? status || "Gerando..." : "Gerar relatório"}</button></footer>
          </>
        )}
      </div>
    </div>
  );
  return createPortal(content, document.body);
}
