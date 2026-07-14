import { get, put } from "@vercel/blob";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { revokeUserSessions, sessionUserId } from "@/lib/auth/session";

export const runtime = "nodejs";

type AppStatePayload = {
  accounts: unknown[];
  plans: unknown[];
  payments: unknown[];
  portfolio: unknown[];
  planPriceHistory: unknown[];
  grahamSettings: Record<string, unknown>;
  fiiSettings: Record<string, unknown>;
  cryptoSettings: Record<string, unknown>;
  subscriptionRequests: unknown[];
  portfolioProfiles: unknown[];
  auditLogs: unknown[];
};

const allClientModules = ["dashboard", "mercado", "oportunidades", "comparador", "carteira", "alfatec_portfolio_method", "radar", "relatorios", "graham_valuation", "alfatec_fiis", "alfatec_crypto_method", "plano", "configuracoes"];
const appStateBlobPath = process.env.APP_STATE_BLOB_PATH || "alfatec-invest-pro/app-state.json";
const defaultGrahamSettings = { defaultY: 5.5, minGrowth: 0, maxGrowth: 20, scoreWeight: 10, enabled: true, clientsCanEditGrowth: true, clientsCanEditY: false };
const defaultFiiWeights = { qualidade: 20, renda: 18, risco: 16, valuation: 14, gestao: 12, liquidez: 6, diversificacao: 14 };
const defaultFiiSettings = { enabled: true, referenceRate: 6.5, referenceRateSource: "Parametro configurado pelo administrador", minimumConfidence: "Media", weightsByKind: { tijolo: { qualidade: 20, renda: 20, risco: 15, valuation: 15, gestao: 10, liquidez: 5, diversificacao: 15 }, renda_urbana: { qualidade: 20, renda: 20, risco: 15, valuation: 15, gestao: 10, liquidez: 5, diversificacao: 15 }, papel: { qualidade: 25, renda: 15, risco: 20, valuation: 10, gestao: 10, liquidez: 5, diversificacao: 15 }, fof: { qualidade: 25, renda: 15, risco: 10, valuation: 15, gestao: 20, liquidez: 5, diversificacao: 10 }, hibrido: defaultFiiWeights, desenvolvimento: { qualidade: 20, renda: 10, risco: 25, valuation: 15, gestao: 15, liquidez: 5, diversificacao: 10 }, infraestrutura: { qualidade: 20, renda: 20, risco: 15, valuation: 15, gestao: 10, liquidez: 5, diversificacao: 15 }, outro: { qualidade: 18, renda: 18, risco: 18, valuation: 16, gestao: 10, liquidez: 8, diversificacao: 12 } } };
const genericCryptoWeights = { fundamentals: 25, network: 20, tokenomics: 15, security: 15, market: 10, development: 5, onChainValuation: 5, risk: 5 };
const cryptoCategories = ["monetary", "payment", "smart_contract", "infrastructure", "interoperability", "oracle", "defi", "governance", "exchange", "layer_1", "layer_2", "stablecoin", "rwa", "ai", "gaming", "nft", "memecoin", "other"];
const defaultCryptoSettings = { enabled: true, minimumConfidence: "Baixa", weightsByCategory: Object.fromEntries(cryptoCategories.map((category) => [category, genericCryptoWeights])) };

