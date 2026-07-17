import { NextResponse } from "next/server";
import { z } from "zod";
import {
  emailConfigurationStatus,
  emailDeliveryStats,
  sendEmail,
  verifyEmailConnection,
  verifyEmailLogoAsset
} from "@/lib/email/email-service";
import { emailLayout } from "@/lib/email/templates/base";
import { authErrorResponse, requireAdmin } from "@/lib/auth/session";
import { readCoreState, writeCoreState } from "@/lib/server/core-state";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";
const schema = z.object({
  action: z.enum(["verify", "check_logo", "send_test"]),
  recipient: z.string().trim().email().max(254).optional()
}).strict();

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const [configuration, deliveries, logo] = await Promise.all([
      Promise.resolve(emailConfigurationStatus()),
      emailDeliveryStats(),
      verifyEmailLogoAsset()
    ]);
    const previewHtml = emailLayout({
      preheader: "Prévia do modelo de e-mail AlfaTec Invest Pro.",
      title: "Prévia do modelo de e-mail",
      greeting: `Olá, ${admin.name}.`,
      paragraphs: ["Este é o modelo visual utilizado nas mensagens transacionais da plataforma.", "O conteúdo permanece legível mesmo quando o cliente de e-mail bloqueia imagens externas."],
      details: [{ label: "Remetente", value: configuration.fromAddress || "Não configurado" }]
    });
    return NextResponse.json({ configuration, deliveries, logo, previewHtml }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Ação de teste inválida." }, { status: 422 });

    if (parsed.data.action === "verify") {
      const result = await verifyEmailConnection();
      return NextResponse.json(result, { status: result.ok ? 200 : 503 });
    }
    if (parsed.data.action === "check_logo") {
      const result = await verifyEmailLogoAsset();
      return NextResponse.json(result, { status: result.ok ? 200 : 503 });
    }
    if (!parsed.data.recipient) return NextResponse.json({ error: "Informe o destinatário do teste." }, { status: 422 });
    const html = emailLayout({
      preheader: "Teste da conexão de e-mail do AlfaTec Invest Pro.",
      title: "Teste de e-mail",
      greeting: "Olá.",
      paragraphs: [
        "Esta mensagem confirma que o serviço SMTP do AlfaTec Invest Pro conseguiu enviar um e-mail de teste.",
        "Nenhuma senha, token ou dado financeiro foi incluído neste teste."
      ],
      details: [{ label: "Executado por", value: admin.name }]
    });
    const result = await sendEmail({
      to: parsed.data.recipient,
      subject: "Teste de e-mail - AlfaTec Invest Pro",
      text: "Teste de e-mail do AlfaTec Invest Pro concluído.",
      html,
      userId: admin.id,
      type: "admin_test"
    });
    const state = await readCoreState();
    state.auditLogs = [{
      id: crypto.randomUUID(),
      action: result.sent ? "email_teste_enviado" : "email_teste_falhou",
      userId: admin.id,
      userName: admin.name,
      details: result.sent ? "E-mail de teste aceito pelo provedor SMTP." : "Falha no e-mail de teste: " + (result.errorCode || result.status),
      origin: "admin_email_health",
      result: result.status,
      createdAt: new Date().toISOString(),
      risk: result.sent ? "baixo" : "medio"
    }, ...(state.auditLogs || [])];
    await writeCoreState(state);
    return NextResponse.json(result, { status: result.sent ? 200 : 503 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
