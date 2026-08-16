-- Aplicada em 2026-08-16 via MCP do Supabase, logo após
-- 20260816_drop_sharing_tables_single_user.sql.
--
-- CORREÇÃO DE INCIDENTE. O `drop table public.shares cascade` da migration
-- anterior derrubou junto TODAS as policies de expenses, members, settings e
-- workspaces — elas referenciavam `shares` para liberar o acesso compartilhado,
-- então o cascade as considerou dependentes.
--
-- Resultado: as quatro tabelas ficaram com RLS ligado e ZERO policies, o que no
-- Postgres significa negar tudo. O app continuou carregando sem erro nenhum,
-- só que com todo SELECT voltando vazio — dashboard zerado, nenhum lançamento,
-- nenhum membro. Nenhum dado foi perdido; só ficou inacessível.
--
-- Lição: antes de `drop ... cascade`, conferir o que depende do objeto
-- (`select * from pg_policies where qual::text ilike '%tabela%'`).
--
-- As policies são recriadas na forma single-user, sem compartilhamento, no
-- mesmo padrão da migration 20260814: `for all to authenticated` e
-- `(select auth.uid())`, para o planner avaliar uma vez por query em vez de
-- uma vez por linha.

drop policy if exists "Users can manage own expenses" on public.expenses;
create policy "Users can manage own expenses" on public.expenses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can manage own members" on public.members;
create policy "Users can manage own members" on public.members
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can manage own settings" on public.settings;
create policy "Users can manage own settings" on public.settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can manage own workspaces" on public.workspaces;
create policy "Users can manage own workspaces" on public.workspaces
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
