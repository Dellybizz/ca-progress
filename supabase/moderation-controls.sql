-- CA Progress moderation permissions, timed chat blocks and member directory.
-- Run after admin-hierarchy-members-payments.sql. No existing data is deleted.

create table if not exists public.admin_moderation_permissions (
  admin_user_id uuid not null references public.admin_users(user_id) on delete cascade,
  permission_type text not null check (permission_type in ('chat','announcement')),
  channel text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (admin_user_id, permission_type, channel)
);

create table if not exists public.chat_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  blocked_until timestamptz not null,
  reason text not null default 'Community guideline violation',
  violation_notice text not null default 'Your chat access has been temporarily restricted because of a community guideline violation.',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists chat_blocks_active_lookup
  on public.chat_blocks(user_id,channel,blocked_until desc);

alter table public.admin_moderation_permissions enable row level security;
alter table public.chat_blocks enable row level security;

create or replace function public.can_moderate_channel(permission_kind text, requested_channel text)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.admin_users a
    where a.user_id=auth.uid()
      and (
        a.role in ('parent_owner','owner','admin')
        or (
          a.role='moderator' and exists(
            select 1 from public.admin_moderation_permissions p
            where p.admin_user_id=a.user_id
              and p.permission_type=permission_kind
              and p.channel in (requested_channel,'*')
          )
        )
      )
  );
$$;

drop policy if exists "moderation permissions readable" on public.admin_moderation_permissions;
create policy "moderation permissions readable" on public.admin_moderation_permissions
for select using (admin_user_id=auth.uid() or public.is_admin(array['owner','admin']));

drop policy if exists "chat blocks readable" on public.chat_blocks;
create policy "chat blocks readable" on public.chat_blocks
for select using (
  user_id=auth.uid()
  or public.can_moderate_channel('chat',channel)
);

grant select on public.admin_moderation_permissions, public.chat_blocks to authenticated;
revoke insert,update,delete on public.admin_moderation_permissions, public.chat_blocks from authenticated;

create or replace function public.set_moderation_permission(
  target_admin_id uuid,
  permission_kind text,
  requested_channel text,
  enabled boolean
)
returns void
language plpgsql security definer set search_path=public
as $$
declare actor_role text; target_role text;
begin
  select role into actor_role from public.admin_users where user_id=auth.uid();
  select role into target_role from public.admin_users where user_id=target_admin_id;
  if actor_role not in ('parent_owner','owner') then
    raise exception 'Only Owners can assign moderator permissions';
  end if;
  if target_role <> 'moderator' then
    raise exception 'Channel permissions are assigned only to Moderators';
  end if;
  if permission_kind not in ('chat','announcement') or trim(requested_channel)='' then
    raise exception 'Invalid moderation permission';
  end if;
  if enabled then
    insert into public.admin_moderation_permissions(admin_user_id,permission_type,channel,created_by)
    values(target_admin_id,permission_kind,requested_channel,auth.uid())
    on conflict do nothing;
  else
    delete from public.admin_moderation_permissions
    where admin_user_id=target_admin_id and permission_type=permission_kind and channel=requested_channel;
  end if;
  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'moderator.permission_changed','admin_user',target_admin_id::text,
    jsonb_build_object('type',permission_kind,'channel',requested_channel,'enabled',enabled));
end;
$$;

create or replace function public.block_chat_user(
  target_user_id uuid,
  requested_channel text,
  duration_hours integer,
  block_reason text default 'Community guideline violation'
)
returns timestamptz
language plpgsql security definer set search_path=public
as $$
declare until_time timestamptz;
begin
  if duration_hours not in (1,8,24,48) then
    raise exception 'Block duration must be 1, 8, 24 or 48 hours';
  end if;
  if target_user_id=auth.uid() then raise exception 'You cannot block yourself'; end if;
  if not public.can_moderate_channel('chat',requested_channel) then
    raise exception 'You do not have permission to moderate this channel';
  end if;
  until_time:=now()+make_interval(hours=>duration_hours);
  -- Permission is checked against the channel where the violation happened,
  -- but the resulting restriction applies across every community chat.
  insert into public.chat_blocks(user_id,channel,blocked_until,reason,created_by)
  values(target_user_id,'*',until_time,coalesce(nullif(trim(block_reason),''),'Community guideline violation'),auth.uid());
  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'chat.user_blocked','auth_user',target_user_id::text,
    jsonb_build_object('source_channel',requested_channel,'block_scope','all_chats','hours',duration_hours,'blocked_until',until_time));
  return until_time;
end;
$$;

-- Enforce blocks and protect announcement channels even if a client bypasses the UI.
create or replace function public.enforce_community_message_rules()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if exists(
    select 1 from public.chat_blocks b
    where b.user_id=auth.uid() and b.blocked_until>now()
      and b.channel in (new.channel,'*')
  ) then
    raise exception 'Your chat access is temporarily restricted';
  end if;
  if new.channel like '%-announcements'
     and not public.can_moderate_channel('announcement',new.channel) then
    raise exception 'Only an authorised moderator can publish announcements';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_community_message_rules_trigger on public.community_messages;
create trigger enforce_community_message_rules_trigger
before insert on public.community_messages
for each row execute function public.enforce_community_message_rules();

drop policy if exists "moderators delete community messages" on public.community_messages;
drop policy if exists "authorised moderators delete community messages" on public.community_messages;
create policy "authorised moderators delete community messages"
on public.community_messages for delete
using (public.can_moderate_channel('chat',channel));

grant execute on function public.can_moderate_channel(text,text) to authenticated;
grant execute on function public.set_moderation_permission(uuid,text,text,boolean) to authenticated;
grant execute on function public.block_chat_user(uuid,text,integer,text) to authenticated;

-- Member directory fallback. Keeps auth.users private while returning only admin-safe fields.
create or replace function public.admin_list_members()
returns table(
  id uuid,
  name text,
  email text,
  phone text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  plan_id uuid,
  plan_name text,
  plan_slug text,
  subscription_status text,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql security definer set search_path=public,auth
as $$
begin
  if not public.is_admin(array['owner','admin']) then
    raise exception 'Member directory access is restricted';
  end if;
  return query
  select u.id,
    coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',u.raw_user_meta_data->>'display_name','CA Student'),
    u.email::text,u.phone::text,u.created_at,u.last_sign_in_at,
    s.plan_id,p.name,p.slug,s.status,s.starts_at,s.ends_at
  from auth.users u
  left join public.user_subscriptions s on s.user_id=u.id
  left join public.subscription_plans p on p.id=s.plan_id
  order by u.created_at desc;
end;
$$;

grant execute on function public.admin_list_members() to authenticated;
