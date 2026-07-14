# ALFATEC INVEST PRO

Plataforma de analise de investimentos com perfis de administrador e cliente, mercado, carteira, oportunidades, comparador, Radar IA, Valuation Graham, Metodo AlfaTec FIIs, Metodo AlfaTec Cripto, planos e financeiro.

## Desenvolvimento

```powershell
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Validacao

```powershell
npm run typecheck
npm test
npm run build
```

## Persistencia

O estado operacional existente pode ser lido do Vercel Blob. Pagamentos online exigem PostgreSQL e usam as tabelas definidas em `prisma/schema.prisma`.

```powershell
npm run db:migrate
```

A migracao copia o estado persistente para PostgreSQL quando `DATABASE_URL` estiver configurada. Clientes existentes nao sao recriados nem apagados.

## Metodo AlfaTec Cripto

A pagina `/metodo-alfatec-cripto` abre o menu dedicado. O metodo usa dados identificados da CoinGecko, pesos por categoria, oito pilares, confianca, riscos, comparacao, Oportunidades, Comparador, Radar IA e relatorios. Dados ausentes nao sao convertidos em zero.

Variavel opcional para ampliar os limites da fonte:

```text
COINGECKO_API_KEY
```

## Pagamentos

A integracao inicial usa Mercado Pago por uma camada `PaymentProvider`/`PaymentService`:

- Pix pela Orders API, com QR Code, Copia e Cola, expiracao e conciliacao;
- cartao em checkout hospedado, sem PAN ou CVV na aplicacao;
- recorrencia mensal/anual por assinatura autorizada;
- webhook assinado como fonte oficial de confirmacao;
- valores em centavos, idempotencia, recibos PDF, estorno com reautenticacao e auditoria;
- nenhuma liberacao de plano antes da confirmacao valida do provedor.

Use `.env.example` como referencia. Em sandbox, a credencial deve comecar com `TEST-`. Para cobrancas reais, defina `PAYMENT_ENVIRONMENT=production` e use a credencial oficial.

No deploy inicial, configure:

```text
DATABASE_URL
SESSION_SECRET
PAYMENT_PROVIDER=mercado_pago
PAYMENT_ENVIRONMENT=sandbox|production
PAYMENT_APP_URL=https://SEU-DOMINIO
MERCADO_PAGO_ACCESS_TOKEN
MERCADO_PAGO_WEBHOOK_SECRET
CRON_SECRET
ADMIN_BOOTSTRAP_PASSWORD
```

Cadastre no Mercado Pago o webhook:

```text
https://SEU-DOMINIO/api/webhooks/payments/mercado-pago
```

A conciliacao automatizada esta disponivel em `GET /api/cron/payments/reconcile`, protegida por `Authorization: Bearer CRON_SECRET`; agende a chamada na Vercel.

Sem banco, token ou segredo do webhook, o checkout permanece desativado e mostra uma mensagem de configuracao. Nenhuma cobranca ficticia e criada.
