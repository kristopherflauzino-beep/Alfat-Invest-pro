import { NextResponse } from "next/server";
import {
  hashEmailVerificationToken,
  isPendingRegistration,
  pendingRegistrationState
} from "@/lib/auth/email-verification";
import { readCoreState } from "@/lib/server/core-state";

export const runtime = "nodejs";

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  return (local?.slice(0, 1) || "*") + "***@" + (domain || "");
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (token.length < 32 || token.length > 256) return NextResponse.json({ error: "Cadastro não encontrado." }, { status: 404 });
  try {
    const state = await readCoreState();
    const hash = hashEmailVerificationToken(token);
    const registration = (Array.isArray(state.pendingRegistrations) ? state.pendingRegistrations : [])
      .filter(isPendingRegistration)
      .find((item) => item.continuationTokenHash === hash);
    if (!registration) return NextResponse.json({ error: "Cadastro não encontrado." }, { status: 404 });
    const status = pendingRegistrationState(registration);
    return NextResponse.json({
      registration: {
        id: registration.id,
        name: registration.name,
        emailMasked: maskEmail(registration.email),
        planId: registration.planId,
        planName: registration.planName,
        planPriceInCents: registration.planPriceInCents,
        durationDays: registration.durationDays,
        status,
        emailVerifiedAt: registration.emailVerifiedAt,
        paymentLinkOpenedAt: registration.paymentLinkOpenedAt,
        paymentReportedAt: registration.paymentReportedAt,
        activatedAt: registration.activatedAt,
        expiresAt: registration.expiresAt
      }
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar o cadastro." }, { status: 500 });
  }
}
