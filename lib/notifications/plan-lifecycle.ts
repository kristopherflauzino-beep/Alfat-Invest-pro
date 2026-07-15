import { enqueuePlanEmail, type PlanEmailJob } from "../email/email-jobs";
import { createNotification, preferenceFor } from "./notifications";
import type { CoreAccount, CoreState } from "../server/core-state";

function saoPauloDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function dayDifference(dueDate: string, today = saoPauloDate()) {
  return Math.round((Date.parse(dueDate.slice(0, 10) + "T00:00:00.000Z") - Date.parse(today + "T00:00:00.000Z")) / 86_400_000);
}

function isPlanJob(value: unknown): value is PlanEmailJob {
  return Boolean(value && typeof value === "object" && (value as PlanEmailJob).kind === "plan");
}

export function ensurePlanLifecycleNotifications(state: CoreState, account: CoreAccount, today = saoPauloDate()) {
  if (account.role !== "CLIENTE" || !account.dueDate || !account.planId || account.status === "pendente") return { changed: false, emailJobIds: [] as string[] };
  const days = dayDifference(account.dueDate, today);
  if (days > 7) return { changed: false, emailJobIds: [] as string[] };
  const milestone = days < 0 ? "expired" : days === 0 ? "today" : days <= 1 ? "one" : days <= 3 ? "three" : "seven";
  const dedupKey = `plan-expiration:${account.id}:${account.dueDate.slice(0, 10)}:${milestone}`;
  const notifications = Array.isArray(state.notifications) ? state.notifications : [];
  if (notifications.some((item) => item && typeof item === "object" && (item as { dedupKey?: string }).dedupKey === dedupKey)) {
    return { changed: false, emailJobIds: [] as string[] };
  }
  const copy = milestone === "expired"
    ? { title: "Plano vencido", summary: "Seu plano está vencido. Entre em contato com o administrador para renovar.", priority: "important" as const }
    : milestone === "today"
      ? { title: "Seu plano vence hoje", summary: "Este é o último dia do período contratado.", priority: "important" as const }
      : milestone === "one"
        ? { title: "Seu plano vence amanhã", summary: "Falta 1 dia para o vencimento do plano.", priority: "important" as const }
        : { title: `Seu plano vence em ${Math.max(days, 0)} dias`, summary: "Confira a validade do acesso e solicite a renovação quando necessário.", priority: "attention" as const };
  const preference = preferenceFor(Array.isArray(state.notificationPreferences) ? state.notificationPreferences : [], account.id, "plan_expiration");
  if (preference.inAppEnabled) {
    state.notifications = [createNotification({ userId: account.id, topic: "plan_expiration", title: copy.title, summary: copy.summary, priority: copy.priority, category: "plan", actionUrl: "/?menu=plano", dedupKey }), ...notifications].slice(0, 2000);
  }
  const emailJobIds: string[] = [];
  const plan = state.plans.find((item) => item.id === account.planId);
  const event = milestone === "expired" ? "plan_expired" as const : "plan_expiring" as const;
  const jobs = Array.isArray(state.emailJobs) ? state.emailJobs.filter(isPlanJob) : [];
  const alreadyQueued = jobs.some((job) => job.userId === account.id && job.input.event === event && job.input.expiresAt?.slice(0, 10) === account.dueDate?.slice(0, 10) && job.input.statusLabel === milestone);
  if (preference.emailEnabled && !alreadyQueued) {
    const job = enqueuePlanEmail(state, account.id, {
      event,
      to: account.email,
      name: account.name,
      planName: plan?.name || "Plano",
      amountInCents: Math.round(Number(account.planValue ?? plan?.value ?? 0) * 100),
      statusLabel: milestone,
      updatedAt: new Date().toISOString(),
      expiresAt: account.dueDate
    });
    emailJobIds.push(job.id);
  }
  return { changed: true, emailJobIds };
}

export function dueEmailJobIds(state: CoreState, userId: string, now = Date.now()) {
  return (Array.isArray(state.emailJobs) ? state.emailJobs : [])
    .filter(isPlanJob)
    .filter((job) => job.userId === userId && job.status !== "sent" && job.attempts < 3 && (!job.nextAttemptAt || new Date(job.nextAttemptAt).getTime() <= now))
    .map((job) => job.id);
}