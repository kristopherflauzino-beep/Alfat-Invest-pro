# Seguranca

## Controles implementados

- Sessao em cookie `httpOnly`, `Secure` em producao e `SameSite=Lax`.
- Senhas bcrypt com custo 12 e migracao de hashes legados no login.
- Autorizacao de administrador validada novamente nas rotas sensiveis.
- Estado persistente compartilhado por PostgreSQL ou Vercel Blob.
- Carteiras e perfis filtrados pelo usuario da sessao.
- Solicitacoes de assinatura vinculadas ao usuario autenticado.
- Ativacao de plano exclusivamente administrativa, com historico e auditoria.
- Nenhum dado de cartao, credencial bancaria ou segredo do Mercado Pago e solicitado ou armazenado.
- Verificacao de origem em operacoes mutaveis e `Cache-Control: private, no-store` em dados privados.

## Pagamentos

A aplicacao apenas direciona para o link publico oficial do Mercado Pago. Abrir o link, retornar ao site ou informar que pagou nunca ativa a assinatura. A confirmacao e a ativacao sao manuais e registram o administrador responsavel.

## Operacao

Configure `SESSION_SECRET`, proteja a branch principal, mantenha dependencias atualizadas e revise periodicamente os logs administrativos. Nunca versione arquivos `.env`, dumps, tokens ou dados reais de clientes.