const defaultState: AppStatePayload = {
  accounts: [
    {
      id: "admin-flauzino",
      role: "ADMIN",
      username: "Flauzino",
      email: "admin@alfatec.local",
      name: "Flauzino",
      passwordHash: bcrypt.hashSync(process.env.ADMIN_BOOTSTRAP_PASSWORD || randomBytes(32).toString("base64url"), 12),
      status: "ativo",
      createdAt: new Date().toISOString().slice(0, 10),
      permissions: allClientModules
    },
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
  fiiSettings: defaultFiiSettings,
  cryptoSettings: defaultCryptoSettings,
  subscriptionRequests: [],
  portfolioProfiles: [],
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
    fiiSettings: input.fiiSettings && typeof input.fiiSettings === "object" ? { ...defaultFiiSettings, ...input.fiiSettings } : defaultFiiSettings,
    cryptoSettings: input.cryptoSettings && typeof input.cryptoSettings === "object" ? { ...defaultCryptoSettings, ...input.cryptoSettings } : defaultCryptoSettings,
    subscriptionRequests: Array.isArray(input.subscriptionRequests) ? input.subscriptionRequests : [],
    portfolioProfiles: Array.isArray(input.portfolioProfiles) ? input.portfolioProfiles : [],
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
    return isSameHost || (process.env.NODE_ENV !== "production" && isLocalhost);
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

export async function GET(request: Request) {
  if (storageProvider() === "not-configured") return storageNotConfiguredResponse();
  try {
    const state = await readState();
    const userId = await sessionUserId(request);
    const current = state.accounts.find((item) => stringField(item, "id") === userId?.toLowerCase());
    const role = current && typeof current === "object" ? String((current as Record<string, unknown>).role ?? "") : "";
    const withoutHashes = (items: unknown[]) => items.map((item) => item && typeof item === "object" ? { ...(item as Record<string, unknown>), passwordHash: "" } : item);
    const ownPortfolio = userId ? state.portfolio.filter((item) => {
      const owner = stringField(item, "userId");
      return owner === userId.toLowerCase() || (role === "ADMIN" && !owner);
    }).map((item) => item && typeof item === "object" ? Object.fromEntries(Object.entries(item as Record<string, unknown>).filter(([key]) => key !== "userId")) : item) : [];
    const internalFreeState = { ...state, subscriptionRequests: [], portfolioProfiles: [] };
    const safeState = !userId
      ? { ...internalFreeState, accounts: [], payments: [], portfolio: [], planPriceHistory: [], auditLogs: [] }
      : role === "ADMIN"
        ? { ...internalFreeState, accounts: withoutHashes(state.accounts), portfolio: ownPortfolio }
        : { ...internalFreeState, accounts: withoutHashes(current ? [current] : []), payments: state.payments.filter((item) => stringField(item, "clientId") === userId.toLowerCase()), portfolio: ownPortfolio, planPriceHistory: [], auditLogs: [] };
    const response = NextResponse.json(safeState);
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
  const userId = await sessionUserId(request);
  if (!userId) return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
  try {
    const current = await readState();
    const actor = current.accounts.find((item) => stringField(item, "id") === userId.toLowerCase());
    if (!actor || typeof actor !== "object") return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    const role = String((actor as Record<string, unknown>).role ?? "");
    const incoming = normalizeState(await request.json());
    let body: AppStatePayload;
    if (role === "ADMIN") {
      const currentById = new Map(current.accounts.map((item) => [stringField(item, "id"), item]));
      const otherPortfolios = current.portfolio.filter((item) => { const owner = stringField(item, "userId"); return owner && owner !== userId.toLowerCase(); });
      const ownPortfolio = incoming.portfolio.map((item) => item && typeof item === "object" ? { ...(item as Record<string, unknown>), userId } : item);
      body = { ...incoming, accounts: incoming.accounts.filter((item) => currentById.has(stringField(item, "id"))).map((item) => item && typeof item === "object" ? { ...(item as Record<string, unknown>), passwordHash: String((currentById.get(stringField(item, "id")) as Record<string, unknown> | undefined)?.passwordHash ?? "") } : item), portfolio: [...otherPortfolios, ...ownPortfolio], subscriptionRequests: current.subscriptionRequests, portfolioProfiles: current.portfolioProfiles };
    } else {
      const requestedAccount = incoming.accounts.find((item) => stringField(item, "id") === userId.toLowerCase());
      const accounts = current.accounts.map((item) => {
        if (stringField(item, "id") !== userId.toLowerCase() || !item || typeof item !== "object" || !requestedAccount || typeof requestedAccount !== "object") return item;
        const safe = requestedAccount as Record<string, unknown>;
        const existing = item as Record<string, unknown>;
        return { ...existing, name: safe.name ?? existing.name, email: safe.email ?? existing.email, phone: safe.phone ?? existing.phone, passwordHash: String(safe.passwordHash ?? "") || existing.passwordHash };
      });
      const otherPortfolios = current.portfolio.filter((item) => stringField(item, "userId") !== userId.toLowerCase());
      const ownPortfolio = incoming.portfolio.map((item) => item && typeof item === "object" ? { ...(item as Record<string, unknown>), userId } : item);
      body = { ...current, accounts, portfolio: [...otherPortfolios, ...ownPortfolio] };
    }
    await writeState(body);
    if (role === "ADMIN") {
      const previousById = new Map(current.accounts.map((item) => [stringField(item, "id"), item as Record<string, unknown>]));
      for (const item of body.accounts) {
        const before = previousById.get(stringField(item, "id")); const after = item as Record<string, unknown>;
        if (before && (before.status !== after.status || before.role !== after.role) && after.status !== "ativo") await revokeUserSessions(String(after.id));
      }
    }
    return NextResponse.json({ ok: true, provider: storageProvider(), updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Erro ao salvar estado persistente", error);
    return NextResponse.json({ error: "Não foi possível salvar os dados no banco permanente." }, { status: 500 });
  }
}
