import { emailLayout, officialAppUrl } from "./base";

export function passwordResetEmail(input: { name: string; resetUrl: string; expiresInMinutes: number }) {
  return {
    subject: "Recuperação de senha — AlfaTec Invest Pro",
    html: emailLayout({
      preheader: "Use o link temporário para criar uma nova senha.",
      title: "Recuperação de senha",
      greeting: "Olá, " + input.name + ".",
      paragraphs: [
        "Recebemos uma solicitação para redefinir a senha da sua conta.",
        "O link é de uso único e expira em " + input.expiresInMinutes + " minutos. Se você não fez esta solicitação, ignore esta mensagem."
      ],
      actionLabel: "Criar nova senha",
      actionUrl: input.resetUrl,
      securityNotice: "Nunca compartilhe este link. A AlfaTec Invest Pro não solicita sua senha por e-mail."
    }),
    text: "Olá, " + input.name + ".\n\nUse o link temporário para criar uma nova senha: " + input.resetUrl + "\n\nO link expira em " + input.expiresInMinutes + " minutos."
  };
}

export function passwordChangedEmail(input: { name: string; changedAt: string }) {
  const date = new Date(input.changedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return {
    subject: "Sua senha foi alterada — AlfaTec Invest Pro",
    html: emailLayout({
      preheader: "A senha da sua conta foi alterada.",
      title: "Senha alterada com sucesso",
      greeting: "Olá, " + input.name + ".",
      paragraphs: [
        "A senha da sua conta foi alterada com sucesso em " + date + ".",
        "Todas as sessões anteriores foram encerradas por segurança. Se você não realizou esta alteração, entre em contato imediatamente com o suporte."
      ],
      actionLabel: "Entrar na plataforma",
      actionUrl: officialAppUrl(),
      securityNotice: "A nova senha não é enviada nem armazenada em texto puro."
    }),
    text: "Olá, " + input.name + ".\n\nSua senha foi alterada em " + date + ". Todas as sessões anteriores foram encerradas por segurança.\n\n" + officialAppUrl()
  };
}