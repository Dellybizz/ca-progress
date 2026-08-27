-- Owner-only subscriptions and timed pinned announcements.
-- Run after moderation-controls.sql. Existing subscriptions/messages are preserved.

drop policy if exists "subscriptions managed by admins" on public.user_subscriptions;
drop policy if exists "subscriptions managed by owners" on public.user_subscriptions;
create policy "subscriptions managed by owners" on public.user_subscriptions for all
using(public.is_admin(array['owner']))
with check(public.is_admin(array['owner']));

create table if not exists public.community_announcements (
  message_id uuid primary key references public.community_messages(id) on delete cascade,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.community_announcements enable row level security;
drop policy if exists "announcements readable" on public.community_announcements;
create policy "announcements readable" on public.community_announcements for select
using(expires_at is null or expires_at>now() or public.is_admin());
grant select on public.community_announcements to anon,authenticated;
revoke insert,update,delete on public.community_announcements from authenticated;

create or replace function public.publish_timed_announcement(
  requested_channel text,
  announcement_message text,
  announcement_expires_at timestamptz default null
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare new_id uuid;
begin
  if not public.can_moderate_channel('announcement',requested_channel) then
    raise exception 'You do not have permission to publish in this announcement channel';
  end if;
  if requested_channel not like '%-announcements' then
    raise exception 'Choose an announcement channel';
  end if;
  if trim(announcement_message)='' then raise exception 'Announcement cannot be empty'; end if;
  insert into public.community_messages(user_id,display_name,channel,message)
  values(auth.uid(),'CA Progress Admin',requested_channel,trim(announcement_message))
  returning id into new_id;
  insert into public.community_announcements(message_id,expires_at,created_by)
  values(new_id,announcement_expires_at,auth.uid());
  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'announcement.published','community_message',new_id::text,
    jsonb_build_object('channel',requested_channel,'expires_at',announcement_expires_at));
  return new_id;
end;
$$;

create or replace function public.delete_announcement(target_message_id uuid)
returns void
language plpgsql security definer set search_path=public
as $$
declare target_channel text;
begin
  select channel into target_channel from public.community_messages where id=target_message_id;
  if target_channel is null then raise exception 'Announcement not found'; end if;
  if not public.can_moderate_channel('announcement',target_channel) then
    raise exception 'You do not have permission to delete this announcement';
  end if;
  delete from public.community_messages where id=target_message_id;
  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'announcement.deleted','community_message',target_message_id::text,
    jsonb_build_object('channel',target_channel));
end;
$$;

grant execute on function public.publish_timed_announcement(text,text,timestamptz) to authenticated;
grant execute on function public.delete_announcement(uuid) to authenticated;

