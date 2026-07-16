import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth/session";
import { isPendingRegistration, pendingRegistrationState } from "@/lib/auth/email-verification";
import { readCoreState } from "@/lib/server/core-state";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const state = await readCoreState();
    const registrations = (Array.isArray(state.pendingRegistrations) ? state.pendingRegistrations : [])
      .filter(isPendingRegistration)
      .map((item) => ({
        id: item.id,
        name: item.name,
        username: item.username,
        email: item.email,
        phone: item.phone,
        emailVerifiedAt: item.emailVerifiedAt,
        planId: item.planId,
        planName: item.planName,
        planPriceInCents: item.planPriceInCents,
        durationDays: item.durationDays,
        status: pendingRegistrationState(item),
        paymentLinkOpenedAt: item.paymentLinkOpenedAt,
        paymentReportedAt: item.paymentReportedAt,
        paymentName: item.paymentName,
        approximatePaymentDate: item.approximatePaymentDate,
        transactionId: item.transactionId,
        customerNote: item.customerNote,
        paymentConfirmedAt: item.paymentConfirmedAt,
        adminNote: item.adminNote,
        activatedAt: item.activatedAt,
        expiresAt: item.expiresAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return NextResponse.json({ registrations }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
