-- Performance de RLS: envolve auth.uid() em (select ...) para que o Postgres
-- avalie a função uma vez por query (InitPlan) em vez de uma vez por linha.
-- Referência: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Cobre os 15 avisos `auth_rls_initplan` do linter em 2026-08-14. As policies são
-- recriadas com o mesmo comando, os mesmos roles e a mesma semântica — a única
-- diferença é o (select ...) em volta de auth.uid().

-- ── announcement_reads ──
drop policy if exists "Users manage own announcement reads" on public.announcement_reads;
create policy "Users manage own announcement reads" on public.announcement_reads
  for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── investment_goals ──
drop policy if exists "Users manage own goals" on public.investment_goals;
create policy "Users manage own goals" on public.investment_goals
  for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── investments ──
drop policy if exists "Users manage own investments" on public.investments;
create policy "Users manage own investments" on public.investments
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

-- Sem WITH CHECK, como no original: o USING vale também para a linha nova.
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

-- ── user_profiles ──
drop policy if exists "Users manage own profile" on public.user_profiles;
create policy "Users manage own profile" on public.user_profiles
  for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── recurring_expenses (role authenticated) ──
drop policy if exists "Users can manage own recurring expenses" on public.recurring_expenses;
create policy "Users can manage own recurring expenses" on public.recurring_expenses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── recurring_generated (role authenticated) ──
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

-- ── user_subscriptions ──
drop policy if exists users_read_own_subscription on public.user_subscriptions;
create policy users_read_own_subscription on public.user_subscriptions
  for select to public
  using ((select auth.uid()) = user_id);

drop policy if exists users_insert_own_subscription on public.user_subscriptions;
create policy users_insert_own_subscription on public.user_subscriptions
  for insert to public
  with check ((select auth.uid()) = user_id);

-- Sem WITH CHECK, como no original.
drop policy if exists users_update_own_subscription on public.user_subscriptions;
create policy users_update_own_subscription on public.user_subscriptions
  for update to public
  using ((select auth.uid()) = user_id);
