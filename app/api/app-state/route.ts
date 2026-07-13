import { NextResponse } from "next/server";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type AppStatePayload = {
  accounts: unknown[];
  plans: unknown[];
  payments: unknown[];
  portfolio: unknown[];
};

const allClientModules = ["dashboard", "mercado", "oportunidades", "comparador", "carteira", "radar", "relatorios", "configuracoes"];

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
      permissions: allClientModules
    }
  ],
  plans: [
    { id: "semanal", name: "Semanal", value: 9.9, durationDays: 7, status: "ativo", permissions: allClientModules },
    { id: "mensal", name: "Mensal", value: 24.9, durationDays: 30, status: "ativo", permissions: allClientModules },
    { id: "anual", name: "Anual", value: 199.9, durationDays: 365, status: "ativo", permissions: allClientModules }
  ],
  payments: [],
  portfolio: []
};

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
    portfolio: Array.isArray(input.portfolio) ? input.portfolio : []
  };
}

async function ensureTable() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "PersistentAppState" (
    "key" TEXT PRIMARY KEY,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

async function readState() {
  await ensureTable();
  const rows = await prisma.$queryRaw<Array<{ value: unknown }>>`SELECT "value" FROM "PersistentAppState" WHERE "key" = 'default' LIMIT 1`;
  if (rows[0]?.value) {
    const state = normalizeState(rows[0].value);
    if (JSON.stringify(state) !== JSON.stringify(rows[0].value)) await writeState(state);
    return state;
  }
  const state = normalizeState(defaultState);
  await writeState(state);
  return state;
}

async function writeState(state: AppStatePayload) {
  await ensureTable();
  const stateJson = JSON.stringify(normalizeState(state));
  await prisma.$executeRaw`INSERT INTO "PersistentAppState" ("key", "value", "updatedAt")
    VALUES ('default', ${stateJson}::jsonb, NOW())
    ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()`;
}

export async function GET() {
  if (!hasDatabaseUrl) {
    return NextResponse.json({ error: "Banco de dados não configurado. Configure DATABASE_URL, POSTGRES_PRISMA_URL ou POSTGRES_URL na Vercel." }, { status: 503 });
  }

  try {
    return NextResponse.json(await readState());
  } catch (error) {
    console.error("Erro ao carregar estado persistente", error);
    return NextResponse.json({ error: "Não foi possível carregar os dados do banco." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!hasDatabaseUrl) {
    return NextResponse.json({ error: "Banco de dados não configurado. Configure DATABASE_URL, POSTGRES_PRISMA_URL ou POSTGRES_URL na Vercel." }, { status: 503 });
  }

  try {
    const body = normalizeState(await request.json());
    await writeState(body);
    return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Erro ao salvar estado persistente", error);
    return NextResponse.json({ error: "Não foi possível salvar os dados no banco." }, { status: 500 });
  }
}
