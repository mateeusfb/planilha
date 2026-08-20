# Folga — Contexto para Agentes

> Atualizado em 2026-08-19, após o refactor que removeu workspaces, cadastro,
> compartilhamento e planos pagos.

## Sobre o Produto

Folga é um app de **controle financeiro pessoal**. Hoje é **privado e
single-user**: não tem cadastro aberto, não tem workspaces, não tem planos.
Um login, um espaço, todas as funcionalidades liberadas.

- **Stack:** Next.js 16.3 (App Router + Turbopack) · React 19.2 · TypeScript 5.9 · Tailwind 4 · Supabase (auth + banco + storage) · deploy na Vercel
- **Repo:** github.com/mateeusfb/planilha
- **Fundador:** Mateus Fernandes (operação solo)

### O que já foi removido — não sugerir de volta sem decisão explícita

Workspaces · cadastro/signup (só login) · compartilhamento e convites ·
consentimento de privacidade · planos free/pro/familiar · landing page ·
preview admin. Saíram nos commits de 2026-08-16. As tabelas `workspaces` e
`user_subscriptions` ainda existem no banco, órfãs.

## Features Atuais

- Login por email/senha (Supabase Auth) — sem tela de cadastro
- Lançamentos de receita e despesa, com membros e rateio de contas conjuntas
- Status **pago / pendente / adiado** por lançamento, com ação em lote
- Parcelamento e despesas recorrentes com auto-geração mensal (nunca retroativa)
- Orçamento por categoria: previsto vs. realizado, geral e por mês
- Investimentos: aportes, metas, retiradas/resgates e snapshots mensais
- Análises com gráficos (Chart.js) e fechamento do mês
- Dicas financeiras automáticas a partir dos lançamentos (`src/lib/tips.ts`)
- Sino de notificações: dicas do assistente + comunicados do sistema + reuniões
  do dia e convites sem resposta
- **Agenda** ligada ao Google Calendar: ver compromissos em lista, semana ou
  mês, responder convites e criar reuniões que enviam convite de verdade, com
  link do Google Meet
- Exportação PDF (jsPDF) e CSV
- Filtro por período: mês, presets (7/15/30 dias) ou intervalo customizado
- Dark mode e onboarding
- Cache em `localStorage`: se o Supabase cair, o app renderiza o último estado

## Rodando o projeto

```bash
cp .env.example .env.local   # e preencha com as credenciais do Supabase
npm install
npm run dev                  # http://localhost:3000
```

| Comando | O quê |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção — **falha sem as env vars** |
| `npm run test:run` | Vitest, uma passada |
| `npm run lint` | ESLint |

Sem `.env.local` o build morre em `supabaseUrl is required`. Como o signup foi
removido, usuários novos precisam ser criados no painel do Supabase
(Authentication → Users).

## Estrutura do Projeto

```
src/
├── app/                       # Rotas (App Router)
│   ├── page.tsx               # Raiz → redireciona para /inicio
│   ├── inicio/                # Dashboard
│   ├── financeiro/[[...tab]]/ # Área financeira, abas via catch-all opcional
│   ├── agenda/[[...tab]]/     # Agenda e Convites
│   ├── api/google/            # ⭐ Único código de servidor: OAuth + Calendar
│   ├── perfil/
│   └── configuracoes/
├── components/
│   ├── AppRoot.tsx            # Casca: auth, layout, roteamento de página
│   ├── AuthPage.tsx           # Login (sem cadastro)
│   ├── Dashboard.tsx          # Início
│   ├── ExpensesPage.tsx       # Lançamentos
│   ├── ClosingPage.tsx        # Fechamento do mês
│   ├── AnalysisPage.tsx       # Gráficos
│   ├── BudgetPage.tsx         # Orçamento previsto vs. realizado
│   ├── InvestmentsPage.tsx    # Investimentos, metas e retiradas
│   ├── AgendaPage.tsx · AgendaConvitesPage.tsx
│   ├── agenda/                # EventoCard · EventoModal · ProximosCompromissos
│   ├── SettingsPage.tsx · ProfilePage.tsx
│   ├── Sidebar.tsx · UserMenu.tsx · NotificationBell.tsx · PeriodFilter.tsx
│   └── ui/Tabs.tsx
├── hooks/
│   ├── useExpenseForm.ts
│   ├── useEventosAgenda.ts
│   └── useNotifications.ts
├── lib/
│   ├── store.tsx              # ⭐ Estado global + toda a persistência Supabase
│   ├── auth.tsx               # Sessão e login
│   ├── navigation.ts          # ⭐ Fonte única da navegação
│   ├── agenda.tsx             # Conexão Google + próximos compromissos
│   ├── apiFolga.ts            # Ponte do cliente com as rotas de API
│   ├── google/                # Puro: tempo.ts · mapear.ts · erros.ts · tipos.ts
│   ├── server/                # ⭐ Só no servidor (import 'server-only')
│   ├── supabase.ts · storage.ts · export.ts · tips.ts
│   ├── helpers.ts · constants.ts · theme.tsx · types.ts
└── __tests__/                 # Vitest: financial, helpers, tips, agenda (122 testes)
```

