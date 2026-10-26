-- Schema `public` do Folga — gerado do banco de produção em 2026-10-26.
--
-- Fonte: supabase/schema/gerar-schema.sql rodado via MCP (lê o catálogo do
-- Postgres; não é deduzido do código). Para atualizar, rode o gerador de novo
-- e substitua este arquivo inteiro — não edite à mão.
--
-- Não inclui: grants, extensões, o bucket `avatars` do Storage (ver README) e
-- os schemas gerenciados pelo Supabase (auth, storage, realtime).
-- As FKs referenciam tabelas sem prefixo; rode com `public` no search_path.

create table public.announcement_reads (
  user_id uuid not null,
  announcement_id uuid not null,
  read_at timestamp with time zone not null default now(),
  constraint announcement_reads_pkey PRIMARY KEY (user_id, announcement_id)
);

create table public.expenses (
  id text not null,
  type text not null,
  description text not null,
  category text not null,
  value numeric not null,
  month text not null,
  payment text default '-'::text,
  installment integer default 0,
  installment_current integer default 0,
  installment_group_id text,
  member_id text not null default 'all'::text,
  note text,
  conjunta_group_id text,
  conjunta_name text,
  created_at bigint,
  user_id uuid,
  purchase_date text,
  bank text,
  paid_status text not null default 'pending'::text,
  constraint expenses_pkey PRIMARY KEY (id)
);

create table public.goals (
  id text not null,
  user_id uuid not null,
  type text not null,
  title text not null,
  description text,
  target_value numeric not null default 0,
  current_value numeric not null default 0,
  category text,
  member_id text,
  deadline date,
  status text not null default 'active'::text,
  icon text default 'target'::text,
  color text default '#2563eb'::text,
  created_at bigint not null default ((EXTRACT(epoch FROM now()) * (1000)::numeric))::bigint,
  constraint goals_pkey PRIMARY KEY (id),
  constraint goals_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'failed'::text]))),
  constraint goals_type_check CHECK ((type = ANY (ARRAY['saving'::text, 'limit'::text, 'income'::text])))
);

create table public.google_accounts (
  user_id uuid not null,
  google_sub text not null,
  email text not null,
  refresh_token_cifrado text not null,
  access_token_cifrado text,
  access_token_expira_em timestamp with time zone,
  escopos text not null default ''::text,
  calendario_id text not null default 'primary'::text,
  fuso text not null default 'America/Sao_Paulo'::text,
  status text not null default 'ativa'::text,
  conectada_em timestamp with time zone not null default now(),
  atualizada_em timestamp with time zone not null default now(),
  constraint google_accounts_pkey PRIMARY KEY (user_id)
);

create table public.investment_goals (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  target_value numeric not null default 0,
  current_value numeric not null default 0,
  deadline text,
  icon text not null default '🎯'::text,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  linked_investment_ids text[] default '{}'::text[],
  constraint investment_goals_pkey PRIMARY KEY (id)
);

create table public.investment_snapshots (
  id uuid not null default gen_random_uuid(),
  user_id text not null,
  month text not null,
  total_invested numeric not null default 0,
  total_current numeric not null default 0,
  created_at timestamp with time zone default now(),
  constraint investment_snapshots_user_id_month_key UNIQUE (user_id, month),
  constraint investment_snapshots_pkey PRIMARY KEY (id)
);

create table public.investment_withdrawals (
  id uuid not null default gen_random_uuid(),
  investment_id uuid not null,
  user_id uuid not null,
  amount numeric(12,2) not null,
  date text not null,
  reason text,
  created_at timestamp with time zone default now(),
  constraint investment_withdrawals_pkey PRIMARY KEY (id)
);

create table public.investments (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  type text not null,
  amount_invested numeric not null default 0,
  current_value numeric not null default 0,
  purchase_date text,
  maturity_date text,
  notes text,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint investments_pkey PRIMARY KEY (id),
  constraint investments_type_check CHECK ((type = ANY (ARRAY['renda_fixa'::text, 'renda_variavel'::text, 'crypto'::text, 'previdencia'::text, 'poupanca'::text, 'outros'::text])))
);

create table public.members (
  id text not null,
  name text not null,
  color text not null default '#2563eb'::text,
  photo text,
  is_conjunta boolean default false,
  user_id uuid,
  constraint members_pkey PRIMARY KEY (id)
);

create table public.notifications (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  month text not null,
  type text not null,
  icon text not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint notifications_pkey PRIMARY KEY (id),
  constraint notifications_type_check CHECK ((type = ANY (ARRAY['good'::text, 'info'::text, 'warn'::text, 'bad'::text])))
);

create table public.recurring_expenses (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  description text not null,
  category text not null,
  value numeric(12,2) not null,
  payment text not null default 'Credito'::text,
  bank text,
  member_id text not null default 'all'::text,
  day_of_month integer not null default 1,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint recurring_expenses_pkey PRIMARY KEY (id)
);

create table public.recurring_generated (
  recurring_id uuid not null,
  month text not null,
  expense_id text not null,
  constraint recurring_generated_pkey PRIMARY KEY (recurring_id, month)
);

