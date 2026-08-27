-- CA Progress: protected admin hierarchy, member directory support and payments.
-- Run once after admin-panel.sql. Existing users, progress and subscriptions are preserved.

-- Extend the administrator role constraint with one protected parent owner.
alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('parent_owner','owner','admin','moderator'));

-- Promote the earliest existing owner only when no parent owner exists yet.
update public.admin_users
set role = 'parent_owner'
where user_id = (
  select user_id from public.admin_users
  where role = 'owner'
  order by created_at asc
  limit 1
)
and not exists (
  select 1 from public.admin_users where role = 'parent_owner'
);

create unique index if not exists admin_users_one_parent_owner
  on public.admin_users ((role))
  where role = 'parent_owner';

-- Parent owner satisfies every admin check. Other roles must be requested explicitly.
create or replace function public.is_admin(
  required_roles text[] default array['owner','admin','moderator']
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and (role = 'parent_owner' or role = any(required_roles))
  );
$$;

-- All role edits pass through this function. NULL removes access entirely.
create or replace function public.manage_admin(
  target_user_id uuid,
  new_role text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  target_role text;
begin
  if actor_id is null then
    raise exception 'Sign in is required';
  end if;

  select role into actor_role from public.admin_users where user_id = actor_id;
  select role into target_role from public.admin_users where user_id = target_user_id;

  if actor_role not in ('parent_owner','owner') then
    raise exception 'Only an owner can manage administrator access';
  end if;

  if target_user_id = actor_id then
    raise exception 'You cannot change or remove your own administrator role';
  end if;

  if new_role is not null and new_role not in ('owner','admin','moderator') then
    raise exception 'Invalid administrator role';
  end if;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'No Supabase user exists with this UID';
  end if;

  if target_role = 'parent_owner' then
    raise exception 'The parent owner can only be changed with transfer_parent_owner';
  end if;

  if actor_role = 'owner' then
    if target_role = 'owner' or new_role = 'owner' then
      raise exception 'Owners cannot appoint, demote or remove another owner';
    end if;
  end if;

  if new_role is null then
    delete from public.admin_users where user_id = target_user_id;
    insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
    values (actor_id,'admin.removed','admin_user',target_user_id::text,
      jsonb_build_object('previous_role',target_role));
  else
    insert into public.admin_users(user_id,role,created_by)
    values (target_user_id,new_role,actor_id)
    on conflict (user_id) do update set role = excluded.role;
    insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
    values (actor_id,'admin.role_changed','admin_user',target_user_id::text,
      jsonb_build_object('previous_role',target_role,'new_role',new_role));
  end if;
end;
$$;

-- Atomic handover: the caller becomes owner only after the new parent is appointed.
create or replace function public.transfer_parent_owner(new_parent_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
begin
  if not exists (
    select 1 from public.admin_users
    where user_id = actor_id and role = 'parent_owner'
  ) then
    raise exception 'Only the parent owner can transfer parent ownership';
  end if;

  if new_parent_user_id = actor_id then
    raise exception 'Choose a different user as the new parent owner';
  end if;

  if not exists (select 1 from auth.users where id = new_parent_user_id) then
    raise exception 'No Supabase user exists with this UID';
  end if;

  -- Temporarily remove the old row so the unique parent-owner index remains valid.
  update public.admin_users set role = 'owner' where user_id = actor_id;
  insert into public.admin_users(user_id,role,created_by)
  values (new_parent_user_id,'parent_owner',actor_id)
  on conflict (user_id) do update set role = 'parent_owner';

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values (actor_id,'parent_owner.transferred','admin_user',new_parent_user_id::text,
    jsonb_build_object('previous_parent',actor_id));
end;
$$;

-- Prevent browser clients from bypassing manage_admin/transfer_parent_owner.
revoke insert, update, delete on public.admin_users from authenticated;
grant select on public.admin_users to authenticated;
grant execute on function public.manage_admin(uuid,text) to authenticated;
grant execute on function public.transfer_parent_owner(uuid) to authenticated;

-- Payment orders are written only by trusted server routes using service_role.
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  provider text not null default 'razorpay',
  provider_order_id text unique not null,
  provider_payment_id text,
  amount_paise integer not null check (amount_paise >= 0),
  currency text not null default 'INR',
  status text not null default 'created'
    check (status in ('created','paid','failed','refunded')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.payment_orders enable row level security;

drop policy if exists "payment orders read own" on public.payment_orders;
create policy "payment orders read own"
on public.payment_orders for select
using (user_id = auth.uid() or public.is_admin(array['owner','admin']));

grant select on public.payment_orders to authenticated;
revoke insert, update, delete on public.payment_orders from anon, authenticated;

