-- Aplicada em 2026-08-16 via MCP do Supabase.
--
-- O app virou assistente pessoal de um usuário só: não existe mais
-- compartilhamento. Remove as tabelas e limpa a função de exclusão de conta,
-- que referenciava as duas e quebraria assim que elas sumissem.
--
-- Dados perdidos: nenhum relevante. `shares` estava com 0 linhas e
-- `invite_links` só tinha 3 links de convite já sem destino.
--
-- ATENÇÃO: o `cascade` do passo 2 derrubou todas as policies de expenses,
-- members, settings e workspaces, que referenciavam `shares`. Isso deixou as
-- quatro tabelas com RLS ligado e nenhuma policy — todo SELECT voltando vazio.
-- Corrigido em 20260816_restore_rls_policies_after_shares_drop.sql, que precisa
-- ser aplicada junto com esta.

-- 1. Recriar delete_user_account() sem os passos de compartilhamento
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

-- 2. Dropar as tabelas órfãs (cascade leva junto as policies de RLS)
drop table if exists public.invite_links cascade;
drop table if exists public.shares cascade;
