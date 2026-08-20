# Folga

App de controle financeiro pessoal. Privado e single-user: um login, um espaço,
todas as funcionalidades liberadas.

Next.js 16 (App Router + Turbopack) · React 19 · TypeScript · Tailwind 4 ·
Supabase (auth + banco + storage) · deploy na Vercel.

## Começando

```bash
cp .env.example .env.local   # preencha com as credenciais do Supabase
npm install
npm run dev                  # http://localhost:3000
```

As credenciais ficam no painel do Supabase, em **Project Settings → API**.
Sem `.env.local` o build falha em `supabaseUrl is required`.

Não existe tela de cadastro — usuários são criados no painel do Supabase, em
**Authentication → Users**.

## Comandos

| Comando | O quê |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Sobe o build de produção |
| `npm run test:run` | Vitest, uma passada |
| `npm test` | Vitest em watch |
| `npm run lint` | ESLint |

## O que o app faz

Lançamentos de receita e despesa por membro, com rateio de contas conjuntas ·
status pago/pendente/adiado · parcelamento e recorrências com auto-geração
mensal · orçamento previsto vs. realizado · investimentos com metas, retiradas
e snapshots · gráficos e fechamento do mês · dicas financeiras automáticas ·
agenda ligada ao Google Calendar · exportação PDF e CSV · dark mode.

## Agenda (Google Calendar)

A área **Agenda** fala direto com a API do Google: mostra os compromissos,
responde convites e cria reuniões que **enviam convite de verdade** para os
participantes, com link do Google Meet. O Google é a fonte da verdade — nenhum
evento é copiado para o banco.

É a única parte do app com código de servidor: as rotas em
`src/app/api/google/**` guardam o OAuth, porque o `client_secret` e o refresh
token não podem ir para o navegador. Sem as variáveis do Google no `.env.local`
o resto do app roda normal; só a Agenda fica indisponível.

Para ligar: siga o bloco "Agenda / Google Calendar" do `.env.example`, aplique a
migration `supabase/migrations/20260819_google_calendar_contas.sql` e conecte a
conta em **Configurações → Google Agenda**.

⚠️ No Google Cloud, **publique o app OAuth em produção**. Em modo Teste o Google
invalida a autorização a cada 7 dias e você teria que reconectar toda semana.

## Onde mexer

- `src/lib/navigation.ts` — fonte única da navegação. Área nova = uma entrada
  em `AREAS`; sidebar, topbar e URLs saem daí.
- `src/lib/store.tsx` — estado global e toda a persistência no Supabase.
- `supabase/README.md` — tabelas, armadilhas do banco e histórico de migrations.
- `src/lib/server/` — o único código que roda no servidor (OAuth do Google).
  Todo arquivo ali começa com `import 'server-only'`.
- `AGENTES.md` — contexto de produto e negócio.
