import type { ReportSection } from "@/lib/reports/types";

export type PreviewFitMode = "fit-width" | "fit-page" | "actual" | "manual";

export const PREVIEW_MIN_ZOOM = 0.5;
export const PREVIEW_MAX_ZOOM = 1.25;

export function clampPreviewZoom(value: number) {
  return Math.min(PREVIEW_MAX_ZOOM, Math.max(PREVIEW_MIN_ZOOM, value));
}

export function calculatePreviewZoom(input: {
  availableWidth: number;
  availableHeight: number;
  pageWidth: number;
  pageHeight: number;
  mode: Exclude<PreviewFitMode, "manual">;
}) {
  if (input.mode === "actual") return 1;
  const widthScale = input.availableWidth / input.pageWidth;
  if (input.mode === "fit-width") return clampPreviewZoom(widthScale);
  return clampPreviewZoom(Math.min(widthScale, input.availableHeight / input.pageHeight));
}

function sectionUnits(section: ReportSection) {
  return 5
    + (section.metrics?.length ?? 0) * 1.2
    + (section.bullets?.length ?? 0)
    + (section.chart ? 7 : 0)
    + (section.table?.rows.length ?? 0) * 1.35;
}

function splitLongTables(sections: ReportSection[], rowsPerPage = 14) {
  return sections.flatMap((section) => {
    if (!section.table || section.table.rows.length <= rowsPerPage) return [section];
    const chunks: ReportSection[] = [];
    for (let start = 0; start < section.table.rows.length; start += rowsPerPage) {
      const continuation = start > 0;
      chunks.push({
        ...section,
        id: continuation ? `${section.id}-continuation-${start / rowsPerPage + 1}` : section.id,
        title: continuation ? `${section.title} (continuação)` : section.title,
        description: continuation ? undefined : section.description,
        metrics: continuation ? undefined : section.metrics,
        bullets: continuation ? undefined : section.bullets,
        chart: continuation ? undefined : section.chart,
        table: { ...section.table, rows: section.table.rows.slice(start, start + rowsPerPage) }
      });
    }
    return chunks;
  });
}

export function paginatePreviewSections(sections: ReportSection[]) {
  const expanded = splitLongTables(sections.filter((section) => section.id !== "summary"));
  const pages: ReportSection[][] = [];
  let page: ReportSection[] = [];
  let used = 0;
  let capacity = 21;

  for (const section of expanded) {
    const units = sectionUnits(section);
    if (page.length && used + units > capacity) {
      pages.push(page);
      page = [];
      used = 0;
      capacity = 34;
    }
    page.push(section);
    used += units;
  }
  if (page.length || !pages.length) pages.push(page);
  return pages;
}
