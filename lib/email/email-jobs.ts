import { readCoreState, writeCoreState, type CoreState } from "@/lib/server/core-state";
import { sendPlanEmail } from "./send-plan-email";
import type { PlanEmailInput } from "./templates/plan";

export type PlanEmailJob = {
  id: string;
  kind: "plan";
  userId: string;
  input: PlanEmailInput;
  status: "pending" | "sent" | "failed" | "not_configured";
  attempts: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt?: string;
  providerMessageId?: string;
};

function isPlanEmailJob(value: unknown): value is PlanEmailJob {
  return Boolean(value && typeof value === "object" && (value as PlanEmailJob).kind === "plan" && typeof (value as PlanEmailJob).id === "string");
}

export function enqueuePlanEmail(state: CoreState, userId: string, input: PlanEmailInput, options: { deliverAfter?: string } = {}) {
  const now = new Date().toISOString();
  const job: PlanEmailJob = {
    id: crypto.randomUUID(),
    kind: "plan",
    userId,
    input,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    nextAttemptAt: options.deliverAfter
  };
  state.emailJobs = [job, ...(Array.isArray(state.emailJobs) ? state.emailJobs : []).filter(isPlanEmailJob)].slice(0, 1000);
  return job;
}

export async function deliverPlanEmailJob(jobId: string) {
  const state = await readCoreState();
  const jobs = (Array.isArray(state.emailJobs) ? state.emailJobs : []).filter(isPlanEmailJob);
  const index = jobs.findIndex((item) => item.id === jobId);
  if (index < 0) return null;
  const job = jobs[index];
  const result = await sendPlanEmail(job.input);
  const now = new Date().toISOString();
  jobs[index] = {
    ...job,
    status: result.status,
    attempts: job.attempts + 1,
    updatedAt: now,
    nextAttemptAt: result.sent || job.attempts + 1 >= 3 ? undefined : new Date(Date.now() + Math.min(24, 2 ** job.attempts) * 60 * 60 * 1000).toISOString(),
    providerMessageId: result.providerMessageId
  };
  state.emailJobs = jobs;
  state.auditLogs = [{
    id: crypto.randomUUID(),
    action: result.sent ? "email_enviado" : "email_envio_pendente",
    userId: job.userId,
    userName: "Sistema",
    details: result.sent ? "E-mail transacional enviado." : "E-mail transacional não enviado; notificação interna preservada.",
    createdAt: now,
    risk: result.sent ? "baixo" : "medio"
  }, ...(state.auditLogs || [])];
  await writeCoreState(state);
  return jobs[index];
}