### Navegação

`src/lib/navigation.ts` é a **fonte única**. A sidebar lista **áreas**; as
sub-telas de cada área viram abas horizontais no topo. Criar uma área nova é
acrescentar uma entrada em `AREAS` — sidebar, título do topbar e URLs saem
daí. Não espalhe rotas fora desse arquivo.

Hoje: **Início** (tela única), **Financeiro** (Lançamentos · Fechamento ·
Análise · Orçamento · Investimentos) e **Agenda** (Agenda · Convites).
`/perfil` e `/configuracoes` são telas de sistema: têm URL, mas não aparecem na
sidebar.

### Agenda e a camada de servidor

A Agenda é o único lugar do app com código de servidor, e é uma exceção
consciente ao "tudo no cliente": o `client_secret` do Google e o refresh token
não podem ir para o navegador.

- **O Google é a fonte da verdade.** Nenhum evento é copiado para o Supabase —
  não existe sincronização bidirecional para dar errado.
- **`src/lib/server/`** só é importável do servidor (`import 'server-only'`) e é
  o único caminho até a tabela `google_accounts`, que tem RLS ligada e nenhuma
  policy de propósito. Ver `supabase/README.md`.
- **Autenticação das rotas**: a sessão vive no localStorage, então o cliente
  manda o access token do Supabase no header `Authorization` e a rota valida com
  `auth.getUser()`. Não migramos para `@supabase/ssr` — seria refatorar o login
  inteiro para ganhar algo que o app não usa.
- **`sendUpdates=all`** é o que faz o Google disparar os e-mails de convite;
  **`conferenceDataVersion=1`** é o que faz o link do Meet existir. Sem eles a
  API responde 200 e não faz nem uma coisa nem outra.
- **Responder convite reenvia a lista inteira de convidados.** Mandar só o
  próprio apaga todos os outros da reunião — por isso `corpoDeRsvp` é testado.
- **No Google Cloud o app OAuth precisa estar publicado em produção**; em modo
  Teste a autorização morre a cada 7 dias.

### Estado

`src/lib/store.tsx` concentra estado e persistência. Ao montar, dispara as
queries em duas ondas paralelas (não em sequência) para o skeleton sair rápido.
Mudanças em settings viram `upsert` com `onConflict: 'user_id'`. O estado
inteiro é espelhado em `localStorage` com debounce de 500ms.

## Banco de dados

Ver **`supabase/README.md`** — tabelas, armadilhas e o incidente de RLS de
2026-08-16 (um `drop cascade` derrubou todas as policies e zerou o app sem
gerar um único erro).

⚠️ **O schema real não está versionado.** `supabase/schema/baseline-reconstruido.sql`
é uma reconstrução deduzida do código, não um dump. Rode
`./supabase/dump-schema.sh` para gerar o autoritativo.

## Roadmap Futuro

- Substituir a reconstrução do schema por um dump real
- Espaço de planejamento com especialistas (viagens, investimentos, compras altas)
- Limpar `workspace_id`, `workspaces` e `user_subscriptions` do banco

## Aquisição

Conteúdo orgânico no TikTok e Instagram — educar sobre finanças e mostrar o
produto em uso.

## Concorrentes

Mobills, Organizze, Cumbuca, Guiabolso

## Banco de Agentes Disponíveis

| Agente | Responsabilidade |
|--------|-----------------|
| **Desenvolvedor Frontend** | Bugs, features, UI/UX no código Next.js/React |
| **Desenvolvedor Backend** | Supabase, banco de dados, APIs, migrations, RLS |
| **Designer UI/UX** | Wireframes, fluxos, decisões visuais, protótipos |
| **Copywriter** | Textos do app, onboarding, notificações |
| **Growth Hacker** | Aquisição, conversão, retenção, experimentos |
| **Social Media** | Conteúdo TikTok/Instagram, calendário editorial, roteiros |
| **Analista Financeiro** | Pricing, projeções, unit economics, métricas SaaS |
| **QA/Tester** | Testes, bugs, edge cases, qualidade |
| **Product Manager** | Roadmap, priorização, specs de features |

## Regras Gerais

- Mateus opera sozinho — nunca sobrecarregar com múltiplas frentes
- Priorizar o que gera resultado nos próximos 30 dias
- Sempre testar no localhost antes de deploy
- Manter o código simples e direto, sem over-engineering
- Antes de `drop ... cascade` no banco, conferir dependências:
  `select * from pg_policies where qual::text ilike '%tabela%'`
