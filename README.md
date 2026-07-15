# ALFATEC INVEST PRO

Plataforma de analise de investimentos com perfis de administrador e cliente, mercado, carteira, oportunidades, comparador, Radar IA, Valuation Graham, Metodos AlfaTec FIIs, Cripto e Carteira, planos e financeiro.

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

O estado operacional usa PostgreSQL quando `DATABASE_URL` esta configurada e pode utilizar o Vercel Blob ja vinculado ao projeto. Contas, carteiras, perfis, planos e solicitacoes de assinatura permanecem compartilhados entre dispositivos.

## Metodo AlfaTec Cripto

A pagina `/metodo-alfatec-cripto` abre o menu dedicado. O metodo usa dados identificados da CoinGecko, pesos por categoria, oito pilares, confianca, riscos, comparacao, Oportunidades, Comparador, Radar IA e relatorios. Dados ausentes nao sao convertidos em zero.

## Metodo AlfaTec Carteira

O menu `Analise e Balanceamento` compara a carteira atual com a carteira-alvo. Inclui questionario, Perfil AlfaTec de Carteira, bandas de tolerancia, score, concentracao, reserva de emergencia, renda, simulacao de aportes e historico. Nenhuma ordem de compra ou venda e executada.

## Pagamento pelo link oficial

A única opção apresentada ao cliente é `Pagar com Mercado Pago`, no link oficial:

```text
https://link.mercadopago.com.br/alfatecinvestpro
```

O clique cria uma intenção válida por 24 horas e abre o Mercado Pago em nova aba. Somente depois disso o cliente pode solicitar verificação. O pagamento precisa ser confirmado e a assinatura ativada manualmente pelo administrador; abrir ou retornar do link nunca libera o plano.

## Notificações e e-mail

O menu `Notificações` possui sino com contador, filtros, leitura, exclusão e preferências por assunto. Eventos essenciais de plano, pagamento, assinatura e segurança permanecem ativos. Consulte [EMAIL_SETUP.md](./EMAIL_SETUP.md) para configurar o SMTP privado na Vercel.

## Recuperação de senha

O login oferece `Esqueci minha senha`. O token é aleatório, armazenado apenas como hash, expira em 30 minutos, aceita um único uso e revoga as sessões anteriores após a redefinição.
