# Resposta a Incidentes

1. Detectar e registrar o identificador do incidente.
2. Confirmar o impacto sem expor dados pessoais.
3. Conter o acesso e revogar sessoes afetadas.
4. Preservar evidencias e trilhas de auditoria.
5. Rotacionar segredos de sessao ou banco quando necessario.
6. Corrigir a causa e validar em ambiente de teste.
7. Restaurar dados a partir de backup testado quando aplicavel.
8. Comunicar responsaveis e usuarios conforme impacto e obrigacoes legais.
9. Documentar a linha do tempo e revisar controles.

## Cenarios

- Administrador comprometido: bloquear acesso, revogar sessoes, trocar senha e revisar todas as ativacoes e alteracoes de plano.
- Solicitacao de assinatura alterada indevidamente: preservar historico, bloquear o ator, corrigir o plano e revisar auditoria.
- Segredo exposto: revogar imediatamente, substituir na Vercel e revisar logs.
- Vazamento de banco: restringir acesso, rotacionar credenciais, avaliar notificacao e restaurar somente de fonte confiavel.
- Dependencia comprometida: bloquear deploy, atualizar ou remover pacote e executar testes de regressao.

A acao emergencial e encerrar todas as sessoes afetadas antes da retomada.
