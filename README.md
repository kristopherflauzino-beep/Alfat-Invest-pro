# ALFATEC INVEST PRO

Plataforma web premium para análise de investimentos, carteira, comparador, Radar IA, relatórios e administração de clientes.

## Login padrão do administrador

- Usuário: Flauzino
- Senha: Kfc@admin

As credenciais não aparecem na tela de login.

## Ajuste desta versão

- Menu lateral fixo no desktop.
- Menu lateral recolhível no celular/tablet.
- Administração separada em dois grupos: Área do cliente e Administração.
- Topo mais limpo mostrando apenas o módulo ativo.
- Admin mantém acesso total às funções do cliente e às funções administrativas.
- Cliente continua vendo somente os menus liberados pelo administrador.
- Modo escuro aplicado em toda a estrutura do menu, cabeçalho e conteúdo.

## Como rodar

```powershell
cd "C:\Users\Kristopher Cunha\Downloads\alfatec-invest-pro"
npm install
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Build

```powershell
npm run build
```

## Ajuste visual - modo escuro e marca

- Campos de texto, senhas, seletores e pesquisas agora ficam com texto claro no modo escuro.
- O nome visual da plataforma foi simplificado para INVEST PRO.
- O menu lateral e a tela de login mantêm o logo transparente e o título visível no modo escuro.
