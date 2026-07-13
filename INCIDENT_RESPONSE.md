# Plano De Resposta A Incidentes

## Fluxo

1. Detectar evento suspeito por logs, alertas, Vercel, GitHub ou relato de usuario.
2. Confirmar impacto: contas, pagamentos, carteiras, relatorios, APIs ou secrets.
3. Conter: bloquear usuario/origem, desativar chave, pausar endpoint ou restringir firewall.
4. Preservar evidencias: horario, IP, user-agent, request id, usuario afetado e acao.
5. Revogar sessoes quando houver suspeita de conta comprometida.
6. Rotacionar chaves e variaveis sensiveis na Vercel.
7. Corrigir vulnerabilidade e validar em Preview.
8. Restaurar dados a partir de backup testado, se necessario.
9. Comunicar responsaveis e usuarios afetados conforme impacto.
10. Documentar causa raiz, impacto, correcao e controles adicionais.

## Procedimentos Especificos

- Admin comprometido: bloquear acesso, rotacionar secrets, revisar alteracoes financeiras e exigir nova senha/MFA.
- Vazamento de chave: revogar chave, criar nova variavel sensivel na Vercel e auditar logs.
- Vazamento de banco: isolar banco, trocar credenciais, restaurar backup limpo e comunicar responsaveis.
- Abuso de API: aplicar rate limit/firewall, revisar origem e reduzir payloads expostos.
- Alteracao financeira indevida: congelar renovacoes, auditar `planPriceHistory`, pagamentos e restaurar valores corretos.

## Acao Emergencial

Enquanto o backend de sessoes opacas nao for implementado, a acao emergencial operacional e bloquear clientes/admin afetados, trocar senha e limpar sessoes locais dos dispositivos envolvidos. A etapa seguinte recomendada e criar rota administrativa para "Encerrar todas as sessoes".
