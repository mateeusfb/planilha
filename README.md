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
exportação PDF e CSV · dark mode.

## Onde mexer

- `src/lib/navigation.ts` — fonte única da navegação. Área nova = uma entrada
  em `AREAS`; sidebar, topbar e URLs saem daí.
- `src/lib/store.tsx` — estado global e toda a persistência no Supabase.
- `supabase/README.md` — tabelas, armadilhas do banco e histórico de migrations.
- `AGENTES.md` — contexto de produto e negócio.
