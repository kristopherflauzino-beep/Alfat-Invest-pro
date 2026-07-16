import { createHash, randomBytes } from "node:crypto";

export const EMAIL_CHANGE_TTL_MS = 30 * 60 * 1000;
export const NAME_CHANGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const NAME_CHANGE_LIMIT = 3;

export type EmailChangeTokenRecord = {
  id: string;
  userId: string;
  newEmail: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  requestedAt: string;
  requestIpHash?: string;
  createdAt: string;
};

export type EmailChangeRateEvent = {
  id: string;
  userId: string;
  ipHash: string;
  createdAt: string;
};

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeAccountName(value: string) {
  const name = value.trim();
  if (name.length < 2 || name.length > 120) {
    return { ok: false as const, error: "O nome deve possuir entre 2 e 120 caracteres." };
  }
  if (/[\u0000-\u001f\u007f<>]/u.test(name)) {
    return { ok: false as const, error: "O nome contém caracteres não permitidos." };
  }
  return { ok: true as const, value: name };
}

export function createEmailChangeToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashEmailChangeToken(token) };
}

export function hashEmailChangeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function emailChangeTokenState(record: EmailChangeTokenRecord | undefined, now = Date.now()) {
  if (!record) return "invalid" as const;
  if (record.usedAt) return "used" as const;
  if (new Date(record.expiresAt).getTime() <= now) return "expired" as const;
  return "valid" as const;
}

export function recentNameChanges(history: unknown, now = Date.now()) {
  const cutoff = now - NAME_CHANGE_WINDOW_MS;
  return (Array.isArray(history) ? history : [])
    .filter((value): value is string => typeof value === "string")
    .filter((value) => {
      const timestamp = new Date(value).getTime();
      return Number.isFinite(timestamp) && timestamp > cutoff;
    });
}

export function isEmailChangeToken(value: unknown): value is EmailChangeTokenRecord {
  return Boolean(value && typeof value === "object" && typeof (value as EmailChangeTokenRecord).tokenHash === "string");
}

export function isEmailChangeRateEvent(value: unknown): value is EmailChangeRateEvent {
  return Boolean(value && typeof value === "object" && typeof (value as EmailChangeRateEvent).userId === "string");
}
