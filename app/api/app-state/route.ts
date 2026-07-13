import { get, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type AppStatePayload = {
  accounts: unknown[];
  plans: unknown[];
  payments: unknown[];
  portfolio: unknown[];
  planPriceHistory: unknown[];
  grahamSettings: Record<string, unknown>;
  auditLogs: unknown[];
};

const allClientModules = ["dashboard", "mercado", "oportunidades", "comparador", "carteira", "radar", "relatorios", "graham_valuation", "plano", "configuracoes"];
const appStateBlobPath = process.env.APP_STATE_BLOB_PATH || "alfatec-invest-pro/app-state.json";
const defaultGrahamSettings = { defaultY: 5.5, minGrowth: 0, maxGrowth: 20, scoreWeight: 10, enabled: true, clientsCanEditGrowth: true, clientsCanEditY: false };

const defaultState: AppStatePayload = {
  accounts: [
    {
      id: "admin-flauzino",
      role: "ADMIN",
      username: "Flauzino",
      email: "admin@alfatec.local",
      name: "Flauzino",
      passwordHash: "cc5c75de95387000d28fce6a21f4d8c4ff8560b1b37e73d39eb63c3029697db5",
      status: "ativo",
      createdAt: new Date().toISOString().slice(0, 10),
      permissions: allClientModules
    },
    {
      id: "client-tutu",
      role: "CLIENTE",
      username: "Tutu",
      email: "arthurcruz@gmail.com",
      name: "Tutu",
      phone: "",
      passwordHash: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
      planId: "semanal",
      planValue: 9.9,
      status: "ativo",
      createdAt: new Date().toISOString().slice(0, 10),
      dueDate: "2026-07-20",
      notes: "Cliente preservado do cadastro existente.",
      planStartedAt: new Date().toISOString().slice(0, 10),
      permissions: allClientModules
    }
  ],
  plans: [
    { id: "semanal", name: "Semanal", value: 9.9, durationDays: 7, status: "ativo", permissions: allClientModules },
    { id: "mensal", name: "Mensal", value: 24.9, durationDays: 30, status: "ativo", permissions: allClientModules },
    { id: "anual", name: "Anual", value: 199.9, durationDays: 365, status: "ativo", permissions: allClientModules }
  ],
  payments: [],
  portfolio: [],
  planPriceHistory: [],
  grahamSettings: defaultGrahamSettings,
  auditLogs: []
};

function findEnvBySuffix(suffix: string, validator: (value: string) => boolean = (value) => value.trim() !== "") {
  const directValue = process.env[suffix];
  if (directValue && validator(directValue)) return directValue;
  const matchingKey = Object.keys(process.env).find((key) => key.endsWith(`_${suffix}`) && validator(process.env[key] || ""));
  return matchingKey ? process.env[matchingKey] || "" : "";
}

const blobReadWriteToken =
  findEnvBySuffix("BLOB_READ_WRITE_TOKEN", (value) => value.startsWith("vercel_blob_rw_")) ||
  findEnvBySuffix("READ_WRITE_TOKEN", (value) => value.startsWith("vercel_blob_rw_"));
const connectedBlobStoreId = findEnvBySuffix("BLOB_STORE_ID") || findEnvBySuffix("STORE_ID");

if (blobReadWriteToken && !process.env.BLOB_READ_WRITE_TOKEN) process.env.BLOB_READ_WRITE_TOKEN = blobReadWriteToken;
if (connectedBlobStoreId && !process.env.BLOB_STORE_ID) process.env.BLOB_STORE_ID = connectedBlobStoreId;

const hasBlobStorage = Boolean(
  blobReadWriteToken ||
  (connectedBlobStoreId && (process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL === "1"))
);

function stringField(value: unknown, key: string) {
  if (!value || typeof value !== "object") return "";
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field.toLowerCase() : "";
}

function mergeDefaultAccounts(accounts: unknown[]) {
  const merged = [...accounts];
  defaultState.accounts.forEach((defaultAccount) => {
    const defaultId = stringField(defaultAccount, "id");
    const defaultEmail = stringField(defaultAccount, "email");
    const exists = merged.some((account) =>
      stringField(account, "id") === defaultId ||
      stringField(account, "email") === defaultEmail
    );
    if (!exists) merged.push(defaultAccount);
  });
  return merged;
}

function normalizeState(value: unknown): AppStatePayload {
  const input = value && typeof value === "object" ? value as Partial<AppStatePayload> : {};
  return {
    accounts: mergeDefaultAccounts(Array.isArray(input.accounts) ? input.accounts : []),
    plans: Array.isArray(input.plans) && input.plans.length > 0 ? input.plans : defaultState.plans,
    payments: Array.isArray(input.payments) ? input.payments : [],
    portfolio: Array.isArray(input.portfolio) ? input.portfolio : [],
    planPriceHistory: Array.isArray(input.planPriceHistory) ? input.planPriceHistory : [],
    grahamSettings: input.grahamSettings && typeof input.grahamSettings === "object" ? { ...defaultGrahamSettings, ...input.grahamSettings } : defaultGrahamSettings,
    auditLogs: Array.isArray(input.auditLogs) ? input.auditLogs : []
  };
}

function statesDiffer(a: unknown, b: unknown) {
  return JSON.stringify(a) !== JSON.stringify(b);
}


function requestOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    const isSameHost = originUrl.host === requestUrl.host;
    const isLocalhost = ["localhost", "127.0.0.1"].includes(originUrl.hostname);
    const isVercel = originUrl.hostname.endsWith(".vercel.app");
    return isSameHost || (process.env.NODE_ENV !== "production" && isLocalhost) || isVercel;
  } catch {
    return false;
  }
}

