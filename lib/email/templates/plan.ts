import { emailLayout, officialAppUrl } from "./base";

export type PlanEmailEvent =
  | "request_created"
  | "under_review"
  | "payment_confirmed"
  | "subscription_activated"
  | "request_rejected"
  | "public_note"
  | "plan_expiring"
  | "plan_expired"
  | "plan_renewed"
  | "subscription_cancelled";

export type PlanEmailInput = {
  event: PlanEmailEvent;
  to: string;
  name: string;
  planName: string;
  amountInCents: number;
  statusLabel: string;
  publicNote?: string;
  updatedAt: string;
  expiresAt?: string;
};

const eventCopy: Record<PlanEmailEvent, { subject: string; title: string; message: string }> = {
  request_created: { subject: "Solicitação de verificação recebida", title: "Recebemos sua solicitação", message: "Sua solicitação foi registrada e será verificada manualmente pelo administrador." },
  under_review: { subject: "Sua solicitação está em análise", title: "Verificação em andamento", message: "O administrador iniciou a análise dos dados informados." },
  payment_confirmed: { subject: "Pagamento confirmado", title: "Pagamento localizado", message: "O pagamento informado foi confirmado. A assinatura aguarda a conclusão da ativação." },
  subscription_activated: { subject: "Assinatura ativada", title: "Seu acesso foi ativado", message: "A assinatura foi ativada após a confirmação administrativa do pagamento." },
  request_rejected: { subject: "Atualização da solicitação de pagamento", title: "Solicitação recusada", message: "Não foi possível aprovar a solicitação com os dados apresentados." },
  public_note: { subject: "Nova observação sobre sua assinatura", title: "Mensagem do administrador", message: "Existe uma nova orientação pública vinculada à sua solicitação." },
  plan_expiring: { subject: "Seu plano está próximo do vencimento", title: "Plano próximo do vencimento", message: "Confira a data de vencimento e providencie a renovação se desejar manter o acesso." },
  plan_expired: { subject: "Seu plano venceu", title: "Plano vencido", message: "O período contratado chegou ao fim. Seus dados foram preservados." },
  plan_renewed: { subject: "Plano renovado", title: "Renovação confirmada", message: "O novo período da assinatura foi registrado." },
  subscription_cancelled: { subject: "Assinatura cancelada", title: "Cancelamento registrado", message: "A assinatura foi cancelada e o histórico permaneceu preservado." }
};

export function planEmailTemplate(input: PlanEmailInput) {
  const copy = eventCopy[input.event];
  const formattedAmount = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(input.amountInCents / 100);
  const formattedDate = new Date(input.updatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const html = emailLayout({
    preheader: copy.message,
    title: copy.title,
    greeting: "Olá, " + input.name + ".",
    paragraphs: [copy.message],
    details: [
      { label: "Plano", value: input.planName },
      { label: "Valor", value: formattedAmount },
      { label: "Status", value: input.statusLabel },
      { label: "Atualizado em", value: formattedDate },
      ...(input.expiresAt ? [{ label: "Vencimento", value: new Date(input.expiresAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) }] : [])
    ],
    publicNote: input.publicNote,
    actionLabel: "Abrir AlfaTec Invest Pro",
    actionUrl: officialAppUrl() + "/?menu=plano"
  });
  return {
    subject: copy.subject + " — AlfaTec Invest Pro",
    html,
    text: ["Olá, " + input.name + ".", copy.message, "Plano: " + input.planName, "Valor: " + formattedAmount, "Status: " + input.statusLabel, input.publicNote ? "Observação: " + input.publicNote : "", officialAppUrl()].filter(Boolean).join("\n\n")
  };
}