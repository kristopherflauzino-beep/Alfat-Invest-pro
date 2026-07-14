# Plano de Resposta a Incidentes

1. Detectar e gerar um identificador do incidente.
2. Confirmar o impacto em contas, pagamentos, dados e secrets.
3. Conter: bloquear conta/origem, pausar checkout e restringir firewall.
4. Preservar evidencias sem registrar senhas, cookies, PAN, CVV ou tokens completos.
5. Revogar sessoes e rotacionar `SESSION_SECRET`, banco e credenciais do gateway.
6. Reconciliar pagamentos diretamente com o Mercado Pago.
7. Corrigir, validar em Preview isolado e restaurar backup testado quando necessario.
8. Comunicar responsaveis e usuarios conforme impacto e obrigacoes legais.
9. Documentar causa raiz e controles adicionais.

## Casos prioritarios

- Admin comprometido: revogar sessoes, trocar senha/secrets, revisar estornos, planos e auditoria.
- Chave Mercado Pago exposta: revogar no provedor, pausar checkout, substituir variavel e revisar webhooks.
- Alteracao financeira indevida: bloquear estornos, conciliar transacoes e preservar pagamentos originais.
- Webhook abusado: trocar segredo, bloquear origem, revisar `PaymentWebhookEvent` e reprocessar eventos validos.
- Banco comprometido: isolar, rotacionar credenciais, restaurar e invalidar todas as sessoes.

A acao emergencial de encerramento global pode ser executada removendo as sessoes `AppSession` no banco e rotacionando `SESSION_SECRET` para invalidar o fallback assinado.
