-- Non-destructive permissions upgrade for the Admin Operations panel.
-- Safe to run after admin-panel.sql. It does not delete or replace data.

grant usage on schema public to anon, authenticated;

grant select on
  public.subscription_plans,
  public.app_sections
to anon, authenticated;

grant select, insert, update, delete on
  public.subscription_plans,
  public.admin_users,
  public.user_subscriptions,
  public.app_sections
to authenticated;

grant select, insert on public.admin_audit_logs to authenticated;
grant usage, select on sequence public.admin_audit_logs_id_seq to authenticated;
grant select, insert, delete on public.community_messages to authenticated;