create table public.settings (
  id integer not null default 1,
  custom_cats text[] default '{}'::text[],
  custom_payments text[] default '{}'::text[],
  active_month text,
  user_id uuid not null,
  custom_banks jsonb default '[]'::jsonb,
  table_columns jsonb,
  category_budgets jsonb default '{}'::jsonb,
  monthly_budgets jsonb default '{}'::jsonb,
  constraint settings_pkey PRIMARY KEY (user_id)
);

create table public.system_announcements (
  id uuid not null default gen_random_uuid(),
  type text not null default 'info'::text,
  icon text not null default 'i'::text,
  title text not null,
  body text not null,
  active boolean not null default true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint system_announcements_pkey PRIMARY KEY (id),
  constraint system_announcements_type_check CHECK ((type = ANY (ARRAY['good'::text, 'info'::text, 'warn'::text, 'bad'::text])))
);

create table public.user_profiles (
  user_id uuid not null,
  phone text,
  gender text,
  birth_date text,
  city text,
  occupation text,
  updated_at timestamp with time zone not null default now(),
  avatar_url text,
  constraint user_profiles_pkey PRIMARY KEY (user_id),
  constraint user_profiles_gender_check CHECK (((gender IS NULL) OR (gender = ANY (ARRAY['masculino'::text, 'feminino'::text, 'outro'::text, 'prefiro_nao_dizer'::text]))))
);

alter table public.announcement_reads add constraint announcement_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES system_announcements(id) ON DELETE CASCADE;

alter table public.announcement_reads add constraint announcement_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.expenses add constraint expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.goals add constraint goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.google_accounts add constraint google_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.investment_goals add constraint investment_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.investments add constraint investments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.members add constraint members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.notifications add constraint notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.recurring_expenses add constraint recurring_expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.recurring_generated add constraint recurring_generated_recurring_id_fkey FOREIGN KEY (recurring_id) REFERENCES recurring_expenses(id) ON DELETE CASCADE;

alter table public.settings add constraint settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.user_profiles add constraint user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_announcement_reads_user ON public.announcement_reads USING btree (user_id);

CREATE INDEX idx_expenses_user_id ON public.expenses USING btree (user_id);

CREATE INDEX idx_goals_user_id ON public.goals USING btree (user_id);

CREATE INDEX idx_investment_goals_user ON public.investment_goals USING btree (user_id);

CREATE INDEX idx_investments_user_id ON public.investments USING btree (user_id);

CREATE INDEX idx_members_user_id ON public.members USING btree (user_id);

CREATE INDEX idx_notifications_user_month ON public.notifications USING btree (user_id, month);

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id) WHERE (read = false);

alter table public.announcement_reads enable row level security;

alter table public.expenses enable row level security;

alter table public.goals enable row level security;

alter table public.google_accounts enable row level security;

alter table public.investment_goals enable row level security;

alter table public.investment_snapshots enable row level security;

alter table public.investment_withdrawals enable row level security;

alter table public.investments enable row level security;

alter table public.members enable row level security;

alter table public.notifications enable row level security;

alter table public.recurring_expenses enable row level security;

alter table public.recurring_generated enable row level security;

alter table public.settings enable row level security;

alter table public.system_announcements enable row level security;

alter table public.user_profiles enable row level security;

CREATE OR REPLACE FUNCTION public.delete_user_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

create policy "Users manage own announcement reads" on public.announcement_reads
  as permissive for all to public
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users can manage own expenses" on public.expenses
  as permissive for all to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)))
  with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy goals_delete on public.goals
  as permissive for delete to public
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy goals_insert on public.goals
  as permissive for insert to public
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy goals_update on public.goals
  as permissive for update to public
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users manage own goals" on public.investment_goals
  as permissive for all to public
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy delete_own_snapshots on public.investment_snapshots
  as permissive for delete to public
  using (((( SELECT auth.uid() AS uid))::text = user_id));

create policy insert_own_snapshots on public.investment_snapshots
  as permissive for insert to public
  with check (((( SELECT auth.uid() AS uid))::text = user_id));

create policy select_own_snapshots on public.investment_snapshots
  as permissive for select to public
  using (((( SELECT auth.uid() AS uid))::text = user_id));

create policy update_own_snapshots on public.investment_snapshots
  as permissive for update to public
  using (((( SELECT auth.uid() AS uid))::text = user_id));

create policy "Users manage own withdrawals" on public.investment_withdrawals
  as permissive for all to public
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users manage own investments" on public.investments
  as permissive for all to public
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users can manage own members" on public.members
  as permissive for all to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)))
  with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "Users manage own notifications" on public.notifications
  as permissive for all to public
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users can manage own recurring expenses" on public.recurring_expenses
  as permissive for all to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)))
  with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "Users can manage own recurring generated" on public.recurring_generated
  as permissive for all to authenticated
  using ((recurring_id IN ( SELECT recurring_expenses.id
   FROM recurring_expenses
  WHERE (recurring_expenses.user_id = ( SELECT auth.uid() AS uid)))))
  with check ((recurring_id IN ( SELECT recurring_expenses.id
   FROM recurring_expenses
  WHERE (recurring_expenses.user_id = ( SELECT auth.uid() AS uid)))));

create policy "Users can manage own settings" on public.settings
  as permissive for all to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)))
  with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "Anyone can read active announcements" on public.system_announcements
  as permissive for select to public
  using (((active = true) AND ((expires_at IS NULL) OR (expires_at > now()))));

create policy "Users manage own profile" on public.user_profiles
  as permissive for all to public
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));
