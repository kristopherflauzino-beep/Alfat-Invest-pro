# Checklist OWASP ASVS - ALFATEC INVEST PRO

| Requisito | Status | Implementacao | Evidencia | Pendencia | Risco |
|---|---|---|---|---|---|
| Autenticacao | Implementado | Cookie servidor e bcrypt 12 | `lib/auth`, `/api/auth` | MFA | Alto |
| Sessao | Parcial | Opaca/revogavel no PostgreSQL, fallback assinado no Blob | `lib/auth/session.ts` | Remover fallback apos migracao | Medio |
| Autorizacao | Parcial | Conta, propriedade e admin nas rotas financeiras | `/api/payments`, `/api/admin/payments` | Separar todas as rotas legadas | Medio |
| Senhas legadas | Parcial | Migracao automatica no login | `lib/auth/password.ts` | Forcar troca de senhas antigas fracas | Medio |
| CSRF | Parcial | SameSite e verificacao de origem em mutacoes | `request-security.ts` | Token CSRF para operacoes criticas | Medio |
| XSS | Implementado | Escape React e CSP inicial | `next.config.ts` | CSP com nonce | Baixo |
| SQL Injection | Implementado | Prisma e SQL parametrizado para dados | `payment-service.ts` | Revisar DDL inicial | Baixo |
| Dados sensiveis | Implementado | DTOs, hash/token removidos, sem PAN/CVV | APIs de conta/pagamento | Revisao continua | Baixo |
| Seguranca financeira | Implementado | Centavos, idempotencia, webhook e transacao | `lib/payments` | Teste real sandbox | Alto |
| Webhooks | Implementado | HMAC, deduplicacao e consulta ao gateway | `/api/webhooks/payments` | Configurar secret | Alto |
| Logs/auditoria | Parcial | Auditoria financeira estruturada | `PaymentAuditLog` | Retencao/monitoramento externo | Medio |
| Rate limit | Parcial | Limite local no login | `/api/auth/login` | Firewall/KV distribuido | Medio |
| Headers/cache | Implementado | HSTS, CSP, no-store | `next.config.ts` | Ajustar allowlist connect-src | Baixo |
| Backup | Pendente | Procedimento documentado | `INCIDENT_RESPONSE.md` | Backup/restauracao real | Alto |
| Pipeline | Parcial | typecheck, testes e build | `package.json` | CI obrigatorio no GitHub | Medio |
