import { describe, expect, it } from "vitest";
import {
  DEFAULT_FREE_PLAN_LIMITS,
  FREE_PORTFOLIO_LIMIT,
  FREE_PLAN_NAME,
  freePlanDisplayName,
  getFreePlanBenefits,
  getFreePlanLimits,
  isFreeLockedModule,
  isFreePlan,
  isActiveFreePlan,
  isFreeReportExportAllowed
} from "@/lib/plans/access";

describe("free plan access rules", () => {
  it("recognizes the free plan by id or name", () => {
    expect(isFreePlan("free", "Outro")).toBe(true);
    expect(isFreePlan("mensal", "FREE")).toBe(true);
    expect(isFreePlan("mensal", "Mensal")).toBe(false);
    expect(isFreePlan("mensal", "Gratuito")).toBe(true);
    expect(isFreePlan("mensal", "Plano Gratuito")).toBe(true);
    expect(freePlanDisplayName("FREE")).toBe(FREE_PLAN_NAME);
  });

  it("only accepts a zero-priced active free plan", () => {
    expect(isActiveFreePlan({ id: "free", name: "FREE", value: 0, status: "ativo" })).toBe(true);
    expect(isActiveFreePlan({ id: "free", name: "FREE", value: 1, status: "ativo" })).toBe(false);
    expect(isActiveFreePlan({ id: "free", name: "FREE", value: 0, status: "inativo" })).toBe(false);
    expect(isActiveFreePlan({ id: "mensal", name: "Mensal", value: 0, status: "ativo" })).toBe(false);
  });

  it("locks comparator and radar modules", () => {

    expect(isFreeLockedModule("comparador")).toBe(true);
    expect(isFreeLockedModule("radar")).toBe(true);
    expect(isFreeLockedModule("mercado")).toBe(false);
  });

  it("keeps the portfolio limit at five positions", () => {
    expect(FREE_PORTFOLIO_LIMIT).toBe(5);
  });

  it("uses configurable free limits with safe defaults", () => {
    expect(getFreePlanLimits()).toEqual(DEFAULT_FREE_PLAN_LIMITS);
    expect(getFreePlanLimits({ limits: { portfolio: 8, opportunities: 15, notifications: 6 } })).toEqual({
      portfolio: 8,
      opportunities: 15,
      notifications: 6
    });
    expect(getFreePlanLimits({ limits: { portfolio: 0, opportunities: Number.NaN, notifications: -2 } })).toEqual(DEFAULT_FREE_PLAN_LIMITS);
  });

  it("describes benefits using the configured limits", () => {
    const benefits = getFreePlanBenefits({ limits: { portfolio: 8, opportunities: 15, notifications: 6 } });
    expect(benefits).toContain("Até 8 ativos na carteira");
    expect(benefits).toContain("Top 15 oportunidades do dia");
    expect(benefits).toContain("Até 6 notificações por dia");
  });

  it("allows only the summarized PDF export", () => {
    expect(isFreeReportExportAllowed("pdf", ["summary", "equity", "assets"])).toBe(true);
    expect(isFreeReportExportAllowed("xlsx", ["summary"])).toBe(false);
    expect(isFreeReportExportAllowed("pdf", ["summary", "graham"])).toBe(false);
    expect(isFreeReportExportAllowed("pdf", [])).toBe(false);
  });
});
