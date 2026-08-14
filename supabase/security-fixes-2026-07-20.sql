-- ============================================================
-- Correções de segurança — varredura 2026-07-20
--
-- STATUS: JÁ APLICADO em 2026-07-20 via migration
-- `20260721014444 security_fixes_rls_and_function_hardening`.
-- Mantido aqui como referência. Idempotente — pode rodar de novo.
--
-- O item 3 (GRANT de delete_user_account para authenticated) é o motivo do aviso
-- `authenticated_security_definer_function_executable` no linter de segurança:
-- é intencional, o usuário logado apaga a própria conta.
--
-- Nota: as tabelas do MotoGestao (entregadores, clientes, alocacoes,
-- entregas, fechamentos) foram removidas via migration
-- `drop_motogestao_tables` — aquele projeto tem banco próprio.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CRÍTICO: investment_withdrawals sem RLS
--    Tabela exposta via PostgREST. Qualquer pessoa com a anon key
--    pode ler/inserir/apagar saques de investimento de qualquer usuário.
--    Espelha a policy de public.investments.
-- ------------------------------------------------------------
ALTER TABLE public.investment_withdrawals ENABLE ROW LEVEL SECURITY;

-- O (select ...) veio depois, em `20260814161407 rls_initplan_select_auth_uid`:
-- sem ele o Postgres reavalia auth.uid() uma vez por linha. Mantido aqui na forma
-- corrigida para que rodar este arquivo de novo não desfaça aquela migration.
DROP POLICY IF EXISTS "Users manage own withdrawals" ON public.investment_withdrawals;
CREATE POLICY "Users manage own withdrawals"
  ON public.investment_withdrawals
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- 2. Funções sem search_path fixo (search_path mutable)
--    Sem SET search_path, um schema malicioso no path pode
--    sequestrar as chamadas de função dentro do corpo.
-- ------------------------------------------------------------
ALTER FUNCTION public.update_updated_at()              SET search_path = '';
ALTER FUNCTION public.update_subscription_updated_at() SET search_path = '';
ALTER FUNCTION public.create_default_subscription()    SET search_path = '';

-- ------------------------------------------------------------
-- 3. Funções SECURITY DEFINER expostas como RPC
--    create_default_subscription é uma TRIGGER function — não deveria
--    ser chamável via /rest/v1/rpc por ninguém.
--    delete_user_account apaga a conta do chamador: faz sentido para
--    usuário logado, nunca para anon.
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.create_default_subscription() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_user_account()         FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.delete_user_account()         TO authenticated;

-- ------------------------------------------------------------
-- 4. Bucket avatars: remover SELECT amplo que permitia listar
--    todos os arquivos. Bucket é público, então o acesso por URL
--    (/object/public/) continua funcionando normalmente.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
