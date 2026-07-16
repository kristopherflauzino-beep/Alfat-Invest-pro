import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireAdmin } from "@/lib/auth/session";
import { isPendingRegistration, pendingRegistrationState } from "@/lib/auth/email-verification";
import { sendEmail } from "@/lib/email/email-service";
import { accountActivatedEmail } from "@/lib/email/templates/registration";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin, requestErrorResponse } from "@/lib/server/request-security";

export const runtime = "nodejs";

const schema = z.object({
  action: z.enum(["confirm_payment", "activate", "reject", "cancel", "add_note"]),
  confirmationDate: z.string().date().optional(),
  startDate: z.string().date().optional(),
  expiryDate: z.string().date().optional(),
  transactionId: z.string().trim().max(100).optional(),
  adminNote: z.string().trim().max(1000).optional(),
  confirmedAction: z.literal(true)
}).strict();

const atNoon = (value: string) => new Date(value + "T12:00:00.000Z");
const dateOnly = (value: Date) => value.toISOString().slice(0, 10);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Dados administrativos inválidos." }, { status: 422 });
    const data = parsed.data;
    const { id } = await params;
    const state = await readCoreState();
    const registrations = (Array.isArray(state.pendingRegistrations) ? state.pendingRegistrations : []).filter(isPendingRegistration);
    const index = registrations.findIndex((item) => item.id === id);
    const current = registrations[index];
    if (!current) return NextResponse.json({ error: "Conta em processo de ativação não encontrada." }, { status: 404 });
    const effectiveStatus = pendingRegistrationState(current);
    if (effectiveStatus === "expired" && data.action !== "add_note") {
      return NextResponse.json({ error: "O prazo desta conta pendente expirou." }, { status: 409 });
    }
    if (data.action === "confirm_payment" && !["awaiting_payment", "payment_under_review"].includes(current.status)) {
      return NextResponse.json({ error: "O cadastro não está disponível para confirmação de pagamento." }, { status: 409 });
    }
    if (data.action === "confirm_payment" && !data.confirmationDate) {
      return NextResponse.json({ error: "Informe a data da confirmação." }, { status: 422 });
    }
    if (data.action === "activate" && current.status !== "paid") {
      return NextResponse.json({ error: "Confirme o pagamento antes de ativar a conta." }, { status: 409 });
    }
    if (data.action === "activate" && (!data.startDate || !data.expiryDate)) {
      return NextResponse.json({ error: "Informe as datas de início e vencimento." }, { status: 422 });
    }
    if (data.startDate && data.expiryDate && atNoon(data.expiryDate) < atNoon(data.startDate)) {
      return NextResponse.json({ error: "O vencimento não pode ser anterior ao início." }, { status: 422 });
    }
    if (data.action === "reject" && (!data.adminNote || data.adminNote.length < 3)) {
      return NextResponse.json({ error: "Informe o motivo da recusa." }, { status: 422 });
    }
    if (data.action === "add_note" && !data.adminNote) {
      return NextResponse.json({ error: "Informe uma observação." }, { status: 422 });
    }

    const now = new Date();
    let updated = {
      ...current,
      adminNote: data.adminNote || current.adminNote,
      transactionId: data.transactionId || current.transactionId,
      updatedAt: now.toISOString()
    };
    const linkedAccountIndex = state.accounts.findIndex((item) =>
      current.userId
        ? item.id === current.userId
        : item.registrationWorkflowId === current.id ||
          (item.status === "pendente" && (item.email.toLowerCase() === current.email || item.username.toLowerCase() === current.username))
    );
    const linkedAccount = linkedAccountIndex >= 0 ? state.accounts[linkedAccountIndex] : undefined;
    let activatedAccountId = linkedAccount?.id || current.userId || "";
    if (data.action === "confirm_payment") {
      updated = {
        ...updated,
        status: "paid",
        paymentConfirmedAt: atNoon(data.confirmationDate!).toISOString(),
        confirmedByUserId: admin.id
      };
    }
    if (data.action === "reject") updated = { ...updated, status: "rejected", rejectedAt: now.toISOString() };
    if (data.action === "cancel") updated = { ...updated, status: "cancelled", cancelledAt: now.toISOString() };

    if (data.action === "activate") {
      if (!current.emailVerifiedAt) return NextResponse.json({ error: "O e-mail ainda não foi confirmado." }, { status: 409 });
      const duplicate = state.accounts.some((item, accountIndex) =>
        accountIndex !== linkedAccountIndex &&
        (item.email.toLowerCase() === current.email || item.username.toLowerCase() === current.username)
      );
      if (duplicate) {
        return NextResponse.json({ error: "Já existe outra conta com este e-mail ou nome de usuário." }, { status: 409 });
      }
      const plan = state.plans.find((item) => item.id === current.planId && item.status === "ativo");
      if (!plan) return NextResponse.json({ error: "O plano selecionado não está mais ativo." }, { status: 409 });
      const accountId = linkedAccount?.id || current.userId || crypto.randomUUID();
      activatedAccountId = accountId;
      const activatedAccount = {
        ...(linkedAccount || {
          id: accountId,
          role: "CLIENTE" as const,
          username: current.username,
          email: current.email,
          name: current.name,
          phone: current.phone,
          passwordHash: current.passwordHash,
          permissions: current.permissions,
          createdAt: now.toISOString()
        }),
        role: "CLIENTE" as const,
        username: current.username,
        email: current.email,
        name: current.name,
        phone: current.phone,
        passwordHash: current.passwordHash,
        planId: current.planId,
        planValue: current.planPriceInCents / 100,
        status: "ativo",
        dueDate: data.expiryDate,
        planStartedAt: data.startDate,
        emailVerifiedAt: current.emailVerifiedAt,
        permissions: current.permissions.length > 0 ? current.permissions : plan.permissions,
        registrationStatus: "activated",
        registrationWorkflowId: current.id,
        paymentConfirmedAt: current.paymentConfirmedAt,
        activatedAt: now.toISOString()
      };
      if (linkedAccountIndex >= 0) state.accounts[linkedAccountIndex] = activatedAccount;
      else state.accounts = [activatedAccount, ...state.accounts];

      const payments = Array.isArray(state.payments) ? state.payments : [];
      state.payments = [{
        id: "registration-" + current.id,
        clientId: accountId,
        planId: current.planId,
        planName: current.planName,
        value: current.planPriceInCents / 100,
        amountInCents: current.planPriceInCents,
        paymentDate: current.paymentConfirmedAt?.slice(0, 10) || data.startDate,
        dueDate: data.expiryDate,
        status: "pago",
        method: "mercado_pago_link",
        transactionId: data.transactionId || current.transactionId,
        notes: data.adminNote,
        createdBy: admin.id,
        createdAt: now.toISOString()
      }, ...payments];
      updated = { ...updated, status: "activated", activatedAt: now.toISOString() };
    } else if (linkedAccountIndex >= 0 && ["confirm_payment", "reject", "cancel"].includes(data.action)) {
      state.accounts[linkedAccountIndex] = {
        ...state.accounts[linkedAccountIndex],
        registrationStatus: updated.status,
        paymentConfirmedAt: updated.paymentConfirmedAt,
        transactionId: updated.transactionId,
        status: ["reject", "cancel"].includes(data.action) ? "bloqueado" : state.accounts[linkedAccountIndex].status
      };
    }
    registrations[index] = updated;
    state.pendingRegistrations = registrations;
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: "conta_cadastro_" + data.action,
      userId: admin.id,
      userName: admin.name,
      targetUserId: activatedAccountId || current.id,
      details: "Conta em ativação " + current.id + " alterada de " + current.status + " para " + updated.status + ".",
      createdAt: now.toISOString(),
      risk: ["confirm_payment", "activate", "reject"].includes(data.action) ? "alto" : "medio"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);

    if (data.action === "activate") {
      const template = accountActivatedEmail({
        name: current.name,
        planName: current.planName,
        startedAt: dateOnly(atNoon(data.startDate!)),
        expiresAt: dateOnly(atNoon(data.expiryDate!))
      });
      await sendEmail({
        to: current.email,
        ...template,
        userId: activatedAccountId,
        type: "registration_activated",
        idempotencyKey: "registration-activated:" + current.id
      });
    }
    const { passwordHash: _passwordHash, continuationTokenHash: _continuationTokenHash, ...safe } = updated;
    return NextResponse.json({ registration: safe }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return requestErrorResponse(error);
  }
}
