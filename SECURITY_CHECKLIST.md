# Checklist OWASP ASVS - ALFATEC INVEST PRO

| Requisito | Status | Implementacao | Evidencia | Pendencia | Risco |
|---|---|---|---|---|---|
| Arquitetura com defesa em profundidade | Parcial | Headers, validacao basica de origem, docs e auditoria local | `next.config.ts`, `/api/app-state` | Separar APIs por dominio | Medio |
| Autenticacao segura | Pendente | Regras de senha novas reforcadas | `PasswordRequirementList` | Sessao backend, bcrypt/Argon2id, MFA | Alto |
| Gerenciamento de sessao | Pendente | Sessao legado preservada para nao quebrar usuarios | `AlfatecInvestPro.tsx` | Cookie httpOnly, rotacao, revogacao | Alto |
| Controle de acesso | Parcial | Menus por permissao e admin/client | `clientModules`, `permissions` | Validacao servidor por rota | Alto |
| Validacao de entrada | Parcial | Checagens numericas e origem em app-state | `/api/app-state` | Zod em todas as rotas | Medio |
| Protecao contra XSS | Parcial | React escape padrao e CSP inicial | `next.config.ts` | Sanitizacao formal se HTML rico for adicionado | Medio |
| CSRF | Parcial | Same-origin check em `PUT /api/app-state` | `requestOriginAllowed` | Token CSRF para rotas sensiveis | Medio |
| SQL Injection | Parcial | Prisma existente para banco; estado usa JSON persistente | `lib/prisma.ts`, `/api/app-state` | Evitar `$executeRawUnsafe` para schema init no futuro | Medio |
| Dados sensiveis | Parcial | `.gitignore`, docs e headers | `.gitignore`, `SECURITY.md` | Remover hash de senha do payload publico apos auth backend | Alto |
| Seguranca financeira | Parcial | Historico de planos e preservacao de valores antigos | Financeiro, `PlanPriceHistory` | Decimal/centavos no backend normalizado | Medio |
| Logs e auditoria | Parcial | `auditLogs` persistido no estado | `logAudit` | Tela dedicada e imutabilidade | Medio |
| APIs de mercado | Parcial | Chave SerpApi somente no servidor | `/api/quotes/google-finance` | Rate limit/circuit breaker formal | Medio |
| Headers e cache | Implementado | CSP/HSTS/no-store em API | `next.config.ts` | Ajustar CSP com nonce no futuro | Baixo |
| Backup e recuperacao | Pendente | Documento operacional | `INCIDENT_RESPONSE.md` | Backups testados do banco/blob | Alto |
| Pipeline | Parcial | Scripts `test`, `typecheck`, `build` | `package.json` | CI obrigatorio no GitHub | Medio |
