export const FREE_PLAN_ID = "free";
export const FREE_PLAN_NAME = "Plano Gratuito";
export const FREE_PORTFOLIO_LIMIT = 5;
export const FREE_OPPORTUNITY_LIMIT = 10;
export const FREE_DAILY_NOTIFICATION_LIMIT = 3;
export const FREE_REQUIRES_PAYMENT = false;
export const FREE_TECHNICAL_DURATION_DAYS = 36500;
export const FREE_REPORT_FORMATS = ["pdf"] as const;
export const FREE_REPORT_SECTIONS = ["summary", "equity", "returns", "profit-loss", "assets"] as const;
export type FreePlanLimits = {
  portfolio: number;
  opportunities: number;
  notifications: number;
};

export const DEFAULT_FREE_PLAN_LIMITS: FreePlanLimits = {
  portfolio: FREE_PORTFOLIO_LIMIT,
  opportunities: FREE_OPPORTUNITY_LIMIT,
  notifications: FREE_DAILY_NOTIFICATION_LIMIT
};

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
export const freePlanBenefits = [
  "Consulta ao mercado e busca por ticker ou nome",
  "Até 5 ativos na carteira",
  "Top 10 oportunidades do dia",
  "Relatório resumido em PDF",
  "Até 3 notificações por dia",
  "Explicações básicas dos métodos"
] as const;

export const freePlanLockedFeatures = [
  "Comparador Inteligente",
  "Radar IA",
  "Balanceamento inteligente",
  "Métodos completos",
  "Relatórios avançados"
] as const;


export const freeLockedModules = ["comparador", "radar"] as const;

export function isFreePlan(planId?: string | null, planName?: string | null) {
  const id = planId?.trim().toLowerCase();
  const name = planName?.trim().toLowerCase();
  return id === FREE_PLAN_ID || name === "free" || name === "gratuito" || name === "plano gratuito";
}

export function isActiveFreePlan(plan?: { id: string; name: string; value: number; status: string } | null): plan is { id: string; name: string; value: number; status: string } {
  return Boolean(plan && isFreePlan(plan.id, plan.name) && plan.status === "ativo" && Number.isFinite(plan.value) && plan.value === 0);
}

export function freePlanDisplayName(planName?: string | null) {
  return isFreePlan(undefined, planName) ? FREE_PLAN_NAME : planName || FREE_PLAN_NAME;
}

export function getFreePlanLimits(plan?: { limits?: Partial<FreePlanLimits> } | null): FreePlanLimits {
  const normalized = (value: unknown, fallback: number) =>
    Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
  return {
    portfolio: normalized(plan?.limits?.portfolio, DEFAULT_FREE_PLAN_LIMITS.portfolio),
    opportunities: normalized(plan?.limits?.opportunities, DEFAULT_FREE_PLAN_LIMITS.opportunities),
    notifications: normalized(plan?.limits?.notifications, DEFAULT_FREE_PLAN_LIMITS.notifications)
  };
}
export function getFreePlanBenefits(plan?: { limits?: Partial<FreePlanLimits> } | null) {
  const limits = getFreePlanLimits(plan);
  return [
    "Consulta ao mercado e busca por ticker ou nome",
    `Até ${limits.portfolio} ativos na carteira`,
    `Top ${limits.opportunities} oportunidades do dia`,
    "Relatório resumido em PDF",
    `Até ${limits.notifications} notificações por dia`,
    "Explicações básicas dos métodos"
  ];
}
export function isFreeLockedModule(moduleId: string) {
  return (freeLockedModules as readonly string[]).includes(moduleId);
}

export function isFreeReportExportAllowed(format: string, sections: readonly string[]) {
  const allowedFormats = FREE_REPORT_FORMATS as readonly string[];
  const allowedSections = new Set<string>(FREE_REPORT_SECTIONS);
  return allowedFormats.includes(format) && sections.length > 0 && sections.every((section) => allowedSections.has(section));
}
