import { emailLayout } from "./base";

export function registrationConfirmationEmail(input: { name: string; confirmationUrl: string; planName: string; isFree?: boolean }) {
  const nextStep = input.isFree
    ? "Após a confirmação, sua conta gratuita será ativada sem cobrança e sem cartão de crédito."
    : "Após a confirmação, você poderá prosseguir para o pagamento do plano " + input.planName + ".";
  const textNextStep = input.isFree ? " A conta gratuita será ativada após a confirmação." : "";
  return {
    subject: "Confirme seu e-mail - AlfaTec Invest Pro",
    text: "Olá, " + input.name + ". Confirme seu e-mail acessando " + input.confirmationUrl + ". O link é válido por 24 horas e pode ser usado uma única vez." + textNextStep,
    html: emailLayout({
      preheader: "Confirme o e-mail do seu cadastro.",
      title: "Confirme seu e-mail",
      greeting: "Olá, " + input.name + ".",
      paragraphs: [
        "Obrigado por iniciar seu cadastro no AlfaTec Invest Pro.",
        "Para confirmar que este e-mail pertence a você, clique no botão abaixo. " + nextStep,
        "Link alternativo: " + input.confirmationUrl
      ],
      actionLabel: "Confirmar meu e-mail",
      actionUrl: input.confirmationUrl,
      securityNotice: "Este link é válido por 24 horas e poderá ser utilizado somente uma vez. Se você não iniciou este cadastro, ignore a mensagem."
    })
  };
}


export function freeAccountActivatedEmail(input: { name: string; appUrl: string }) {
  return {
    subject: "Sua conta gratuita foi ativada - AlfaTec Invest Pro",
    text: "Olá, " + input.name + ". Seu e-mail foi confirmado e sua conta gratuita está ativa. Acesse " + input.appUrl,
    html: emailLayout({
      preheader: "Seu acesso gratuito ao AlfaTec Invest Pro está ativo.",
      title: "Conta gratuita ativada",
      greeting: "Olá, " + input.name + ".",
      paragraphs: [
        "Seu e-mail foi confirmado e sua conta gratuita está pronta para uso.",
        "Nenhum pagamento ou cartão de crédito é necessário. Você poderá fazer upgrade a qualquer momento."
      ],
      details: [
        { label: "Plano", value: "Plano Gratuito" },
        { label: "Valor", value: "R$ 0,00" },
        { label: "Cobrança", value: "Não se aplica" }
      ],
      actionLabel: "Entrar na plataforma",
      actionUrl: input.appUrl
    })
  };
}
export function emailVerifiedAwaitingPaymentEmail(input: { name: string; planName: string; continuationUrl: string }) {
  return {
    subject: "E-mail confirmado - AlfaTec Invest Pro",
    text: "Olá, " + input.name + ". Seu e-mail foi confirmado. Continue o cadastro e conclua o pagamento do plano " + input.planName + " em " + input.continuationUrl,
    html: emailLayout({
      preheader: "Seu e-mail foi confirmado.",
      title: "E-mail confirmado",
      greeting: "Olá, " + input.name + ".",
      paragraphs: [
        "Seu e-mail foi confirmado com sucesso.",
        "Agora continue o cadastro e acesse o pagamento do plano selecionado. A conta não será ativada apenas pela abertura do link."
      ],
      details: [{ label: "Plano selecionado", value: input.planName }],
      actionLabel: "Continuar para o pagamento",
      actionUrl: input.continuationUrl
    })
  };
}

export function paymentUnderReviewEmail(input: { name: string; planName: string }) {
  return {
    subject: "Pagamento em análise - AlfaTec Invest Pro",
    text: "Olá, " + input.name + ". Sua solicitação de verificação do pagamento do plano " + input.planName + " foi registrada. A ativação será realizada após a conferência do administrador.",
    html: emailLayout({
      preheader: "Recebemos sua solicitação de verificação.",
      title: "Pagamento em análise",
      greeting: "Olá, " + input.name + ".",
      paragraphs: [
        "Sua solicitação foi registrada e o pagamento será verificado pelo administrador antes da ativação do plano.",
        "Nenhum acesso é liberado apenas pelo clique no link de pagamento ou pelo envio desta solicitação."
      ],
      details: [{ label: "Plano", value: input.planName }]
    })
  };
}

export function accountActivatedEmail(input: { name: string; planName: string; startedAt: string; expiresAt: string }) {
  return {
    subject: "Sua conta AlfaTec Invest Pro foi ativada",
    text: "Olá, " + input.name + ". Sua conta foi ativada no plano " + input.planName + ". Início: " + input.startedAt + ". Vencimento: " + input.expiresAt + ".",
    html: emailLayout({
      preheader: "Seu acesso ao AlfaTec Invest Pro está ativo.",
      title: "Conta ativada com sucesso",
      greeting: "Olá, " + input.name + ".",
      paragraphs: ["Seu pagamento foi confirmado pelo administrador e sua conta está pronta para uso."],
      details: [
        { label: "Plano", value: input.planName },
        { label: "Início", value: input.startedAt },
        { label: "Vencimento", value: input.expiresAt }
      ]
    })
  };
}

export function pendingRegistrationAdminEmail(input: { name: string; email: string; planName: string; createdAt: string }) {
  return {
    subject: "Novo cadastro aguardando pagamento - AlfaTec Invest Pro",
    text: "Novo cadastro: " + input.name + ", " + input.email + ", plano " + input.planName + ", em " + input.createdAt + ".",
    html: emailLayout({
      preheader: "Novo cadastro confirmado.",
      title: "Novo cadastro aguardando pagamento",
      greeting: "Olá, administrador.",
      paragraphs: ["Um usuário confirmou o e-mail e seguirá para o pagamento pelo Mercado Pago."],
      details: [
        { label: "Nome", value: input.name },
        { label: "E-mail", value: input.email },
        { label: "Plano", value: input.planName },
        { label: "Data", value: input.createdAt }
      ]
    })
  };
}
