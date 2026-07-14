# Seguranca - ALFATEC INVEST PRO

## Controles em uso

- Cookies de sessao `httpOnly`, `Secure` em producao e `SameSite=Lax`.
- Sessoes opacas em PostgreSQL, expiracao de 12 horas e revogacao em troca de senha/bloqueio.
- bcrypt custo 12 para senhas novas e migracao de hashes legados no login.
- Autenticacao e autorizacao no servidor para cadastro, checkout, status, recibos, assinaturas, conciliacao e estorno.
- Origem validada nas mutacoes; entradas validadas com Zod.
- Webhook Mercado Pago validado por HMAC e confirmado consultando o recurso no gateway.
- Valores em centavos, idempotencia e transacao de ativacao para impedir dias/receita duplicados.
- Checkout hospedado para cartao. A aplicacao nao recebe nem armazena PAN ou CVV.
- Secrets somente no servidor e sem prefixo `NEXT_PUBLIC_`.
- Respostas privadas com `Cache-Control: private, no-store`.

## Configuracao Vercel

1. Criar PostgreSQL de producao e outro para Preview, ambos com TLS.
2. Definir as variaveis de `.env.example` separadamente em Development, Preview e Production.
3. Executar `npm run db:migrate` com backup e revisao antes da producao.
4. Configurar o webhook Mercado Pago para `/api/webhooks/payments/mercado-pago`.
5. Agendar `/api/cron/payments/reconcile` com `Authorization: Bearer CRON_SECRET`.
6. Criar regras de Firewall para `/api/auth/*`, `/api/admin/*`, `/api/payments/*` e `/api/webhooks/*`.
7. Proteger Preview Deployments e nunca conectar Preview ao banco real.

## Configuracao GitHub

Ative MFA, branch protection, pull request obrigatorio, secret scanning, push protection, Dependabot e checks `npm run typecheck`, `npm test` e `npm run build`.

## Pendencias

MFA TOTP, rate limiting distribuido, e-mail transacional e teste real de backup/restauracao ainda dependem de infraestrutura externa. Consulte `SECURITY_CHECKLIST.md`.

Reporte uma vulnerabilidade de forma privada ao responsavel do projeto. Nao publique credenciais, dados reais de clientes ou detalhes exploraveis em issues.
