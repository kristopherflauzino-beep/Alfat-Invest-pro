export const FREE_PLAN_ID = "free";
export const FREE_PORTFOLIO_LIMIT = 5;
export const FREE_DAILY_NOTIFICATION_LIMIT = 3;
export const FREE_REPORT_FORMATS = ["pdf"] as const;
export const FREE_REPORT_SECTIONS = ["summary", "equity", "returns", "profit-loss", "assets"] as const;

export const freePlanPermissions = [
  "dashboard",
  "mercado",
  "oportunidades",
  "carteira",
  "notificacoes",
  "relatorios",
  "graham_valuation",
  "alfatec_fiis",
  "alfatec_crypto_method",
  "plano",
  "configuracoes"
] as const;

export const freeLockedModules = ["comparador", "radar"] as const;

export function isFreePlan(planId?: string | null, planName?: string | null) {
  return planId?.trim().toLowerCase() === FREE_PLAN_ID || planName?.trim().toLowerCase() === "free";
}

export function isFreeLockedModule(moduleId: string) {
  return (freeLockedModules as readonly string[]).includes(moduleId);
}

export function isFreeReportExportAllowed(format: string, sections: readonly string[]) {
  const allowedFormats = FREE_REPORT_FORMATS as readonly string[];
  const allowedSections = new Set<string>(FREE_REPORT_SECTIONS);
  return allowedFormats.includes(format) && sections.length > 0 && sections.every((section) => allowedSections.has(section));
}
