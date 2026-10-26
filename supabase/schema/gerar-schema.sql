-- Gera o DDL do schema `public` lendo o catálogo do Postgres.
--
-- Alternativa ao dump-schema.sh quando não há a senha do banco à mão: roda
-- pelo SQL Editor do painel ou pelo MCP do Supabase (`execute_sql`) e devolve
-- uma única coluna `ddl`, que vai para supabase/schema/schema.sql.
--
-- Cobre tabelas, constraints, índices, RLS, policies, funções e triggers
-- (inclusive os de auth.users que chamam funções de public). Não cobre grants,
-- extensões nem buckets do Storage.

with
tabelas as (
  select c.oid, c.relname
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
),
colunas as (
  select t.relname,
         string_agg(
           format('  %I %s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
                  case when a.attnotnull then ' not null' else '' end,
                  coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '')),
           E',\n' order by a.attnum) as cols
  from tabelas t
  join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = t.oid and d.adnum = a.attnum
  group by t.relname
),
restricoes as (
  select t.relname,
         string_agg(format('  constraint %I %s', o.conname, pg_get_constraintdef(o.oid)),
                    E',\n' order by o.contype desc, o.conname) as cons
  from tabelas t
  join pg_constraint o on o.conrelid = t.oid
  where o.contype <> 'f' -- FKs vão depois de todas as tabelas, ver bloco 2
  group by t.relname
),
blocos as (
  -- 1. tabelas
  select 1 as ordem, c.relname as chave,
         format(E'create table public.%I (\n%s%s\n);', c.relname, c.cols,
                coalesce(E',\n' || r.cons, '')) as ddl
  from colunas c left join restricoes r using (relname)

  -- 2. foreign keys, para o arquivo rodar em qualquer ordem de tabela
  union all
  select 2, t.relname || o.conname,
         format('alter table public.%I add constraint %I %s;',
                t.relname, o.conname, pg_get_constraintdef(o.oid))
  from tabelas t
  join pg_constraint o on o.conrelid = t.oid and o.contype = 'f'

  -- 3. índices que não nascem de constraint
  union all
  select 3, i.tablename || i.indexname, i.indexdef || ';'
  from pg_indexes i
  where i.schemaname = 'public'
    and not exists (select 1 from pg_constraint o
                    where o.conindid = (quote_ident(i.schemaname) || '.' || quote_ident(i.indexname))::regclass)

  -- 4. RLS
  union all
  select 4, c.relname,
         format('alter table public.%I enable row level security;', c.relname)
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relrowsecurity

  -- 5. funções
  union all
  select 5, p.proname, pg_get_functiondef(p.oid) || ';'
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'

  -- 6. triggers (de public e os de auth.users que chamam public)
  union all
  select 6, tg.tgname, pg_get_triggerdef(tg.oid) || ';'
  from pg_trigger tg
  join pg_proc p on p.oid = tg.tgfoid
  where not tg.tgisinternal and p.pronamespace = 'public'::regnamespace

  -- 7. policies
  union all
  select 7, pol.tablename || pol.policyname,
         format(E'create policy %I on public.%I\n  as %s for %s to %s%s%s;',
                pol.policyname, pol.tablename, lower(pol.permissive), lower(pol.cmd),
                array_to_string(pol.roles, ', '),
                coalesce(E'\n  using (' || pol.qual || ')', ''),
                coalesce(E'\n  with check (' || pol.with_check || ')', ''))
  from pg_policies pol
  where pol.schemaname = 'public'
)
select string_agg(ddl, E'\n\n' order by ordem, chave) as ddl
from blocos;
