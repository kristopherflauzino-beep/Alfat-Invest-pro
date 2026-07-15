import { createHash, randomBytes } from "node:crypto";

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;

export type PasswordResetTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  requestedAt: string;
  requestIpHash?: string;
  attempts: number;
  createdAt: string;
};

export type PasswordResetRateEvent = {
  id: string;
  emailHash: string;
  ipHash: string;
  createdAt: string;
};

export function createPasswordResetToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashRateLimitValue(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function resetTokenState(record: PasswordResetTokenRecord | undefined, now = Date.now()) {
  if (!record) return "invalid" as const;
  if (record.usedAt) return "used" as const;
  if (record.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) return "blocked" as const;
  if (new Date(record.expiresAt).getTime() <= now) return "expired" as const;
  return "valid" as const;
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return local.slice(0, 1) + "***@" + domain;
}