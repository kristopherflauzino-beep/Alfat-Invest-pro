import "server-only";
import { AuthError, requireAccount } from "@/lib/auth/session";
import { isFreePlan } from "@/lib/plans/access";
import { readCoreState } from "@/lib/server/core-state";

export type RestrictedResource = "comparador" | "radar" | "alfatec_portfolio_method" | "renda_fixa";
const paidOnlyResources = new Set<RestrictedResource>(["comparador", "radar", "alfatec_portfolio_method"]);

export async function requireResourceAccess(request: Request, resource: RestrictedResource) {
  const account = await requireAccount(request);
  if (account.role === "ADMIN") return account;

  const state = await readCoreState();
  const plan = state.plans.find((item) => item.id === account.planId);
  const expired = Boolean(account.dueDate && new Date(`${account.dueDate}T23:59:59.999`).getTime() < Date.now());
  const legacyFullAccess = account.permissions.length >= 7 || (plan?.permissions.length ?? 0) >= 7;
  const hasPermission = account.permissions.includes(resource) || plan?.permissions.includes(resource) || legacyFullAccess;
  const denied =
    account.status !== "ativo" ||
    expired ||
    (paidOnlyResources.has(resource) && isFreePlan(account.planId, plan?.name)) ||
    !hasPermission;

  if (denied) throw new AuthError(403, "Seu plano atual não possui acesso a este recurso.");
  return account;
}
