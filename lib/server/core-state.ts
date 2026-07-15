import { get, put } from "@vercel/blob";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";

export type CoreAccount = { id: string; role: "ADMIN" | "CLIENTE"; username: string; email: string; name: string; phone?: string; passwordHash: string; planId?: string; planValue?: number; status: string; dueDate?: string; planStartedAt?: string; permissions: string[]; [key: string]: unknown };
export type CorePlan = { id: string; name: string; value: number; durationDays: number; status: string; permissions: string[]; [key: string]: unknown };
export type CoreState = { accounts: CoreAccount[]; plans: CorePlan[]; payments: unknown[]; portfolio: unknown[]; planPriceHistory: unknown[]; grahamSettings: Record<string, unknown>; fiiSettings: Record<string, unknown>; cryptoSettings: Record<string, unknown>; subscriptionRequests?: unknown[]; portfolioProfiles?: unknown[]; notifications?: unknown[]; notificationPreferences?: unknown[]; passwordResetTokens?: unknown[]; passwordResetRateEvents?: unknown[]; emailJobs?: unknown[]; reportExports?: unknown[]; reportRateEvents?: unknown[]; auditLogs: Array<Record<string, unknown>>; [key: string]: unknown };

function findEnvBySuffix(suffix: string, validator: (value: string) => boolean = (value) => value.trim() !== "") {
  const direct = process.env[suffix];
  if (direct && validator(direct)) return direct;
  const key = Object.keys(process.env).find((name) => name.endsWith(`_${suffix}`) && validator(process.env[name] ?? ""));
  return key ? process.env[key] ?? "" : "";
}

export const blobToken = findEnvBySuffix("BLOB_READ_WRITE_TOKEN", (value) => value.startsWith("vercel_blob_rw_")) || findEnvBySuffix("READ_WRITE_TOKEN", (value) => value.startsWith("vercel_blob_rw_"));
const blobStoreId = findEnvBySuffix("BLOB_STORE_ID") || findEnvBySuffix("STORE_ID");
const blobPath = process.env.APP_STATE_BLOB_PATH || "alfatec-invest-pro/app-state.json";
const hasBlob = Boolean(blobToken || (blobStoreId && (process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL === "1")));

async function ensureStateTable() {
  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "PersistentAppState" ("key" TEXT PRIMARY KEY, "value" JSONB NOT NULL, "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

async function readDatabaseState(): Promise<CoreState | null> {
  await ensureStateTable();
  const rows = await prisma.$queryRaw<Array<{ value: CoreState }>>`SELECT "value" FROM "PersistentAppState" WHERE "key" = 'default' LIMIT 1`;
  return rows[0]?.value ?? null;
}

async function readBlobState(): Promise<CoreState | null> {
  if (!hasBlob) return null;
  try {
    const blob = await get(blobPath, { access: "private", token: blobToken || undefined, useCache: false });
    if (!blob?.stream) return null;
    return JSON.parse(await new Response(blob.stream).text()) as CoreState;
  } catch (error) {
    if (error instanceof Error && error.name === "BlobNotFoundError") return null;
    throw error;
  }
}

export async function readCoreState(): Promise<CoreState> {
  if (hasDatabaseUrl) {
    const database = await readDatabaseState();
    if (database) return database;
    const blob = await readBlobState();
    if (blob) { await writeCoreState(blob); return blob; }
  } else {
    const blob = await readBlobState();
    if (blob) return blob;
  }
  throw new Error("PERSISTENT_STATE_NOT_CONFIGURED");
}

export async function writeCoreState(state: CoreState) {
  if (hasDatabaseUrl) {
    await ensureStateTable();
    const value = JSON.stringify(state);
    await prisma.$executeRaw`INSERT INTO "PersistentAppState" ("key", "value", "updatedAt") VALUES ('default', ${value}::jsonb, NOW()) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()`;
    return;
  }
  if (!hasBlob) throw new Error("PERSISTENT_STATE_NOT_CONFIGURED");
  await put(blobPath, JSON.stringify(state, null, 2), { access: "private", allowOverwrite: true, cacheControlMaxAge: 60, contentType: "application/json", token: blobToken || undefined });
}

export function publicAccount(account: CoreAccount) {
  const { passwordHash: _passwordHash, passwordHistory: _passwordHistory, resetTokenHash: _resetTokenHash, failedLoginAttempts: _failedLoginAttempts, loginLockedUntil: _loginLockedUntil, ...safe } = account;
  return safe;
}

export async function findAccount(identifier: string) {
  const state = await readCoreState();
  const normalized = identifier.trim().toLowerCase();
  return state.accounts.find((account) => [account.id, account.username, account.email, account.name].some((value) => String(value).toLowerCase() === normalized)) ?? null;
}

export async function findPlan(planId: string) {
  const state = await readCoreState();
  return state.plans.find((plan) => plan.id === planId) ?? null;
}
