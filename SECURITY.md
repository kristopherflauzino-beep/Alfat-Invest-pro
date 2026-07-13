# Segurança - ALFATEC INVEST PRO

## Medidas Implementadas Neste Ciclo

- Estado persistente ampliado em `/api/app-state` para incluir historico de precos de planos, configuracoes Graham e auditoria.
- Protecao basica de origem e limite de tamanho em operacoes `PUT /api/app-state`.
- Headers de seguranca no Next.js: CSP, HSTS, `nosniff`, `DENY`, referrer policy, permissions policy, COOP e CORP.
- `Cache-Control: private, no-store, max-age=0` nas rotas `/api/*`.
- `.gitignore` reforcado para bloquear `.env.production`, `.env.development`, chaves, backups e dumps.
- Regras de senha para novos cadastros/trocas elevadas para minimo de 12 caracteres, letras, numero e caractere especial.
- Valores de planos com historico, auditoria e preservacao do valor contratado em pagamentos/renovacoes.

## Pendencias De Risco

| Pendencia | Risco | Observacao |
|---|---:|---|
| Migrar login para sessao opaca no servidor com cookie `httpOnly` | Alto | O app ainda usa fluxo legado client-side para preservar compatibilidade imediata. |
| Hash de senha Argon2id/bcrypt no backend | Alto | Senhas novas ainda passam pelo fluxo SHA-256 legado do app. |
| MFA TOTP obrigatorio para admin | Alto | Requer novas tabelas/rotas de autenticacao e segredo por usuario. |
| RBAC em todas as Route Handlers | Alto | A rota de estado ainda e agregada; proximo passo e separar APIs por dominio. |
| Banco PostgreSQL normalizado para usuarios, planos e pagamentos | Medio | Hoje ha persistencia via Postgres/Blob em JSON; funciona entre dispositivos, mas nao e o modelo final recomendado. |
| Rate limiting distribuido | Medio | Deve ser configurado com Vercel Firewall/SDK ou Redis/KV. |

## Configuracao Na Vercel

1. Definir variaveis por ambiente: `DATABASE_URL` ou `BLOB_READ_WRITE_TOKEN`, `SESSION_SECRET`, `SERPAPI_KEY` e credenciais SMTP quando houver.
2. Usar variaveis sensiveis da Vercel e separar Production, Preview e Development.
3. Ativar Vercel Firewall/WAF para `/api/auth/*`, `/api/admin/*`, `/api/app-state`, `/api/quotes/*` e `/api/reports/*`.
4. Criar regra de rate limit para login/cadastro/reset quando essas rotas forem migradas para backend.
5. Proteger Preview Deployments quando houver dados reais.

## Configuracao No GitHub

1. Ativar MFA para colaboradores.
2. Ativar secret scanning e push protection.
3. Proteger `main` com PR obrigatorio e checks de build/testes.
4. Ativar Dependabot.
5. Nunca registrar dados reais de clientes, dumps, cookies, tokens ou chaves em issues, commits ou logs.

Seguranca e um processo continuo. Esta implementacao reduz risco em camadas, sem prometer seguranca absoluta.
