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

A unica opcao apresentada ao cliente e `Pagar com Mercado Pago`, que abre em nova aba:

```text
https://link.mercadopago.com.br/alfatecinvestpro
```

O sistema nao usa credenciais do Mercado Pago, nao cria cobrancas por API e nao confirma pagamentos automaticamente. O clique registra uma solicitacao com status `Aguardando confirmacao`. O cliente pode informar os dados nao sensiveis da transacao, e somente o administrador pode conferir e ativar o plano manualmente.
