-- delete_user_account(): fechar as duas tabelas que ficavam órfãs.
--
-- Aplicada em produção via MCP do Supabase em 2026-08-31.
--
-- O que já funcionava: 13 tabelas têm FK para auth.users com ON DELETE CASCADE
-- (expenses, members, settings, workspaces, goals, investments,
-- investment_goals, notifications, announcement_reads, recurring_expenses,
-- user_profiles, user_subscriptions, google_accounts), e recurring_generated
-- cascateia via recurring_expenses. Os deletes explícitos que já existiam são
-- redundantes com o cascade, mas ficam: documentam a intenção e não custam nada.
--
-- O que NÃO funcionava: investment_snapshots e investment_withdrawals não têm
-- FK nenhuma, então sobreviviam à exclusão da conta. O botão "Excluir minha
-- conta e todos os dados" das Configurações prometia mais do que entregava.
--
-- Por que delete explícito em vez de criar as FKs:
--   • investment_snapshots.user_id é TEXT, não uuid — não dá para referenciar
--     auth.users(id) sem migrar o tipo da coluna e reescrever as policies de
--     RLS que comparam com auth.uid()::text. Custo alto para um app de um
--     usuário só.
--   • investment_withdrawals.user_id é uuid e aceitaria a FK, mas manter as
--     duas no mesmo lugar deixa a função sendo a lista completa do que sai.
--
-- Ordem importa: os explícitos vêm antes do delete em auth.users, que é quem
-- dispara o cascade e some com o resto.

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
  delete from public.workspaces where owner_id = auth.uid();
  delete from public.settings   where user_id = auth.uid();

  -- Dispara o ON DELETE CASCADE nas outras 13 tabelas.
  delete from auth.users where id = auth.uid();
end;
$function$;
