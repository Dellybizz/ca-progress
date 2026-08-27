-- Detailed page element editor. Run after the existing admin SQL files.
-- Existing application data is preserved.

create table if not exists public.app_page_elements (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  element_key text not null,
  parent_key text,
  region text not null default 'main',
  element_type text not null default 'section'
    check (element_type in ('section','card','quick_action','content_block')),
  label text not null,
  description text not null default '',
  enabled boolean not null default true,
  audience text not null default 'all' check (audience in ('all','guest','member')),
  minimum_plan_rank integer not null default 0,
  sort_order integer not null default 100,
  config jsonb not null default '{}'::jsonb,
  appearance jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique(page_key,element_key)
);

insert into public.app_page_elements(page_key,element_key,parent_key,region,element_type,label,description,sort_order,config)
values
('dashboard','exam-countdown',null,'header','card','Exam countdown','CA exam countdown card',10,'{}'),
('dashboard','daily-streak',null,'header','card','Daily Streak','Current preparation streak',20,'{}'),
('dashboard','overall-progress',null,'top','section','Overall Progress','Overall chapter and revision completion',30,'{}'),
('dashboard','activity-progress',null,'top','section','Progress by Activity','Completion by revision and test stage',40,'{}'),
('dashboard','study-week',null,'top','section','Study This Week','Weekly study time chart',50,'{}'),
('dashboard','subject-progress',null,'lower','section','Subject Progress','Progress for selected course subjects',60,'{}'),
('dashboard','recent-activity',null,'lower','section','Recent Activity','Most recent saved progress',70,'{}'),
('dashboard','quick-actions',null,'lower','section','Quick Actions','Dashboard action shortcuts',80,'{}'),
('dashboard','quick-study','quick-actions','quick-actions','quick_action','Start Study Session','Open Study Sessions',10,'{"route":"/study-sessions"}'),
('dashboard','quick-test','quick-actions','quick-actions','quick_action','Take a Test','Open Test Series',20,'{"route":"/test-series"}'),
('dashboard','quick-goal','quick-actions','quick-actions','quick_action','Add Goal','Open Goals',30,'{"route":"/goals"}'),
('dashboard','quick-calendar','quick-actions','quick-actions','quick_action','View Calendar','Open Calendar',40,'{"route":"/calendar"}')
on conflict(page_key,element_key) do nothing;

alter table public.app_page_elements enable row level security;
drop policy if exists "page elements readable" on public.app_page_elements;
create policy "page elements readable" on public.app_page_elements for select using(true);
drop policy if exists "page elements managed by admins" on public.app_page_elements;
create policy "page elements managed by admins" on public.app_page_elements for all
using(public.is_admin(array['owner','admin']))
with check(public.is_admin(array['owner','admin']));

grant select on public.app_page_elements to anon,authenticated;
grant insert,update,delete on public.app_page_elements to authenticated;

