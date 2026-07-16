import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAdminReport, buildClientReport, filterReportSections } from "@/lib/reports/build-report";
import { choosePdfOrientation, createCsvArtifact, createJsonArtifact, createPdfArtifact, createPngArtifact, createXlsxArtifact, reportFilename, sanitizeFilename } from "@/lib/reports/exporters";
import { defaultPdfOptions } from "@/lib/reports/types";
import { calculatePreviewZoom, paginatePreviewSections } from "@/lib/reports/preview";
import type { PortfolioAnalysis } from "@/lib/types";

const emptyPortfolio: PortfolioAnalysis = {
  totalInvested: 0,
  totalEquity: 0,
  totalProfit: 0,
  profitability: 0,
  projectedDividendsYear: 0,
  projectedDividendsMonth: 0,
  byType: [],
  bySector: [],
  lines: [],
  alerts: ["Nenhum alerta crítico encontrado."],
  aiSummary: ["Carteira sem posições registradas."]
};

const period = { start: "2026-01-01", end: "2026-07-15", label: "01/01/2026 a 15/07/2026" };

describe("relatórios", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("mantém conteúdo na primeira seção e identifica dados indisponíveis", () => {
    const report = buildClientReport({
      user: { id: "client-1", name: "Arthur Henrique" },
      portfolio: emptyPortfolio,
      assets: [],
      fiiAnalyses: [],
      cryptoAnalyses: [],
      period
    });
    expect(report.sections[0].id).toBe("summary");
    expect(report.sections.find((section) => section.id === "benchmark")?.unavailableReason).toContain("indisponível");
    expect(report.sections.find((section) => section.id === "assets")?.unavailableReason).toContain("Nenhum ativo");
  });

  it("seleciona somente as seções solicitadas", () => {
    const report = buildClientReport({ user: { id: "client-1", name: "Cliente" }, portfolio: emptyPortfolio, assets: [], fiiAnalyses: [], cryptoAnalyses: [], period });
    const filtered = filterReportSections(report, ["summary", "risks"]);
    expect(filtered.sections.map((section) => section.id)).toEqual(["summary", "risks"]);
  });

  it("usa paisagem automaticamente para tabelas largas", () => {
    const report = buildClientReport({ user: { id: "client-1", name: "Cliente" }, portfolio: emptyPortfolio, assets: [], fiiAnalyses: [], cryptoAnalyses: [], period });
    const wide = { ...report, sections: report.sections.filter((section) => section.id === "fii") };
    expect(choosePdfOrientation(wide, "auto")).toBe("landscape");
    expect(choosePdfOrientation(wide, defaultPdfOptions.orientation === "auto" ? "portrait" : defaultPdfOptions.orientation)).toBe("portrait");
  });

  it("gera nomes organizados sem caracteres inválidos", () => {
    const report = buildClientReport({ user: { id: "client-1", name: "Arthur Henrique Çruz" }, portfolio: emptyPortfolio, assets: [], fiiAnalyses: [], cryptoAnalyses: [], period });
    expect(sanitizeFilename("Relatório / Cliente: João")).toBe("Relatorio_Cliente_Joao");
    expect(reportFilename(report, "pdf")).toMatch(/^ALFATEC_Invest_Pro_Relatorio_Carteira_Arthur_Henrique_Cruz_\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("gera PDF com conteúdo já na primeira página", async () => {
    const report = buildClientReport({ user: { id: "client-1", name: "Cliente" }, portfolio: emptyPortfolio, assets: [], fiiAnalyses: [], cryptoAnalyses: [], period });
    const artifact = await createPdfArtifact(filterReportSections(report, ["summary"]), { ...defaultPdfOptions, includeLogo: false });
    expect(artifact.pages).toBeGreaterThanOrEqual(1);
    expect(artifact.blob.size).toBeGreaterThan(2_000);
  });
  it("gera Excel, CSV e JSON estruturados", async () => {
    const report = buildClientReport({ user: { id: "client-1", name: "Cliente" }, portfolio: emptyPortfolio, assets: [], fiiAnalyses: [], cryptoAnalyses: [], period });
    const selected = filterReportSections(report, ["summary", "assets"]);
    const [xlsx, csv, json] = await Promise.all([createXlsxArtifact(selected), createCsvArtifact(selected), createJsonArtifact(selected)]);
    expect(xlsx.blob.size).toBeGreaterThan(5_000);
    expect(await csv.blob.text()).toContain("ALFATEC INVEST PRO");
    expect(JSON.parse(await json.blob.text()).sections).toHaveLength(2);
  }, 20_000);
  it("isola plano e pagamentos no relatório individual", () => {
    const report = buildClientReport({
      user: { id: "client-1", name: "Cliente", planId: "mensal", planValue: 24.9, status: "ativo", dueDate: "2026-08-15" },
      portfolio: emptyPortfolio,
      assets: [],
      fiiAnalyses: [],
      cryptoAnalyses: [],
      plans: [{ id: "mensal", name: "Mensal", value: 29.9, durationDays: 30, status: "ativo" }],
      payments: [
        { id: "p1", clientId: "client-1", planId: "mensal", planName: "Mensal", value: 24.9, paymentDate: "2026-07-15", status: "pago" },
        { id: "p2", clientId: "client-2", planId: "anual", planName: "Anual", value: 199.9, paymentDate: "2026-07-15", status: "pago" }
      ],
      period
    });
    const plan = report.sections.find((section) => section.id === "account-plan");
    const history = report.sections.find((section) => section.id === "payment-history");
    expect(plan?.metrics?.find((metric) => metric.label === "Valor contratado")?.value.value).toBe(24.9);
    expect(history?.table?.rows).toHaveLength(1);
    expect(history?.table?.rows[0][1].value).toBe(24.9);
  });

  it("gera imagem PNG pelo canvas sem depender da interface da aplicação", async () => {
    const context = {
      fillStyle: "", strokeStyle: "", font: "", lineWidth: 1,
      fillRect: vi.fn(), fillText: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(),
      roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
      measureText: vi.fn((value: string) => ({ width: value.length * 12 }))
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) => callback(new Blob(["png-report"], { type: "image/png" })))
    };
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { setTimeout(() => this.onload?.(), 0); }
    }
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    vi.stubGlobal("Image", MockImage);
    const report = buildClientReport({ user: { id: "client-1", name: "Cliente" }, portfolio: emptyPortfolio, assets: [], fiiAnalyses: [], cryptoAnalyses: [], period });
    const artifact = await createPngArtifact(filterReportSections(report, ["summary"]));
    expect(artifact.filename).toMatch(/\.png$/);
    expect(artifact.blob.type).toBe("image/png");
    expect(context.fillText).toHaveBeenCalled();
  });
  it("calcula zoom responsivo sem ultrapassar os limites da prévia", () => {
    expect(calculatePreviewZoom({ availableWidth: 490, availableHeight: 900, pageWidth: 980, pageHeight: 1386, mode: "fit-width" })).toBe(0.5);
    expect(calculatePreviewZoom({ availableWidth: 2000, availableHeight: 2000, pageWidth: 980, pageHeight: 1386, mode: "fit-width" })).toBe(1.25);
    expect(calculatePreviewZoom({ availableWidth: 980, availableHeight: 693, pageWidth: 980, pageHeight: 1386, mode: "fit-page" })).toBe(0.5);
    expect(calculatePreviewZoom({ availableWidth: 300, availableHeight: 300, pageWidth: 980, pageHeight: 1386, mode: "actual" })).toBe(1);
  });

  it("distribui seções longas em páginas sem duplicar o resumo", () => {
    const rows = Array.from({ length: 31 }, (_, index) => [
      { value: "ATIVO" + index, format: "text" as const },
      { value: index, format: "number" as const }
    ]);
    const pages = paginatePreviewSections([
      { id: "summary", group: "Carteira", title: "Resumo" },
      { id: "assets", group: "Carteira", title: "Ativos", table: { columns: [{ key: "ticker", label: "Ativo" }, { key: "value", label: "Valor" }], rows } }
    ]);
    const sections = pages.flat();
    expect(sections.some((section) => section.id === "summary")).toBe(false);
    expect(sections).toHaveLength(3);
    expect(sections.every((section) => (section.table?.rows.length ?? 0) <= 14)).toBe(true);
    expect(sections[1].title).toContain("continuação");
  });
  it("aplica filtros administrativos sem misturar clientes", () => {
    const report = buildAdminReport({
      user: { id: "admin", name: "Administrador", role: "ADMIN" },
      accounts: [
        { id: "a", name: "Ana", role: "CLIENTE", status: "ativo", planId: "mensal", createdAt: "2026-02-01" },
        { id: "b", name: "Bruno", role: "CLIENTE", status: "bloqueado", planId: "anual", createdAt: "2026-02-01" }
      ],
      plans: [{ id: "mensal", name: "Mensal", value: 24.9, durationDays: 30, status: "ativo" }],
      payments: [{ id: "p1", clientId: "a", planId: "mensal", planName: "Mensal", value: 24.9, paymentDate: "2026-06-10", status: "pago" }],
      auditLogs: [],
      filters: { period, clientId: "a" }
    });
    const list = report.sections.find((section) => section.id === "clients-list");
    expect(list?.table?.rows).toHaveLength(1);
    expect(list?.table?.rows[0][0].value).toBe("Ana");
    expect(report.summary.find((metric) => metric.label === "Receita confirmada")?.value.value).toBe(24.9);
  });
});
