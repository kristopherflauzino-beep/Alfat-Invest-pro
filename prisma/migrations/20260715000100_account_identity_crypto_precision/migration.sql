ALTER TABLE "UserPortfolio"
  ALTER COLUMN "quantity" TYPE DECIMAL(40, 22) USING "quantity"::numeric,
  ALTER COLUMN "averagePrice" TYPE DECIMAL(40, 22) USING "averagePrice"::numeric;

ALTER TABLE "AppUser"
  ADD COLUMN IF NOT EXISTS "nameChangeCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nameChangedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "emailChangedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS "EmailChangeToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "newEmail" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "requestedAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "EmailChangeToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailChangeToken_tokenHash_key" ON "EmailChangeToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailChangeToken_userId_createdAt_idx" ON "EmailChangeToken"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailChangeToken_expiresAt_idx" ON "EmailChangeToken"("expiresAt");
CREATE TABLE IF NOT EXISTS "EmailDelivery" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "recipient" TEXT NOT NULL,
  "recipientMasked" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMPTZ,
  "sentAt" TIMESTAMPTZ,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailDelivery_idempotencyKey_key" ON "EmailDelivery"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "EmailDelivery_status_createdAt_idx" ON "EmailDelivery"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "PendingRegistration" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "passwordHash" TEXT NOT NULL,
  "emailVerifiedAt" TIMESTAMPTZ,
  "continuationTokenHash" TEXT,
  "acceptedTermsAt" TIMESTAMPTZ NOT NULL,
  "acceptedPrivacyAt" TIMESTAMPTZ NOT NULL,
  "acceptedMarketingAt" TIMESTAMPTZ,
  "planId" TEXT NOT NULL,
  "planName" TEXT NOT NULL,
  "planPriceInCents" INTEGER NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "permissions" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "paymentProvider" TEXT NOT NULL DEFAULT 'mercado_pago',
  "paymentLinkOpenedAt" TIMESTAMPTZ,
  "paymentReportedAt" TIMESTAMPTZ,
  "paymentConfirmedAt" TIMESTAMPTZ,
  "paymentName" TEXT,
  "approximatePaymentDate" TIMESTAMPTZ,
  "transactionId" TEXT,
  "customerNote" TEXT,
  "paymentNotes" TEXT,
  "adminNote" TEXT,
  "confirmedByUserId" TEXT,
  "activatedAt" TIMESTAMPTZ,
  "rejectedAt" TIMESTAMPTZ,
  "cancelledAt" TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PendingRegistration_continuationTokenHash_key" ON "PendingRegistration"("continuationTokenHash");
CREATE INDEX IF NOT EXISTS "PendingRegistration_email_status_idx" ON "PendingRegistration"("email", "status");
CREATE INDEX IF NOT EXISTS "PendingRegistration_username_status_idx" ON "PendingRegistration"("username", "status");
CREATE INDEX IF NOT EXISTS "PendingRegistration_expiresAt_idx" ON "PendingRegistration"("expiresAt");

CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
  "id" TEXT NOT NULL,
  "pendingRegistrationId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "requestedAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_pendingRegistrationId_createdAt_idx" ON "EmailVerificationToken"("pendingRegistrationId", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");
