-- Shopify-style page sections and editable exam attempts.
-- Safe migration: creates/adds configuration only and does not delete user data.

insert into public.app_page_elements
  (page_key, element_key, region, element_type, label, description, sort_order, config, appearance)
select page_key, 'native-content', 'main', 'section', label, description, 100,
  '{"variant":"native"}'::jsonb,
  '{"backgroundColor":"transparent","padding":0,"borderRadius":0}'::jsonb
from (values
  ('community','Community chat','Existing community channels and messages'),
  ('subjects','Subjects','Existing subject progress grid'),
  ('chapters','Chapters','Existing chapter tracker'),
  ('analytics','Analytics','Existing analytics dashboard'),
  ('activity','Activity','Existing progress activity'),
  ('study-sessions','Study sessions','Existing study-session tools'),
  ('goals','Goals','Existing goal-management tools'),
  ('test-series','Test series','Existing test-series tools'),
  ('calendar','Calendar','Existing calendar tools'),
  ('notes','Notes','Existing notes tools'),
  ('settings','Settings','Existing account and course settings')
) as pages(page_key,label,description)
on conflict(page_key,element_key) do nothing;

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_key text not null unique,
  course_level text not null check (course_level in ('Foundation','Intermediate','Final')),
  label text not null,
  exam_date timestamptz not null,
  registration_deadline timestamptz,
  enabled boolean not null default true,
  sort_order integer not null default 100,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.exam_attempts(attempt_key,course_level,label,exam_date,sort_order)
values
  ('foundation-sep-2026','Foundation','September 2026','2026-09-02 14:00:00+05:30',10),
  ('foundation-jan-2027','Foundation','January 2027','2027-01-01 14:00:00+05:30',20),
  ('foundation-may-2027','Foundation','May 2027','2027-05-01 14:00:00+05:30',30),
  ('inter-sep-2026','Intermediate','September 2026','2026-09-01 14:00:00+05:30',10),
  ('inter-jan-2027','Intermediate','January 2027','2027-01-01 14:00:00+05:30',20),
  ('inter-may-2027','Intermediate','May 2027','2027-05-01 14:00:00+05:30',30),
  ('final-nov-2026','Final','November 2026','2026-11-02 14:00:00+05:30',10),
  ('final-may-2027','Final','May 2027','2027-05-01 14:00:00+05:30',20),
  ('final-nov-2027','Final','November 2027','2027-11-01 14:00:00+05:30',30)
on conflict(attempt_key) do nothing;

alter table public.exam_attempts enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='exam_attempts' and policyname='exam attempts readable') then
    create policy "exam attempts readable" on public.exam_attempts for select using(true);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='exam_attempts' and policyname='exam attempts managed by admins') then
    create policy "exam attempts managed by admins" on public.exam_attempts for all
    using(public.is_admin(array['owner','admin']))
    with check(public.is_admin(array['owner','admin']));
  end if;
end $$;

grant select on public.exam_attempts to anon,authenticated;
grant insert,update,delete on public.exam_attempts to authenticated;
