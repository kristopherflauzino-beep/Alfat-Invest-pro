# Checklist de Seguranca

| Requisito | Status | Implementacao | Evidencia | Pendencia | Risco |
|---|---|---|---|---|---|
| Senhas protegidas | Implementado | bcrypt custo 12 | `lib/auth/password.ts` | Bloqueio de senhas comuns | Medio |
| Sessao segura | Implementado | Cookie `httpOnly` e sessao revogavel com banco | `lib/auth/session.ts` | Configurar `SESSION_SECRET` | Alto |
| Autorizacao administrativa | Implementado | `requireAdmin` em alteracoes de assinatura | `/api/admin/subscription-requests` | MFA administrativo | Alto |
| Isolamento de carteira | Implementado | Portfolio e perfil filtrados por `userId` da sessao | `/api/app-state`, `/api/portfolio-method` | Teste DAST autenticado | Medio |
| Pagamento manual | Implementado | Link publico, status pendente e ativacao manual | `components/subscriptions` | Procedimento operacional de conferencia | Medio |
| Dados de pagamento | Implementado | Nenhum dado sensivel solicitado ou armazenado | Formulario de informacao do pagamento | Revisao periodica | Baixo |
| Auditoria | Implementado | Historico de status e administrador responsavel | `subscriptionRequests.history`, `auditLogs` | Retencao centralizada | Medio |
| Rate limiting | Parcial | Limite local no login | `/api/auth/login` | Vercel Firewall/KV | Medio |
| MFA | Pendente | Nao implementado | - | TOTP para administradores | Alto |
| Backup | Operacional | Depende do provedor de persistencia | Vercel/DB | Teste de restauracao | Alto |