function requestTooLarge(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(contentLength) && contentLength > 1_000_000;
}

function storageProvider() {
  if (hasDatabaseUrl) return "postgres";
  if (hasBlobStorage) return "vercel-blob";
  return "not-configured";
}

function storageNotConfiguredResponse() {
  return NextResponse.json({
    error: "Banco de dados permanente não configurado. Vincule um Vercel Blob Store ao projeto ou configure DATABASE_URL, POSTGRES_PRISMA_URL ou POSTGRES_URL na Vercel."
  }, { status: 503 });
}

async function ensureTable() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "PersistentAppState" (
    "key" TEXT PRIMARY KEY,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

async function readPostgresState() {
  await ensureTable();
  const rows = await prisma.$queryRaw<Array<{ value: unknown }>>`SELECT "value" FROM "PersistentAppState" WHERE "key" = 'default' LIMIT 1`;
  if (rows[0]?.value) {
    const state = normalizeState(rows[0].value);
    if (statesDiffer(state, rows[0].value)) await writePostgresState(state);
    return state;
  }
  const state = normalizeState(defaultState);
  await writePostgresState(state);
  return state;
}

async function writePostgresState(state: AppStatePayload) {
  await ensureTable();
  const stateJson = JSON.stringify(normalizeState(state));
  await prisma.$executeRaw`INSERT INTO "PersistentAppState" ("key", "value", "updatedAt")
    VALUES ('default', ${stateJson}::jsonb, NOW())
    ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()`;
}

async function readBlobState() {
  try {
    const blob = await get(appStateBlobPath, {
      access: "private",
      token: blobReadWriteToken || undefined,
      useCache: false
    });
    if (blob?.stream) {
      const text = await new Response(blob.stream).text();
      const state = normalizeState(JSON.parse(text));
      if (statesDiffer(state, JSON.parse(text))) await writeBlobState(state);
      return state;
    }
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "BlobNotFoundError") throw error;
  }

  const state = normalizeState(defaultState);
  await writeBlobState(state);
  return state;
}

async function writeBlobState(state: AppStatePayload) {
  await put(appStateBlobPath, JSON.stringify(normalizeState(state), null, 2), {
    access: "private",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: "application/json",
    token: blobReadWriteToken || undefined
  });
}

async function readState() {
  if (hasDatabaseUrl) return readPostgresState();
  if (hasBlobStorage) return readBlobState();
  throw new Error("PERSISTENT_STORAGE_NOT_CONFIGURED");
}

async function writeState(state: AppStatePayload) {
  if (hasDatabaseUrl) return writePostgresState(state);
  if (hasBlobStorage) return writeBlobState(state);
  throw new Error("PERSISTENT_STORAGE_NOT_CONFIGURED");
}

export async function GET() {
  if (storageProvider() === "not-configured") return storageNotConfiguredResponse();

  try {
    const response = NextResponse.json(await readState());
    response.headers.set("x-alfatec-storage", storageProvider());
    return response;
  } catch (error) {
    console.error("Erro ao carregar estado persistente", error);
    return NextResponse.json({ error: "Não foi possível carregar os dados do banco permanente." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (storageProvider() === "not-configured") return storageNotConfiguredResponse();
  if (!requestOriginAllowed(request)) return NextResponse.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
  if (requestTooLarge(request)) return NextResponse.json({ error: "Solicitação muito grande." }, { status: 413 });

  try {
    const body = normalizeState(await request.json());
    await writeState(body);
    return NextResponse.json({ ok: true, provider: storageProvider(), updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Erro ao salvar estado persistente", error);
    return NextResponse.json({ error: "Não foi possível salvar os dados no banco permanente." }, { status: 500 });
  }
}
