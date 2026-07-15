# Configuração de e-mail

A aplicação envia e-mails transacionais somente pelo servidor. Nenhuma senha SMTP é exposta ao navegador ou usa o prefixo `NEXT_PUBLIC_`.

## Variáveis na Vercel

Cadastre em **Project Settings > Environment Variables** para Production e, se necessário, Preview:

```text
APP_URL=https://alfatecinvestpro.vercel.app
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=465
EMAIL_SMTP_SECURE=true
EMAIL_SMTP_USER=conta-da-alfatec@gmail.com
EMAIL_SMTP_PASSWORD=senha-de-app-do-google
EMAIL_FROM_NAME=AlfaTec Invest Pro
EMAIL_FROM_ADDRESS=conta-da-alfatec@gmail.com
```

Use uma senha de app do Google em uma conta com verificação em duas etapas. Não use a senha normal da conta e nunca registre a credencial no GitHub.

## Fluxos atendidos

- solicitação, análise, confirmação e ativação manual de assinatura;
- recusa, cancelamento e vencimento;
- observações públicas do administrador;
- recuperação e alteração de senha;
- alertas essenciais conforme as preferências da central de notificações.

Falhas de e-mail relacionadas a planos ficam registradas para nova tentativa no painel administrativo. Links de recuperação não são colocados em fila, pois contêm token de uso único; o usuário deve solicitar um novo link se o envio falhar.
