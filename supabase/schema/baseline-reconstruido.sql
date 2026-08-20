-- ============================================================================
-- Folga — baseline do schema (RECONSTRUÇÃO A PARTIR DO CÓDIGO)
-- ============================================================================
--
-- ⚠️  ESTE ARQUIVO NÃO É AUTORITATIVO.
--
-- O schema real do banco nunca foi versionado: as tabelas foram criadas
-- direto no painel do Supabase / via MCP, e as únicas migrations no repo são
-- ajustes de RLS posteriores. Se o projeto Supabase for perdido, não há como
-- recriar a estrutura.
--
-- Este arquivo é uma rede de segurança provisória, deduzida de:
--   • src/lib/types.ts            (formato do domínio)
--   • src/lib/store.tsx           (nomes exatos das colunas nos inserts/selects)
--   • src/hooks/useNotifications.ts
--   • src/components/ProfilePage.tsx
--   • supabase/migrations/*.sql   (policies de RLS reais, aplicadas em produção)
--
-- O que ele acerta: nomes de tabelas, nomes de colunas e as policies de RLS
-- (essas vieram das migrations reais, não de dedução).
-- O que ele NÃO garante: tipos exatos, defaults, NOT NULLs, índices, foreign
-- keys, triggers e constraints. Foram inferidos pelo uso no código.
--
-- ➜  SUBSTITUA ESTE ARQUIVO POR UM DUMP REAL assim que tiver as credenciais.
--    Instruções em supabase/README.md (`./supabase/dump-schema.sh`).
--
-- Seguro rodar contra o banco atual: tudo é `if not exists` / `or replace`.
-- Nada aqui apaga dado ou derruba objeto existente.
--
-- Trechos marcados com «?» são os pontos de menor confiança — confira contra
-- o dump real.
-- ============================================================================

-- ── Extensões ──
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ============================================================================
-- 1. Perfil do usuário
-- ============================================================================

create table if not exists public.user_profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  phone       text,
  gender      text,
  birth_date  date,
  city        text,
  occupation  text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);
-- upsert usa user_id como chave de conflito (ProfilePage.tsx)

-- ============================================================================
-- 2. Núcleo financeiro
-- ============================================================================

-- Membros do orçamento (pessoas + "contas conjuntas").
-- id é gerado no cliente (crypto.randomUUID) e enviado no insert — daí não ter
-- default. O id reservado 'all' nunca é persistido, é só um filtro de UI.
create table if not exists public.members (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid,                        -- «?» legado: o app sempre grava null
  name          text not null,
  color         text not null,
  photo         text,
  is_conjunta   boolean not null default false
);

create index if not exists members_user_id_idx on public.members (user_id);

-- Lançamentos (receitas e despesas).
-- ATENÇÃO ao created_at: é bigint com epoch em MILISSEGUNDOS (Date.now()),
-- não timestamptz. Ver expenseToRow() em src/lib/store.tsx.
create table if not exists public.expenses (
  id                    text primary key,     -- gerado no cliente
  user_id               uuid not null references auth.users(id) on delete cascade,
  workspace_id          uuid,                 -- «?» legado: sempre null
  type                  text not null,        -- 'income' | 'expense'
  description           text not null,
  category              text not null,
  value                 numeric not null,
  month                 text not null,        -- 'YYYY-MM'
  payment               text not null,
  installment           integer not null default 0,
  installment_current   integer not null default 0,
  installment_group_id  text,
  member_id             text not null,        -- id de members, ou 'all'
  note                  text,
  purchase_date         date,                 -- 'YYYY-MM-DD'
  conjunta_group_id     text,
  conjunta_name         text,
  bank                  text,
  paid_status           text not null default 'pending',  -- 'pending'|'paid'|'postponed'
  created_at            bigint not null       -- epoch em ms «?»
);

create index if not exists expenses_user_id_idx    on public.expenses (user_id);
create index if not exists expenses_user_month_idx on public.expenses (user_id, month);
create index if not exists expenses_member_id_idx  on public.expenses (member_id);

-- Preferências e orçamentos. Uma linha por usuário.
create table if not exists public.settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  custom_cats      jsonb not null default '[]'::jsonb,
  custom_payments  jsonb not null default '[]'::jsonb,
  custom_banks     jsonb not null default '[]'::jsonb,
  table_columns    jsonb,
  category_budgets jsonb not null default '{}'::jsonb,   -- { categoria: valor }
  monthly_budgets  jsonb not null default '{}'::jsonb,   -- { 'YYYY-MM': { categoria: valor } }
  active_month     text
);
-- O upsert em store.tsx usa onConflict: 'user_id' — a unicidade acima é obrigatória.

-- ============================================================================
-- 3. Recorrências
-- ============================================================================

create table if not exists public.recurring_expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid,                        -- «?» legado: sempre null
  description   text not null,
  category      text not null,
  value         numeric not null,
  payment       text not null,
  bank          text,
  member_id     text not null,
  day_of_month  integer not null,
  active        boolean not null default true
);

create index if not exists recurring_expenses_user_id_idx on public.recurring_expenses (user_id);

-- Trava de idempotência: registra que a recorrência X já virou lançamento no
-- mês Y, para a auto-geração no load não duplicar.
create table if not exists public.recurring_generated (
  id            uuid primary key default gen_random_uuid(),   -- «?»
  recurring_id  uuid not null references public.recurring_expenses(id) on delete cascade,
  month         text not null,               -- 'YYYY-MM'
  expense_id    text                         -- id em expenses
);

create unique index if not exists recurring_generated_unique_idx
  on public.recurring_generated (recurring_id, month);

-- ============================================================================
-- 4. Investimentos
-- ============================================================================

create table if not exists public.investments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  workspace_id    uuid,                      -- «?» legado: sempre null
  name            text not null,
  type            text not null,             -- renda_fixa|renda_variavel|crypto|previdencia|poupanca|outros
  amount_invested numeric not null default 0,
  current_value   numeric not null default 0,
  purchase_date   date,
  maturity_date   date,
  notes           text,
  active          boolean not null default true   -- exclusão é soft delete
);

create index if not exists investments_user_id_idx on public.investments (user_id);

create table if not exists public.investment_goals (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  workspace_id          uuid,                -- «?» legado: sempre null
  name                  text not null,
  target_value          numeric not null default 0,
  current_value         numeric not null default 0,
  deadline              date,
  icon                  text default '🎯',
  linked_investment_ids uuid[] default '{}', -- «?» pode ser jsonb no banco real
  active                boolean not null default true   -- soft delete
);

create index if not exists investment_goals_user_id_idx on public.investment_goals (user_id);

create table if not exists public.investment_withdrawals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  workspace_id   uuid,                       -- «?» legado: sempre null
  investment_id  uuid not null references public.investments(id) on delete cascade,
  amount         numeric not null,
  date           date not null,
  reason         text,
  created_at     timestamptz not null default now()  -- «?» o código faz Number() nisto
);

create index if not exists investment_withdrawals_user_id_idx on public.investment_withdrawals (user_id);

-- Foto mensal da carteira, para o gráfico de evolução.
-- ⚠️  user_id aqui é TEXT, não uuid — divergente de todas as outras tabelas.
-- Não é dedução: as policies da migration 20260814 fazem (auth.uid())::text.
create table if not exists public.investment_snapshots (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null,
  workspace_id   uuid,                       -- «?» legado: sempre null
  month          text not null,              -- 'YYYY-MM'
  total_invested numeric not null default 0,
  total_current  numeric not null default 0,
  created_at     timestamptz not null default now()
);

create unique index if not exists investment_snapshots_user_month_idx
  on public.investment_snapshots (user_id, month);

-- ============================================================================
-- 5. Notificações e comunicados
-- ============================================================================

-- Dicas geradas pelo assistente (src/lib/tips.ts), uma leva por mês.
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid,                         -- «?» legado: sempre null
  month        text,                         -- 'YYYY-MM'
  type         text not null default 'info', -- good|info|warn|bad
  icon         text,
  title        text not null,
  body         text,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_user_month_idx on public.notifications (user_id, month);

-- Comunicados globais, escritos manualmente no painel. Leitura para todos.
create table if not exists public.system_announcements (
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'info',
  icon       text,
  title      text not null,
  body       text,
  active     boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Quais comunicados cada usuário já leu.
create table if not exists public.announcement_reads (
  user_id         uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.system_announcements(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (user_id, announcement_id)
);
-- O upsert em useNotifications.ts depende da PK composta acima.

-- ============================================================================
-- 6. Tabelas legadas — existem no banco, o app não usa mais
-- ============================================================================
-- Mantidas porque as migrations de 2026-08 ainda recriam policies para elas.
-- Só devem ser dropadas depois de confirmar que estão vazias.

create table if not exists public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  plan       text,                           -- «?» sistema de planos foi removido do app
  status     text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 7. Funções
-- ============================================================================

-- Exclusão de conta pelo próprio usuário.
-- Versão idêntica à aplicada em 20260816_drop_sharing_tables_single_user.sql.
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  delete from public.expenses where user_id = auth.uid();
  delete from public.members where user_id = auth.uid();
  delete from public.workspaces where owner_id = auth.uid();
  delete from public.settings where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$function$;

-- ============================================================================
-- 8. Row Level Security
-- ============================================================================
-- As policies abaixo NÃO são dedução: são cópia literal do estado aplicado em
-- produção, conforme supabase/migrations/20260814 e 20260816.
--
-- Padrão: (select auth.uid()) em vez de auth.uid() puro, para o Postgres
-- avaliar a função uma vez por query (InitPlan) e não uma vez por linha.

alter table public.user_profiles          enable row level security;
alter table public.members                enable row level security;
alter table public.expenses               enable row level security;
alter table public.settings               enable row level security;
alter table public.recurring_expenses     enable row level security;
alter table public.recurring_generated    enable row level security;
alter table public.investments            enable row level security;
alter table public.investment_goals       enable row level security;
alter table public.investment_withdrawals enable row level security;
alter table public.investment_snapshots   enable row level security;
alter table public.notifications          enable row level security;
alter table public.system_announcements   enable row level security;
alter table public.announcement_reads     enable row level security;
alter table public.workspaces             enable row level security;
alter table public.user_subscriptions     enable row level security;

-- ── user_profiles ──
drop policy if exists "Users manage own profile" on public.user_profiles;
create policy "Users manage own profile" on public.user_profiles
  for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── members ──
drop policy if exists "Users can manage own members" on public.members;
create policy "Users can manage own members" on public.members
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── expenses ──
drop policy if exists "Users can manage own expenses" on public.expenses;
create policy "Users can manage own expenses" on public.expenses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── settings ──
drop policy if exists "Users can manage own settings" on public.settings;
create policy "Users can manage own settings" on public.settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── recurring_expenses ──
drop policy if exists "Users can manage own recurring expenses" on public.recurring_expenses;
create policy "Users can manage own recurring expenses" on public.recurring_expenses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── recurring_generated (sem user_id próprio: herda pela recorrência dona) ──
drop policy if exists "Users can manage own recurring generated" on public.recurring_generated;
create policy "Users can manage own recurring generated" on public.recurring_generated
  for all to authenticated
  using (recurring_id in (
    select recurring_expenses.id from public.recurring_expenses
    where recurring_expenses.user_id = (select auth.uid())
  ))
  with check (recurring_id in (
    select recurring_expenses.id from public.recurring_expenses
    where recurring_expenses.user_id = (select auth.uid())
  ));

-- ── investments ──
drop policy if exists "Users manage own investments" on public.investments;
create policy "Users manage own investments" on public.investments
  for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── investment_goals ──
drop policy if exists "Users manage own goals" on public.investment_goals;
create policy "Users manage own goals" on public.investment_goals
  for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── investment_withdrawals ──
drop policy if exists "Users manage own withdrawals" on public.investment_withdrawals;
create policy "Users manage own withdrawals" on public.investment_withdrawals
  for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── investment_snapshots (user_id é text, daí o cast) ──
drop policy if exists select_own_snapshots on public.investment_snapshots;
create policy select_own_snapshots on public.investment_snapshots
  for select to public
  using (((select auth.uid())::text) = user_id);

drop policy if exists insert_own_snapshots on public.investment_snapshots;
create policy insert_own_snapshots on public.investment_snapshots
  for insert to public
  with check (((select auth.uid())::text) = user_id);

drop policy if exists update_own_snapshots on public.investment_snapshots;
create policy update_own_snapshots on public.investment_snapshots
  for update to public
  using (((select auth.uid())::text) = user_id);

drop policy if exists delete_own_snapshots on public.investment_snapshots;
create policy delete_own_snapshots on public.investment_snapshots
  for delete to public
  using (((select auth.uid())::text) = user_id);

-- ── notifications ──
drop policy if exists "Users manage own notifications" on public.notifications;
create policy "Users manage own notifications" on public.notifications
  for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── system_announcements ──
-- «?» NÃO consta em nenhuma migration. Deduzida do uso: o app lê comunicados
-- ativos sem filtro de usuário, então precisa ser leitura liberada. A escrita
-- é feita manualmente pelo painel (service_role ignora RLS).
drop policy if exists "Anyone can read active announcements" on public.system_announcements;
create policy "Anyone can read active announcements" on public.system_announcements
  for select to authenticated
  using (active = true);

-- ── announcement_reads ──
drop policy if exists "Users manage own announcement reads" on public.announcement_reads;
create policy "Users manage own announcement reads" on public.announcement_reads
  for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── workspaces (legado) ──
drop policy if exists "Users can manage own workspaces" on public.workspaces;
create policy "Users can manage own workspaces" on public.workspaces
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ── user_subscriptions (legado) ──
drop policy if exists users_read_own_subscription on public.user_subscriptions;
create policy users_read_own_subscription on public.user_subscriptions
  for select to public
  using ((select auth.uid()) = user_id);

drop policy if exists users_insert_own_subscription on public.user_subscriptions;
create policy users_insert_own_subscription on public.user_subscriptions
  for insert to public
  with check ((select auth.uid()) = user_id);

drop policy if exists users_update_own_subscription on public.user_subscriptions;
create policy users_update_own_subscription on public.user_subscriptions
  for update to public
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- 9. Storage
-- ============================================================================
-- O app usa o bucket público `avatars`, com o caminho {user_id}/{member_id}.webp
-- (src/lib/storage.ts). Buckets não saem no dump de schema do Postgres —
-- recriar pelo painel: Storage → New bucket → nome `avatars`, público.
-- As policies de storage.objects devem restringir escrita a
-- (storage.foldername(name))[1] = (select auth.uid())::text.
