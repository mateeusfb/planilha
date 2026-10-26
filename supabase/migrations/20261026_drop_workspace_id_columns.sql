-- Remove as colunas `workspace_id` (fase 2 de 2).
--
-- Só aplicar DEPOIS que o deploy sem `workspace_id: null` nos inserts estiver
-- no ar (src/lib/store.tsx e src/hooks/useNotifications.ts). Antes disso, todo
-- insert do app em produção falha com "column workspace_id does not exist".
--
-- Pré-requisito: 20261026_drop_workspaces_user_subscriptions.sql (tira as FKs).
-- Em 2026-10-26 a coluna estava nula em todas as linhas das 10 tabelas.
-- Nenhuma policy, view ou função usa a coluna.

-- Os índices compostos com workspace_id somem junto com a coluna; recria só a
-- parte útil antes, para as consultas por usuário não ficarem sem índice.
create index if not exists idx_investments_user_id    on public.investments (user_id);
create index if not exists idx_investment_goals_user  on public.investment_goals (user_id);
create index if not exists idx_notifications_user_month
  on public.notifications (user_id, month);
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id) where (read = false);

drop index if exists public.idx_investments_user_ws;
drop index if exists public.idx_goals_user_ws;
drop index if exists public.idx_notifications_user_ws_month;
drop index if exists public.idx_notifications_unread;
drop index if exists public.idx_expenses_workspace;
drop index if exists public.idx_members_workspace_id;
drop index if exists public.idx_settings_workspace_id;
drop index if exists public.idx_goals_workspace_id;

alter table public.members                drop column if exists workspace_id;
alter table public.expenses               drop column if exists workspace_id;
alter table public.investments            drop column if exists workspace_id;
alter table public.recurring_expenses     drop column if exists workspace_id;
alter table public.notifications          drop column if exists workspace_id;
alter table public.investment_goals       drop column if exists workspace_id;
alter table public.settings               drop column if exists workspace_id;
alter table public.goals                  drop column if exists workspace_id;
alter table public.investment_withdrawals drop column if exists workspace_id;
alter table public.investment_snapshots   drop column if exists workspace_id;
