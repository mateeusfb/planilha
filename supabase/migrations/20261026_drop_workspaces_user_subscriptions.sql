-- Remove o legado de workspaces e planos (fase 1 de 2).
--
-- O código que usava `workspaces` e `user_subscriptions` saiu em 2026-08-16
-- (f4c138d9) e 2026-03 (41e5dfa0). Estado conferido antes de aplicar:
--   - `workspaces`: 0 linhas;
--   - `user_subscriptions`: 1 linha (plano 'business' de 2026-03-23, sem leitor);
--   - `workspace_id`: nulo em todas as linhas das 10 tabelas que têm a coluna.
--
-- As colunas `workspace_id` ficam para a fase 2: o app em produção ainda manda
-- `workspace_id: null` nos inserts, e derrubar a coluna antes do deploy faria
-- todo insert falhar. Aqui só caem as FKs que apontam para `workspaces`.
--
-- Dependências conferidas: nenhuma policy fora das próprias tabelas, nenhuma
-- view, e as duas únicas funções que citam as tabelas são tratadas abaixo.
-- Mesmo assim, sem `cascade` — ver o incidente de 2026-08-16 no README.
--
-- Para recriar (não deve ser preciso):
--   workspaces(id uuid pk default gen_random_uuid(), owner_id uuid not null
--     references auth.users on delete cascade, name text not null,
--     icon text default '📁', created_at timestamptz default now())
--   user_subscriptions(user_id uuid pk references auth.users on delete cascade,
--     plan text not null default 'free' check (plan in ('free','pro','business')),
--     status text not null default 'active'
--       check (status in ('active','cancelled','expired')),
--     created_at timestamptz not null default now(),
--     updated_at timestamptz not null default now())

-- Primeiro tira a referência de dentro da função, senão ela quebra no próximo uso.
create or replace function public.delete_user_account()
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  -- Sem FK: só saem daqui.
  delete from public.investment_withdrawals where user_id = auth.uid();
  delete from public.investment_snapshots   where user_id = auth.uid()::text;

  -- Redundantes com o cascade, mantidos por clareza.
  delete from public.google_accounts where user_id = auth.uid();
  delete from public.expenses   where user_id = auth.uid();
  delete from public.members    where user_id = auth.uid();
  delete from public.settings   where user_id = auth.uid();

  -- Dispara o ON DELETE CASCADE nas outras tabelas.
  delete from auth.users where id = auth.uid();
end;
$function$;

-- Plano padrão criado a cada novo usuário.
drop trigger if exists on_auth_user_created_subscription on auth.users;
drop function if exists public.create_default_subscription();

drop table if exists public.user_subscriptions;
drop function if exists public.update_subscription_updated_at();

alter table public.members          drop constraint if exists members_workspace_id_fkey;
alter table public.expenses         drop constraint if exists expenses_workspace_id_fkey;
alter table public.settings         drop constraint if exists settings_workspace_id_fkey;
alter table public.goals            drop constraint if exists goals_workspace_id_fkey;
alter table public.notifications    drop constraint if exists notifications_workspace_id_fkey;
alter table public.investments      drop constraint if exists investments_workspace_id_fkey;
alter table public.investment_goals drop constraint if exists investment_goals_workspace_id_fkey;

drop table if exists public.workspaces;
