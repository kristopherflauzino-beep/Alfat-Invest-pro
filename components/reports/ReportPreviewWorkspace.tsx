"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  Maximize2,
  Minimize2,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Settings2,
  X
} from "lucide-react";
import { ReportDocument } from "@/components/reports/ReportDocument";
import {
  calculatePreviewZoom,
  clampPreviewZoom,
  paginatePreviewSections,
  type PreviewFitMode
} from "@/lib/reports/preview";
import type { PdfOptions, ReportDocumentData } from "@/lib/reports/types";

type Props = {
  report: ReportDocumentData;
  pdf: PdfOptions;
  formatLabel: string;
  generating: boolean;
  status: string;
  error: string;
  onBack: () => void;
  onGenerate: () => void;
  onClose: () => void;
};

const zoomPresets = [0.5, 0.75, 0.9, 1, 1.1, 1.25];

export function ReportPreviewWorkspace({ report, pdf, formatLabel, generating, status, error, onBack, onGenerate, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [fitMode, setFitMode] = useState<PreviewFitMode>("fit-width");
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [navigationHidden, setNavigationHidden] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const orientation = useMemo(() => {
    if (pdf.orientation !== "auto") return pdf.orientation;
    return report.sections.some((section) => (section.table?.columns.length ?? 0) > 6) ? "landscape" : "portrait";
  }, [pdf.orientation, report.sections]);
  const portraitHeight = pdf.pageSize === "letter" ? 1268 : 1386;
  const pageWidth = orientation === "landscape" ? portraitHeight : 980;
  const pageHeight = orientation === "landscape" ? 980 : portraitHeight;
  const pages = useMemo(() => paginatePreviewSections(report.sections), [report.sections]);

  const recalculateZoom = useCallback(() => {
    const workspace = workspaceRef.current;
    if (!workspace || fitMode === "manual") return;
    const availableWidth = Math.max(1, workspace.clientWidth - (window.innerWidth < 640 ? 24 : 64));
    const availableHeight = Math.max(1, workspace.clientHeight - 48);
    setZoom(calculatePreviewZoom({ availableWidth, availableHeight, pageWidth, pageHeight, mode: fitMode }));
  }, [fitMode, pageHeight, pageWidth]);

  useEffect(() => {
    recalculateZoom();
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const observer = new ResizeObserver(recalculateZoom);
    observer.observe(workspace);
    window.addEventListener("resize", recalculateZoom);
    return () => { observer.disconnect(); window.removeEventListener("resize", recalculateZoom); };
  }, [recalculateZoom, navigationHidden]);

  useEffect(() => {
    const onFullscreen = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else if (isFullscreen) setIsFullscreen(false);
        else onClose();
        return;
      }
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key === "+" || event.key === "=") { event.preventDefault(); changeZoom(0.1); }
      if (event.key === "-") { event.preventDefault(); changeZoom(-0.1); }
      if (event.key === "0") { event.preventDefault(); applyFit("fit-page"); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function applyFit(mode: Exclude<PreviewFitMode, "manual">) {
    setFitMode(mode);
    requestAnimationFrame(() => {
      const workspace = workspaceRef.current;
      if (!workspace) return;
      setZoom(calculatePreviewZoom({
        availableWidth: Math.max(1, workspace.clientWidth - (window.innerWidth < 640 ? 24 : 64)),
        availableHeight: Math.max(1, workspace.clientHeight - 48),
        pageWidth,
        pageHeight,
        mode
      }));
    });
  }

  function changeZoom(delta: number) {
    setFitMode("manual");
    setZoom((value) => clampPreviewZoom(Math.round((value + delta) * 20) / 20));
  }

  function selectZoom(value: number) {
    setFitMode("manual");
    setZoom(clampPreviewZoom(value));
  }

  function goToPage(page: number) {
    const next = Math.min(pages.length, Math.max(1, page));
    const workspace = workspaceRef.current;
    const target = workspace?.querySelector<HTMLElement>(`[data-report-page="${next}"]`);
    if (workspace && target) {
      const top = target.getBoundingClientRect().top - workspace.getBoundingClientRect().top + workspace.scrollTop - 24;
      workspace.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
    setCurrentPage(next);
  }

  function trackPage() {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const top = workspace.getBoundingClientRect().top + 36;
    const visible = [...workspace.querySelectorAll<HTMLElement>("[data-report-page]")]
      .map((page) => ({ number: Number(page.dataset.reportPage), distance: Math.abs(page.getBoundingClientRect().top - top) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (visible?.number) setCurrentPage(visible.number);
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
      return;
    }
    if (isFullscreen) {
      setIsFullscreen(false);
      return;
    }
    setNavigationHidden(true);
    try {
      await rootRef.current?.requestFullscreen?.();
    } finally {
      setIsFullscreen(true);
      requestAnimationFrame(recalculateZoom);
    }
  }

  const secondaryActions = (
    <>
      <button type="button" onClick={() => applyFit("fit-page")} className="report-tool-button" title="Ajustar à tela"><Maximize2 className="h-4 w-4" /><span>Ajustar à tela</span></button>
      <button type="button" onClick={() => applyFit("fit-width")} className="report-tool-button" title="Ajustar à largura"><Expand className="h-4 w-4" /><span>Ajustar à largura</span></button>
      <button type="button" onClick={() => applyFit("actual")} className="report-tool-button" title="Tamanho real"><RotateCcw className="h-4 w-4" /><span>Tamanho real</span></button>
      <button type="button" onClick={() => setNavigationHidden((value) => !value)} className="report-tool-button" aria-pressed={navigationHidden} title={navigationHidden ? "Mostrar menu lateral" : "Ocultar menu lateral"}>{navigationHidden ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}<span>{navigationHidden ? "Mostrar menu" : "Ocultar menu"}</span></button>
      <button type="button" onClick={() => void toggleFullscreen()} className="report-tool-button" aria-pressed={isFullscreen} title={isFullscreen ? "Sair da tela cheia" : "Visualizar em tela cheia"}>{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}<span>{isFullscreen ? "Sair da tela cheia" : "Tela cheia"}</span></button>
    </>
  );

  return (
    <div ref={rootRef} data-fullscreen={isFullscreen} className="pointer-events-none fixed inset-0 z-[1000] overflow-hidden bg-transparent" role="dialog" aria-modal="true" aria-label="Pré-visualização do relatório">
      <div className={`h-full transition-[padding] duration-300 ${navigationHidden ? "" : "lg:pl-[19rem]"}`}>
        <div className="pointer-events-auto flex h-full min-w-0 flex-col overflow-hidden bg-slate-100 text-slate-950 dark:bg-[#020817] dark:text-slate-100">
          <header className="z-30 shrink-0 border-b border-slate-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/95 sm:px-5" role="toolbar" aria-label="Ferramentas da pré-visualização">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="w-full min-w-0 sm:w-auto sm:min-w-[16rem] sm:flex-1 lg:max-w-sm">
                <h2 className="truncate text-sm font-black sm:text-base">{report.title}</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-300">{formatLabel} · Página {currentPage} de {pages.length} · Zoom {Math.round(zoom * 100)}%</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => changeZoom(-0.05)} disabled={zoom <= 0.5} className="report-icon-button" aria-label="Diminuir zoom" title="Diminuir zoom"><Minus className="h-4 w-4" /></button>
                <select aria-label="Zoom da pré-visualização" value={zoomPresets.includes(zoom) ? zoom : "custom"} onChange={(event) => selectZoom(Number(event.target.value))} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-xs font-black text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white">
                  {!zoomPresets.includes(zoom) && <option value="custom">{Math.round(zoom * 100)}%</option>}
                  {zoomPresets.map((value) => <option key={value} value={value}>{Math.round(value * 100)}%</option>)}
                </select>
                <button type="button" onClick={() => changeZoom(0.05)} disabled={zoom >= 1.25} className="report-icon-button" aria-label="Aumentar zoom" title="Aumentar zoom"><Plus className="h-4 w-4" /></button>
              </div>
              <div className="hidden items-center gap-1.5 2xl:flex">{secondaryActions}</div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={onBack} className="report-tool-button"><Settings2 className="h-4 w-4" /><span className="hidden sm:inline">Alterar opções</span></button>
                <button type="button" onClick={onGenerate} disabled={generating} className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-3 text-xs font-black text-white disabled:opacity-60"><Download className="h-4 w-4" /><span className="hidden sm:inline">Gerar relatório</span></button>
                <button type="button" onClick={onClose} disabled={generating} className="report-icon-button" aria-label="Fechar pré-visualização" title="Fechar"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <details className="mt-2 2xl:hidden"><summary className="cursor-pointer text-xs font-bold text-teal-700 dark:text-cyan-300">Mais opções</summary><div className="mt-2 flex flex-wrap gap-2">{secondaryActions}</div></details>
            {(error || status) && <p className={`mt-2 rounded-md px-3 py-2 text-xs font-semibold ${error ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}>{error || status}</p>}
          </header>

          <div ref={workspaceRef} onScroll={trackPage} className="report-preview-workspace min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-8" tabIndex={0}>
            <div className="mx-auto flex w-fit min-w-fit flex-col items-center gap-8 pb-8" style={{ zoom }}>
              {pages.map((sections, index) => (
                <ReportDocument
                  key={index}
                  report={{ ...report, sections }}
                  watermark={pdf.includeWatermark}
                  previewPage={{ number: index + 1, total: pages.length, first: index === 0, last: index === pages.length - 1 }}
                  pageWidth={pageWidth}
                  pageHeight={pageHeight}
                />
              ))}
            </div>
          </div>

          <nav className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 dark:border-white/10 dark:bg-[#0f172a]/95" aria-label="Navegação entre páginas">
            <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className="report-icon-button" aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></button>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Página <input type="number" min={1} max={pages.length} value={currentPage} onChange={(event) => goToPage(Number(event.target.value))} className="mx-1 h-9 w-14 rounded-md border border-slate-300 bg-white text-center text-slate-950 dark:border-white/15 dark:bg-slate-950 dark:text-white" /> de {pages.length}</label>
            <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pages.length} className="report-icon-button" aria-label="Próxima página"><ChevronRight className="h-4 w-4" /></button>
          </nav>
        </div>
      </div>
    </div>
  );
}
