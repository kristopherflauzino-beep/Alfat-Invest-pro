import { NextResponse } from "next/server";
import { z } from "zod";
import { hashRateLimitValue } from "@/lib/auth/password-reset";
import {
  EMAIL_VERIFICATION_TTL_MS,
  PENDING_REGISTRATION_TTL_MS,
  createEmailVerificationToken,
  isEmailVerificationRateEvent,
  isEmailVerificationToken,
  isPendingRegistration,
  pendingRegistrationState,
  type EmailVerificationRateEvent,
  type EmailVerificationTokenRecord
} from "@/lib/auth/email-verification";
import { sendEmail } from "@/lib/email/email-service";
import { registrationConfirmationEmail } from "@/lib/email/templates/registration";
import { officialAppUrl } from "@/lib/email/templates/base";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.object({ email: z.string().trim().email().max(254) }).strict();
const genericMessage = "Se existir um cadastro pendente para esse endereço, enviaremos uma nova confirmação.";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: genericMessage });
    const state = await readCoreState();
    const now = new Date();
    const email = parsed.data.email.toLowerCase();
    const pepper = process.env.SESSION_SECRET || "registration";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = hashRateLimitValue(pepper + "|verification-ip|" + ip);
    const emailHash = hashRateLimitValue(pepper + "|verification-email|" + email);
    const cutoff = now.getTime() - 60 * 60 * 1000;
    const rateEvents = (Array.isArray(state.emailVerificationRateEvents) ? state.emailVerificationRateEvents : [])
      .filter(isEmailVerificationRateEvent)
      .filter((item) => new Date(item.createdAt).getTime() > cutoff);
    if (rateEvents.filter((item) => item.emailHash === emailHash).length >= 3 || rateEvents.filter((item) => item.ipHash === ipHash).length >= 10) {
      return NextResponse.json({ message: genericMessage }, { status: 202, headers: { "Retry-After": "3600" } });
    }
    const registrations = (Array.isArray(state.pendingRegistrations) ? state.pendingRegistrations : []).filter(isPendingRegistration);
    const index = registrations.findIndex((item) =>
      item.email === email &&
      item.status === "awaiting_email_confirmation" &&
      pendingRegistrationState(item, now.getTime()) !== "expired"
    );
    if (index < 0) return NextResponse.json({ message: genericMessage }, { status: 202 });

    const registration = registrations[index];
    const generated = createEmailVerificationToken();
    const token: EmailVerificationTokenRecord = {
      id: crypto.randomUUID(),
      pendingRegistrationId: registration.id,
      tokenHash: generated.tokenHash,
      expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
      requestedAt: now.toISOString(),
      createdAt: now.toISOString()
    };
    const tokens = (Array.isArray(state.emailVerificationTokens) ? state.emailVerificationTokens : []).filter(isEmailVerificationToken);
    state.emailVerificationTokens = [
      token,
      ...tokens.map((item) =>
        item.pendingRegistrationId === registration.id && !item.usedAt ? { ...item, usedAt: now.toISOString() } : item
      )
    ].slice(0, 5000);
    registrations[index] = {
      ...registration,
      expiresAt: new Date(now.getTime() + PENDING_REGISTRATION_TTL_MS).toISOString(),
      updatedAt: now.toISOString()
    };
    state.pendingRegistrations = registrations;
    const accountIndex = state.accounts.findIndex((item) =>
      item.id === registration.userId ||
      item.email.toLowerCase() === registration.email ||
      item.username.toLowerCase() === registration.username
    );
    const accountId = accountIndex >= 0 ? state.accounts[accountIndex].id : registration.userId || registration.id;
    if (accountIndex >= 0) {
      state.accounts[accountIndex] = {
        ...state.accounts[accountIndex],
        registrationStatus: "awaiting_email_confirmation",
        registrationExpiresAt: registrations[index].expiresAt
      };
    }
    const event: EmailVerificationRateEvent = { id: crypto.randomUUID(), pendingRegistrationId: registration.id, emailHash, ipHash, createdAt: now.toISOString() };
    state.emailVerificationRateEvents = [event, ...rateEvents].slice(0, 5000);
    await writeCoreState(state);

    const confirmationUrl = officialAppUrl() + "/confirmar-email?token=" + encodeURIComponent(generated.token);
    const template = registrationConfirmationEmail({ name: registration.name, confirmationUrl, planName: registration.planName });
    await sendEmail({
      to: registration.email,
      ...template,
      userId: accountId,
      type: "registration_confirmation_resend",
      idempotencyKey: "registration-confirmation-resend:" + token.id
    });
    return NextResponse.json({ message: genericMessage }, { status: 202 });
  } catch (error) {
    return requestErrorResponse(error);
  }
}
