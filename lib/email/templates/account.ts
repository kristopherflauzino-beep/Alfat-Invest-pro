import { maskEmail } from "@/lib/auth/password-reset";
import { emailLayout } from "./base";

export function emailChangeConfirmationEmail(input: { name: string; newEmail: string; confirmationUrl: string }) {
  return {
    subject: "Confirme seu novo e-mail - AlfaTec Invest Pro",
    text: `Olá, ${input.name}. Confirme o novo e-mail ${input.newEmail} acessando ${input.confirmationUrl}. O link expira em 30 minutos e pode ser usado uma única vez.`,
    html: emailLayout({
      preheader: "Confirme o novo e-mail da sua conta.",
      title: "Confirme seu novo e-mail",
      greeting: `Olá, ${input.name}.`,
      paragraphs: [
        "Foi solicitada a alteração do e-mail da sua conta no AlfaTec Invest Pro.",
        "Clique no botão abaixo para confirmar a alteração. O link expira em 30 minutos e pode ser utilizado uma única vez."
      ],
      details: [{ label: "Novo e-mail", value: input.newEmail }],
      actionLabel: "Confirmar novo e-mail",
      actionUrl: input.confirmationUrl,
      securityNotice: "Caso você não tenha solicitado essa alteração, não confirme o link e entre em contato com o suporte."
    })
  };
}

export function previousEmailChangedNotice(input: { name: string; newEmail: string; changedAt: string }) {
  const changedAt = new Date(input.changedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return {
    subject: "O e-mail da sua conta foi alterado",
    text: `Olá, ${input.name}. O e-mail da sua conta foi alterado em ${changedAt}. Novo e-mail: ${maskEmail(input.newEmail)}. Se não foi você, entre em contato imediatamente com o suporte.`,
    html: emailLayout({
      preheader: "Aviso de segurança sobre a sua conta.",
      title: "O e-mail da sua conta foi alterado",
      greeting: `Olá, ${input.name}.`,
      paragraphs: [
        "O e-mail vinculado à sua conta no AlfaTec Invest Pro foi alterado.",
        "Se você não realizou essa alteração, entre em contato imediatamente com o suporte."
      ],
      details: [
        { label: "Data e horário", value: changedAt },
        { label: "Novo e-mail", value: maskEmail(input.newEmail) }
      ],
      securityNotice: "Não compartilhe senhas, códigos de segurança ou dados bancários em solicitações de suporte."
    })
  };
}

export function newEmailChangedNotice(input: { name: string; changedAt: string }) {
  const changedAt = new Date(input.changedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return {
    subject: "Novo e-mail confirmado - AlfaTec Invest Pro",
    text: `Olá, ${input.name}. Este endereço foi confirmado como o novo e-mail da sua conta em ${changedAt}. Entre novamente na plataforma para continuar.`,
    html: emailLayout({
      preheader: "Seu novo e-mail foi confirmado.",
      title: "Novo e-mail confirmado",
      greeting: `Olá, ${input.name}.`,
      paragraphs: [
        "Este endereço foi confirmado como o novo e-mail da sua conta no AlfaTec Invest Pro.",
        "Por segurança, as sessões anteriores foram encerradas. Entre novamente para continuar."
      ],
      details: [{ label: "Confirmado em", value: changedAt }]
    })
  };
}
