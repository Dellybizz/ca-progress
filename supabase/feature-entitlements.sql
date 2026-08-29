-- Dynamic per-plan feature access and quota engine.
-- Non-destructive: existing plans, subscriptions, progress and messages are preserved.

create table if not exists public.app_features (
  feature_key text primary key,
  page_key text not null,
  section_key text,
  parent_feature_key text references public.app_features(feature_key),
  label text not null,
  description text not null default '',
  meter_type text not null default 'boolean'
    check (meter_type in ('boolean','minutes','megabytes','count')),
  enabled boolean not null default true,
  sort_order integer not null default 100,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_feature_limits (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  feature_key text not null references public.app_features(feature_key) on delete cascade,
  enabled boolean not null default true,
  limit_value numeric,
  limit_unit text not null default 'unlimited'
    check (limit_unit in ('unlimited','minutes','megabytes','count')),
  reset_period text not null default 'never'
    check (reset_period in ('never','daily','weekly','monthly')),
  upgrade_message text not null default 'Upgrade your plan to continue using this feature.',
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique(plan_id,feature_key)
);

create table if not exists public.feature_usage_windows (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null references public.app_features(feature_key) on delete cascade,
  period_start timestamptz not null,
  started_at timestamptz,
  used_value numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key(user_id,feature_key,period_start)
);

create table if not exists public.note_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  object_key text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check(size_bytes>=0),
  status text not null default 'ready' check(status in ('pending','ready','deleted')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

insert into public.app_features(feature_key,page_key,section_key,parent_feature_key,label,description,meter_type,sort_order)
values
('dashboard.view','dashboard',null,null,'Dashboard access','Open the preparation dashboard','boolean',10),
('community.view','community',null,null,'Community access','Open Community and read permitted channels','boolean',20),
('community.chat','community','native-content','community.view','Send chat messages','Time available for participating in Community chat','minutes',30),
('community.attachments','community','native-content','community.chat','Chat media and files','Upload images and documents in chat','megabytes',40),
('subjects.view','subjects',null,null,'Subjects access','View subject progress','boolean',50),
('chapters.track','chapters','native-content',null,'Chapter tracking','Tick chapters, revisions and tests','count',60),
('analytics.view','analytics','native-content',null,'Analytics access','View study analytics','boolean',70),
('study-sessions.manage','study-sessions','native-content',null,'Study sessions','Create study-session records','count',80),
('goals.manage','goals','native-content',null,'Goals','Create and manage goals','count',90),
('test-series.manage','test-series','native-content',null,'Test records','Create and manage test scores','count',100),
('calendar.manage','calendar','native-content',null,'Calendar','Create calendar entries','count',110),
('activity.view','activity','native-content',null,'Activity history','View saved progress history','boolean',120),
('notes.manage','notes','native-content',null,'Text notes','Create and edit text notes','count',130),
('notes.storage','notes','native-content','notes.manage','Notes file storage','Upload personal note files','megabytes',140),
('settings.manage','settings','native-content',null,'Settings','Manage account and course settings','boolean',150)
on conflict(feature_key) do update set
  page_key=excluded.page_key,section_key=excluded.section_key,parent_feature_key=excluded.parent_feature_key,
  label=excluded.label,description=excluded.description,meter_type=excluded.meter_type,sort_order=excluded.sort_order;

-- Every plan receives a rule for every feature. Existing customised rules are preserved.
insert into public.plan_feature_limits(plan_id,feature_key,enabled,limit_value,limit_unit,reset_period)
select p.id,f.feature_key,true,null,'unlimited','never'
from public.subscription_plans p cross join public.app_features f
on conflict(plan_id,feature_key) do nothing;

-- Practical starting allowances. Owners/Admins can change all values later.
update public.plan_feature_limits r set limit_value=10,limit_unit='minutes',reset_period='monthly'
from public.subscription_plans p where r.plan_id=p.id and p.slug='free' and r.feature_key='community.chat'
  and r.limit_unit='unlimited';
update public.plan_feature_limits r set limit_value=100,limit_unit='megabytes',reset_period='never'
from public.subscription_plans p where r.plan_id=p.id and p.slug='free' and r.feature_key='notes.storage'
  and r.limit_unit='unlimited';
update public.plan_feature_limits r set limit_value=1024,limit_unit='megabytes',reset_period='never'
from public.subscription_plans p where r.plan_id=p.id and p.slug='pro' and r.feature_key='notes.storage'
  and r.limit_unit='unlimited';
update public.plan_feature_limits r set limit_value=5120,limit_unit='megabytes',reset_period='never'
from public.subscription_plans p where r.plan_id=p.id and p.slug='premium' and r.feature_key='notes.storage'
  and r.limit_unit='unlimited';

create or replace function public.feature_period_start(requested_period text)
returns timestamptz language sql stable as $$
select case requested_period
  when 'daily' then date_trunc('day',now())
  when 'weekly' then date_trunc('week',now())
  when 'monthly' then date_trunc('month',now())
  else '1970-01-01 00:00:00+00'::timestamptz
end; $$;

create or replace function public.current_user_plan_id()
returns uuid language sql stable security definer set search_path=public as $$
select coalesce(
  (select us.plan_id from public.user_subscriptions us
   where us.user_id=auth.uid() and us.status in ('active','trialing')
     and (us.ends_at is null or us.ends_at>now()) limit 1),
  (select id from public.subscription_plans where slug='free' limit 1)
); $$;

create or replace function public.get_my_feature_access(requested_feature text)
returns table(
  feature_key text, feature_label text, plan_slug text, plan_name text,
  allowed boolean, limit_value numeric, limit_unit text, used_value numeric,
  remaining_value numeric, reset_period text, reset_at timestamptz, upgrade_message text
)
language plpgsql stable security definer set search_path=public as $$
declare rule record; period_begin timestamptz; usage numeric:=0; started timestamptz;
begin
  select f.feature_key,f.label,p.slug,p.name,r.enabled,r.limit_value,r.limit_unit,r.reset_period,r.upgrade_message
  into rule from public.app_features f
  join public.plan_feature_limits r on r.feature_key=f.feature_key
  join public.subscription_plans p on p.id=r.plan_id
  where f.feature_key=requested_feature and f.enabled and p.id=public.current_user_plan_id();
  if not found then
    return query select requested_feature,requested_feature,'free','Free',false,0::numeric,'count',0::numeric,0::numeric,'never',null::timestamptz,'This feature is not available.';
    return;
  end if;
  period_begin:=public.feature_period_start(rule.reset_period);
  select u.used_value,u.started_at into usage,started from public.feature_usage_windows u
    where u.user_id=auth.uid() and u.feature_key=requested_feature and u.period_start=period_begin;
  usage:=coalesce(usage,0);
  if rule.limit_unit='minutes' and started is not null then
    usage:=greatest(usage,extract(epoch from(now()-started))/60.0);
  elsif rule.limit_unit='megabytes' and requested_feature='notes.storage' then
    select coalesce(sum(size_bytes),0)::numeric/1048576 into usage from public.note_uploads
      where user_id=auth.uid() and status<>'deleted';
  end if;
  return query select rule.feature_key,rule.label,rule.slug,rule.name,
    (rule.enabled and (rule.limit_unit='unlimited' or rule.limit_value is null or usage<rule.limit_value)),
    rule.limit_value,rule.limit_unit,usage,
    case when rule.limit_unit='unlimited' or rule.limit_value is null then null else greatest(rule.limit_value-usage,0) end,
    rule.reset_period,
    case rule.reset_period when 'daily' then period_begin+interval '1 day' when 'weekly' then period_begin+interval '1 week' when 'monthly' then period_begin+interval '1 month' else null end,
    rule.upgrade_message;
end; $$;

create or replace function public.begin_feature_usage(requested_feature text)
returns table(allowed boolean,remaining_value numeric,limit_unit text,upgrade_message text)
language plpgsql security definer set search_path=public as $$
declare access record; period_begin timestamptz;
begin
  if auth.uid() is null then raise exception 'Sign in to use this feature'; end if;
  select * into access from public.get_my_feature_access(requested_feature);
  if access.allowed and access.limit_unit='minutes' then
    period_begin:=public.feature_period_start(access.reset_period);
    insert into public.feature_usage_windows(user_id,feature_key,period_start,started_at)
    values(auth.uid(),requested_feature,period_begin,now())
    on conflict(user_id,feature_key,period_start) do update set
      started_at=coalesce(public.feature_usage_windows.started_at,excluded.started_at),updated_at=now();
    select * into access from public.get_my_feature_access(requested_feature);
  end if;
  return query select access.allowed,access.remaining_value,access.limit_unit,access.upgrade_message;
end; $$;

create or replace function public.enforce_chat_entitlement()
returns trigger language plpgsql security definer set search_path=public as $$
declare access record;
begin
  if public.is_admin() or new.channel like '%-announcements' then return new; end if;
  select * into access from public.begin_feature_usage('community.chat');
  if not coalesce(access.allowed,false) then
    raise exception 'FEATURE_LIMIT:community.chat:%',coalesce(access.upgrade_message,'Upgrade your plan to continue chatting');
  end if;
  return new;
end; $$;

drop trigger if exists enforce_chat_entitlement_before_insert on public.community_messages;
create trigger enforce_chat_entitlement_before_insert before insert on public.community_messages
for each row execute function public.enforce_chat_entitlement();

alter table public.app_features enable row level security;
alter table public.plan_feature_limits enable row level security;
alter table public.feature_usage_windows enable row level security;
alter table public.note_uploads enable row level security;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='app_features' and policyname='features readable') then
    create policy "features readable" on public.app_features for select using(true);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='app_features' and policyname='features managed') then
    create policy "features managed" on public.app_features for all using(public.is_admin(array['owner','admin'])) with check(public.is_admin(array['owner','admin']));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='plan_feature_limits' and policyname='feature rules readable') then
    create policy "feature rules readable" on public.plan_feature_limits for select using(true);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='plan_feature_limits' and policyname='feature rules managed') then
    create policy "feature rules managed" on public.plan_feature_limits for all using(public.is_admin(array['owner','admin'])) with check(public.is_admin(array['owner','admin']));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='feature_usage_windows' and policyname='usage read own') then
    create policy "usage read own" on public.feature_usage_windows for select using(user_id=auth.uid() or public.is_admin(array['owner','admin']));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='note_uploads' and policyname='notes files own') then
    create policy "notes files own" on public.note_uploads for select using(user_id=auth.uid() or public.is_admin(array['owner','admin']));
  end if;
end $$;

grant select on public.app_features,public.plan_feature_limits to anon,authenticated;
grant select on public.feature_usage_windows,public.note_uploads to authenticated;
grant insert,update,delete on public.app_features,public.plan_feature_limits to authenticated;
grant execute on function public.get_my_feature_access(text) to anon,authenticated;
grant execute on function public.begin_feature_usage(text) to authenticated;
