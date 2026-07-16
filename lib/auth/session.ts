import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { blobToken, readCoreState, type CoreAccount } from "@/lib/server/core-state";

const COOKIE = "alfatec_session";
const SESSION_HOURS = 12;
export class AuthError extends Error { constructor(public status: number, message: string) { super(message); } }
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const secret = () => process.env.SESSION_SECRET || blobToken || "";

async function ensureSessionTable() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AppSession" ("id" TEXT PRIMARY KEY, "tokenHash" TEXT UNIQUE NOT NULL, "userId" TEXT NOT NULL, "userAgent" TEXT, "ipHash" TEXT, "expiresAt" TIMESTAMPTZ NOT NULL, "lastUsedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AppSession_userId_idx" ON "AppSession" ("userId")`);
}

function cookieValue(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? "";
}

function statelessToken(userId: string, expiresAt: Date) {
  const signingSecret = secret();
  if (!signingSecret) throw new AuthError(503, "Sessao segura nao configurada.");
  const payload = Buffer.from(JSON.stringify({ userId, exp: expiresAt.getTime(), nonce: randomBytes(12).toString("hex") })).toString("base64url");
  const signature = createHmac("sha256", signingSecret).update(payload).digest("base64url");
  return `stateless.${payload}.${signature}`;
}

function verifyStateless(token: string) {
  const signingSecret = secret(); const [, payload, signature] = token.split(".");
  if (!signingSecret || !payload || !signature) return null;
  const expected = createHmac("sha256", signingSecret).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try { const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: string; exp?: number }; return decoded.userId && decoded.exp && decoded.exp > Date.now() ? decoded : null; } catch { return null; }
}

export async function createSession(userId: string, request: Request) {
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  if (!hasDatabaseUrl) return { token: statelessToken(userId, expiresAt), expiresAt };
  await ensureSessionTable();
  const token = randomBytes(32).toString("base64url");
  const id = crypto.randomUUID();
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 300);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = ip && secret() ? createHmac("sha256", secret()).update(ip).digest("hex") : null;
  await prisma.$executeRaw`INSERT INTO "AppSession" ("id", "tokenHash", "userId", "userAgent", "ipHash", "expiresAt", "lastUsedAt", "createdAt") VALUES (${id}, ${hash(token)}, ${userId}, ${userAgent || null}, ${ipHash}, ${expiresAt}, NOW(), NOW())`;
  return { token, expiresAt };
}

export function attachSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
  return response;
}

export async function clearSession(request: Request, response: NextResponse) {
  const token = cookieValue(request);
  if (token && hasDatabaseUrl && !token.startsWith("stateless.")) { await ensureSessionTable(); await prisma.$executeRaw`DELETE FROM "AppSession" WHERE "tokenHash" = ${hash(token)}`; }
  response.cookies.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}

export async function revokeUserSessions(userId: string) {
  if (!hasDatabaseUrl) return;
  await ensureSessionTable();
  await prisma.$executeRaw`DELETE FROM "AppSession" WHERE "userId" = ${userId}`;
}

export async function sessionUserId(request: Request) {
  const token = cookieValue(request); if (!token) return null;
  if (token.startsWith("stateless.")) return verifyStateless(token)?.userId ?? null;
  if (!hasDatabaseUrl) return null;
  await ensureSessionTable();
  const rows = await prisma.$queryRaw<Array<{ userId: string }>>`SELECT "userId" FROM "AppSession" WHERE "tokenHash" = ${hash(token)} AND "expiresAt" > NOW() LIMIT 1`;
  if (rows[0]) await prisma.$executeRaw`UPDATE "AppSession" SET "lastUsedAt" = NOW() WHERE "tokenHash" = ${hash(token)}`;
  return rows[0]?.userId ?? null;
}

export async function requireAccount(request: Request): Promise<CoreAccount> {
  const userId = await sessionUserId(request);
  if (!userId) throw new AuthError(401, "Sessao invalida ou expirada.");
  const state = await readCoreState();
  const account = state.accounts.find((item) => item.id === userId);
  if (!account) throw new AuthError(401, "Sessao invalida ou expirada.");
  if (account.status === "pendente") throw new AuthError(403, "Conta aguardando liberacao do administrador.");
  return account;
}

export async function requireAdmin(request: Request) {
  const account = await requireAccount(request);
  if (account.role !== "ADMIN") throw new AuthError(403, "Acao permitida somente ao administrador.");
  return account;
}

export type AdminPermission = "manage_user_name" | "manage_user_email";
const adminPermissions: AdminPermission[] = ["manage_user_name", "manage_user_email"];

export async function requireAdminPermission(request: Request, permission: AdminPermission) {
  const account = await requireAdmin(request);
  const explicitPermissions = account.permissions.filter((item): item is AdminPermission =>
    adminPermissions.includes(item as AdminPermission)
  );
  if (explicitPermissions.length > 0 && !explicitPermissions.includes(permission)) {
    throw new AuthError(403, "Permissao administrativa insuficiente.");
  }
  return account;
}
export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "Nao foi possivel validar a sessao." }, { status: 500 });
}
