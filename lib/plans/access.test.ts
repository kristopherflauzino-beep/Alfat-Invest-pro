import { describe, expect, it } from "vitest";
import {
  FREE_PORTFOLIO_LIMIT,
  isFreeLockedModule,
  isFreePlan,
  isFreeReportExportAllowed
} from "@/lib/plans/access";

describe("free plan access rules", () => {
  it("recognizes the free plan by id or name", () => {
    expect(isFreePlan("free", "Outro")).toBe(true);
    expect(isFreePlan("mensal", "FREE")).toBe(true);
    expect(isFreePlan("mensal", "Mensal")).toBe(false);
  });

  it("locks comparator and radar modules", () => {
    expect(isFreeLockedModule("comparador")).toBe(true);
    expect(isFreeLockedModule("radar")).toBe(true);
    expect(isFreeLockedModule("mercado")).toBe(false);
  });

  it("keeps the portfolio limit at five positions", () => {
    expect(FREE_PORTFOLIO_LIMIT).toBe(5);
  });

  it("allows only the summarized PDF export", () => {
    expect(isFreeReportExportAllowed("pdf", ["summary", "equity", "assets"])).toBe(true);
    expect(isFreeReportExportAllowed("xlsx", ["summary"])).toBe(false);
    expect(isFreeReportExportAllowed("pdf", ["summary", "graham"])).toBe(false);
    expect(isFreeReportExportAllowed("pdf", [])).toBe(false);
  });
});
