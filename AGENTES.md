# Folga — Contexto para Agentes

## Sobre o Produto
Folga é um SaaS de controle financeiro com workspaces pessoal, familiar e empresarial.

- **Stack:** Next.js 16, Supabase (auth + database + storage), Tailwind CSS, deploy na Vercel
- **Repo:** github.com/mateeusfb/planilha
- **Fundador:** Mateus Fernandes (operação solo)

## Features Atuais
- Autenticação via Supabase (email/senha)
- Lançamentos de receitas e despesas por membro
- Membros familiares com rateio de gastos
- Metas e orçamento por categoria
- Despesas recorrentes com auto-geração mensal
- Exportação PDF e CSV
- Filtro por período (mensal)
- Dicas financeiras automáticas baseadas nos dados
- Temas visuais (dark mode)

## Estrutura do Projeto
```
src/
├── app/              # Rotas Next.js (page.tsx, layout.tsx)
│   ├── convite/      # Página de convite familiar
│   └── privacidade/  # Política de privacidade
├── components/       # Componentes React
│   ├── AnalysisPage  # Página de análises e gráficos
│   ├── AuthPage      # Login/cadastro
│   ├── Dashboard     # Painel principal
│   ├── SummaryPage   # Resumo financeiro
│   ├── Sidebar       # Menu lateral
│   ├── PeriodFilter  # Filtro de período
│   └── DeleteModal   # Modal de exclusão
├── lib/              # Utilitários
│   ├── supabase.ts   # Cliente Supabase
│   ├── tips.ts       # Gerador de dicas financeiras
│   └── types.ts      # Tipos TypeScript centralizados
└── styles/           # CSS global
```

## Roadmap Futuro
- Espaço de planejamento com especialistas (viagens, investimentos, compras altas)
- Workspaces empresarial
- Planos pagos (free/pro/familiar)

## Aquisição
- Conteúdo orgânico no TikTok e Instagram
- Foco em educar sobre finanças e mostrar o produto em uso

## Concorrentes
Mobills, Organizze, Cumbuca, Guiabolso

## Banco de Agentes Disponíveis

| Agente | Responsabilidade |
|--------|-----------------|
| **Desenvolvedor Frontend** | Bugs, features, UI/UX no código Next.js/React |
| **Desenvolvedor Backend** | Supabase, banco de dados, APIs, migrations, RLS |
| **Designer UI/UX** | Wireframes, fluxos, decisões visuais, protótipos |
| **Copywriter** | Textos do app, onboarding, landing page, notificações |
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
