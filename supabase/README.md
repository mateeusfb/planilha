# Banco de dados — Folga

Supabase (Postgres + Auth + Storage). Tudo isolado por `user_id` via RLS.

## Estado do versionamento

| O quê | Onde | Autoritativo? |
|---|---|---|
| Estrutura das tabelas | `schema/baseline-reconstruido.sql` | ❌ deduzido do código |
| Policies de RLS | `migrations/*.sql` + o baseline | ✅ cópia do que rodou em produção |
| Bucket `avatars` | só no painel | ❌ não versionado |

**O schema real nunca foi versionado.** As tabelas foram criadas direto no
painel do Supabase e via MCP; as migrations do repo são só ajustes posteriores
de RLS. Se o projeto Supabase for perdido, a estrutura não é recuperável a
partir deste repositório.

`schema/baseline-reconstruido.sql` é uma rede de segurança provisória: acerta
nomes de tabelas e colunas, mas **não garante** tipos, defaults, índices e
constraints. Troque por um dump real assim que possível.

## Gerar o dump autoritativo

```bash
export SUPABASE_DB_URL='postgresql://postgres.<ref>:<senha>@<host>:6543/postgres'
./supabase/dump-schema.sh
```

A URL fica em **Project Settings → Database → Connection string → URI**
(marque *Use connection pooling* e substitua `[YOUR-PASSWORD]`). O script só lê
o banco. Depois de rodar, confira o diff contra a reconstrução, apague o
baseline se o dump cobrir tudo, e commite `schema/schema.sql`.

## Migrations aplicadas

Rodaram **direto em produção via MCP do Supabase**, não por CLI — o histórico
aqui é documental, não um estado que o CLI saiba reproduzir.

| Arquivo | O que fez |
|---|---|
| `20260814_rls_initplan_select_auth_uid.sql` | Envolveu `auth.uid()` em `(select …)` nas 15 policies apontadas pelo linter. Ganho de performance: o Postgres passa a avaliar a função uma vez por query em vez de uma vez por linha. |
| `20260816_drop_sharing_tables_single_user.sql` | Dropou `shares` e `invite_links` e reescreveu `delete_user_account()`. **Causou incidente** — ver abaixo. |
| `20260816_restore_rls_policies_after_shares_drop.sql` | Correção do incidente. Aplicar sempre junto com a anterior. |
| `security-fixes-2026-07-20.sql` | Varredura de segurança de julho. |
| `20260819_google_calendar_contas.sql` | Criou `google_accounts` (tokens da Agenda) e acrescentou a tabela ao `delete_user_account()`. Única tabela com RLS ligada e **zero policies** de propósito — ver abaixo. |

### Incidente de 2026-08-16 — vale reler antes de qualquer `drop cascade`

O `drop table public.shares cascade` derrubou junto **todas** as policies de
`expenses`, `members`, `settings` e `workspaces`: elas referenciavam `shares`
para liberar acesso compartilhado, então o cascade as tratou como dependentes.

As quatro tabelas ficaram com RLS ligado e zero policies — no Postgres isso
significa negar tudo. O app continuou carregando **sem erro nenhum**, só que
com todo SELECT voltando vazio: dashboard zerado, nenhum lançamento, nenhum
membro. Nenhum dado foi perdido, só ficou inacessível.

Antes de dropar qualquer objeto, confira o que depende dele:

```sql
select * from pg_policies where qual::text ilike '%nome_da_tabela%';
```

## Tabelas

**Núcleo:** `expenses` · `members` · `settings`
**Recorrências:** `recurring_expenses` · `recurring_generated`
**Investimentos:** `investments` · `investment_goals` · `investment_withdrawals` · `investment_snapshots`
**Notificações:** `notifications` · `system_announcements` · `announcement_reads`
**Perfil:** `user_profiles`
**Agenda:** `google_accounts`
**Legado (existem, o app não usa):** `workspaces` · `user_subscriptions`

### `google_accounts` — a exceção deliberada de RLS

É a única tabela com **RLS ligada e nenhuma policy**, o que no Postgres nega
tudo. É intencional: ela guarda o refresh token do Google, e a anon key está no
bundle do navegador — uma policy `user_id = auth.uid()` deixaria o token legível
pelo front. Quem acessa é só a service_role, dentro das rotas em
`src/app/api/google/**` (`src/lib/server/supabaseAdmin.ts`). Os tokens ainda
entram cifrados em AES-256-GCM.

O status da conexão sai por `GET /api/google/status`, não por select do cliente.
**Criar uma policy aqui "para consertar" reabre exatamente o buraco que a
ausência dela fecha.**

### Armadilhas conhecidas

- **`investment_snapshots.user_id` é `text`**, não `uuid` — todas as outras
  tabelas usam `uuid`. Por isso as policies dela fazem `(auth.uid())::text`.
- **`expenses.created_at` é `bigint` em milissegundos** (`Date.now()`), não
  `timestamptz`. Já `notifications.created_at` é `timestamptz`. Não misture.
- **`expenses.member_id` aceita o valor `'all'`**, que não existe em `members`
  — é um pseudo-membro de UI. Por isso não há foreign key nessa coluna.
- **`workspace_id` sobrevive em várias tabelas** e o app sempre grava `null`.
  Resquício dos workspaces removidos; só limpar depois de confirmar que está
  toda nula.
- **Exclusão de investimento e meta é *soft delete*** (`active = false`), não
  `DELETE`. As queries filtram por `active = true`.
- **`recurring_generated` é a trava de idempotência** das recorrências. Se
  esvaziar essa tabela, a auto-geração duplica os lançamentos do mês.

## Storage

Bucket público **`avatars`**, caminho `{user_id}/{member_id}.webp`. As imagens
são redimensionadas para 200px e convertidas em WebP no cliente antes do upload
(`src/lib/storage.ts`). Buckets não saem no dump de schema — se recriar o
projeto, recrie o bucket pelo painel.
