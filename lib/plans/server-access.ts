import "server-only";
import { AuthError, requireAccount } from "@/lib/auth/session";
import { isFreePlan } from "@/lib/plans/access";
import { readCoreState } from "@/lib/server/core-state";

export type RestrictedResource = "comparador" | "radar" | "alfatec_portfolio_method";

export async function requireResourceAccess(request: Request, resource: RestrictedResource) {
  const account = await requireAccount(request);
  if (account.role === "ADMIN") return account;

  const state = await readCoreState();
  const plan = state.plans.find((item) => item.id === account.planId);
  const expired = Boolean(account.dueDate && new Date(`${account.dueDate}T23:59:59.999`).getTime() < Date.now());
  const denied =
    account.status !== "ativo" ||
    expired ||
    isFreePlan(account.planId, plan?.name) ||
    !account.permissions.includes(resource);

  if (denied) throw new AuthError(403, "Seu plano atual não possui acesso a este recurso.");
  return account;
}
