-- Agenda: conexão com o Google Calendar.
--
-- Primeira integração externa do Folga. O Google é a fonte da verdade dos
-- eventos: nada de evento é copiado para cá. Esta tabela guarda SÓ as
-- credenciais OAuth da conta conectada.
--
-- Uma linha por usuário (user_id é a primary key). O app é single-user, então
-- na prática é uma linha só; a PK evita duplicata numa reconexão.
--
-- ⚠️ SEGURANÇA — esta tabela foge do padrão do projeto DE PROPÓSITO:
--
--   • RLS LIGADA e ZERO POLICIES. No Postgres isso nega tudo para anon e
--     authenticated. Foi exatamente esse estado que causou o incidente de
--     2026-08-16 nas tabelas do núcleo; aqui ele é intencional. O refresh token
--     do Google não pode chegar ao navegador, e a anon key está no bundle do
--     cliente — uma policy "normal" (user_id = auth.uid()) deixaria o token
--     legível por qualquer select do front.
--
--   • Quem lê e escreve é só a service_role, dentro das rotas em
--     src/app/api/google/**. Ver src/lib/server/supabaseAdmin.ts e
--     src/lib/server/googleContas.ts.
--
--   • O status da conexão é servido por GET /api/google/status, não por select
--     direto do cliente. Se alguém "consertar" isso criando uma policy aqui, o
--     refresh token vira legível pelo navegador.
--
--   • Os tokens entram cifrados em AES-256-GCM (src/lib/server/cripto.ts). O
--     banco guarda 'v1.<iv>.<ciphertext>'. Trocar GOOGLE_TOKEN_ENC_KEY torna os
--     tokens ilegíveis — o conserto é reconectar a conta nas Configurações.
--
-- Sem coluna workspace_id: é legado do app, não replicar em tabela nova.
--
-- Não há tabela de `state` do OAuth: o state é assinado com HMAC
-- (GOOGLE_OAUTH_STATE_SECRET) e carrega o user_id, então não precisa de estado
-- no banco nem de limpeza periódica. Ver src/lib/server/googleOauth.ts.

create table if not exists public.google_accounts (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  google_sub              text        not null,        -- id estável da conta Google
  email                   text        not null,        -- só para exibir na UI
  refresh_token_cifrado   text        not null,
  access_token_cifrado    text,
  access_token_expira_em  timestamptz,
  escopos                 text        not null default '',
  calendario_id           text        not null default 'primary',
  fuso                    text        not null default 'America/Sao_Paulo',
  status                  text        not null default 'ativa',  -- 'ativa' | 'revogada'
  conectada_em            timestamptz not null default now(),
  atualizada_em           timestamptz not null default now()
);

-- Sem índice em user_id: aqui ele É a primary key, e a PK já cria o índice.
-- (Nas outras tabelas do projeto user_id é FK, por isso o <tabela>_user_id_idx.)

alter table public.google_accounts enable row level security;

-- Cinto e suspensório: sem os grants, um select do PostgREST nem chega ao
-- avaliador de RLS.
revoke all on public.google_accounts from anon, authenticated;

-- delete_user_account() precisa conhecer a tabela nova. Na prática o
-- `on delete cascade` de auth.users já cobriria (o delete de auth.users é o
-- último passo), mas deixar explícito evita depender dessa ordem.
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  delete from public.google_accounts where user_id = auth.uid();
  delete from public.expenses   where user_id = auth.uid();
  delete from public.members    where user_id = auth.uid();
  delete from public.workspaces where owner_id = auth.uid();
  delete from public.settings   where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$function$;
