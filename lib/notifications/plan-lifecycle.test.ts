import { describe, expect, it, vi } from "vitest";

vi.mock("../email/email-jobs", () => ({
  enqueuePlanEmail: (state: { emailJobs?: unknown[] }, userId: string, input: Record<string, unknown>) => {
    const job = { id: "job-1", kind: "plan", userId, input, status: "pending", attempts: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state.emailJobs = [job, ...(state.emailJobs || [])];
    return job;
  }
}));

import { ensurePlanLifecycleNotifications } from "./plan-lifecycle";
import type { CoreState } from "../server/core-state";

function stateFor(): CoreState {
  return { accounts: [], plans: [{ id: "mensal", name: "Mensal", value: 24.9, durationDays: 30, status: "ativo", permissions: [] }], payments: [], portfolio: [], planPriceHistory: [], grahamSettings: {}, fiiSettings: {}, cryptoSettings: {}, notifications: [], notificationPreferences: [], emailJobs: [], auditLogs: [] };
}

const account = { id: "u1", role: "CLIENTE" as const, username: "cliente", email: "cliente@example.com", name: "Cliente", passwordHash: "hash", planId: "mensal", planValue: 24.9, status: "ativo", dueDate: "2026-07-21", permissions: [] };

describe("avisos de vencimento", () => {
  it("cria aviso e e-mail idempotentes", () => {
    const state = stateFor();
    const first = ensurePlanLifecycleNotifications(state, account, "2026-07-14");
    const second = ensurePlanLifecycleNotifications(state, account, "2026-07-14");
    expect(first.changed).toBe(true);
    expect(state.notifications).toHaveLength(1);
    expect(state.emailJobs).toHaveLength(1);
    expect(second.changed).toBe(false);
  });
});