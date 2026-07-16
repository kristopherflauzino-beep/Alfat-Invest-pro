import { createHash, randomBytes } from "node:crypto";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const PENDING_REGISTRATION_TTL_MS = 24 * 60 * 60 * 1000;

export type PendingRegistrationStatus =
  | "awaiting_email_confirmation"
  | "awaiting_payment"
  | "payment_under_review"
  | "paid"
  | "activated"
  | "expired"
  | "cancelled"
  | "rejected";

export type PendingRegistration = {
  id: string;
  userId?: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  passwordHash: string;
  emailVerifiedAt?: string;
  continuationTokenHash?: string;
  acceptedTermsAt: string;
  acceptedPrivacyAt: string;
  acceptedMarketingAt?: string;
  planId: string;
  planName: string;
  planPriceInCents: number;
  durationDays: number;
  permissions: string[];
  status: PendingRegistrationStatus;
  paymentProvider: "mercado_pago";
  paymentLinkOpenedAt?: string;
  paymentReportedAt?: string;
  paymentConfirmedAt?: string;
  paymentName?: string;
  approximatePaymentDate?: string;
  transactionId?: string;
  customerNote?: string;
  paymentNotes?: string;
  adminNote?: string;
  confirmedByUserId?: string;
  activatedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type EmailVerificationTokenRecord = {
  id: string;
  pendingRegistrationId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  requestedAt: string;
  createdAt: string;
};

export type EmailVerificationRateEvent = {
  id: string;
  pendingRegistrationId?: string;
  emailHash: string;
  ipHash: string;
  createdAt: string;
};

export function createEmailVerificationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashEmailVerificationToken(token) };
}

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function emailVerificationTokenState(record: EmailVerificationTokenRecord | undefined, now = Date.now()) {
  if (!record) return "invalid" as const;
  if (record.usedAt) return "used" as const;
  if (new Date(record.expiresAt).getTime() <= now) return "expired" as const;
  return "valid" as const;
}

export function pendingRegistrationState(record: PendingRegistration, now = Date.now()) {
  if (["payment_under_review", "paid", "activated", "cancelled", "rejected"].includes(record.status)) return record.status;
  return new Date(record.expiresAt).getTime() <= now ? "expired" as const : record.status;
}

export function isPendingRegistration(value: unknown): value is PendingRegistration {
  return Boolean(value && typeof value === "object" && typeof (value as PendingRegistration).id === "string" && typeof (value as PendingRegistration).passwordHash === "string");
}

export function isEmailVerificationToken(value: unknown): value is EmailVerificationTokenRecord {
  return Boolean(value && typeof value === "object" && typeof (value as EmailVerificationTokenRecord).tokenHash === "string");
}

export function isEmailVerificationRateEvent(value: unknown): value is EmailVerificationRateEvent {
  return Boolean(value && typeof value === "object" && typeof (value as EmailVerificationRateEvent).emailHash === "string");
}
