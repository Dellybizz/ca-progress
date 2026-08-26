-- Run this in Supabase SQL Editor
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  exam_date date,
  created_at timestamptz default now()
);
create table public.chapter_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  chapter text not null,
  done boolean default false,
  revision_1 boolean default false,
  revision_2 boolean default false,
  test_done boolean default false,
  done_at timestamptz,
  revision_1_at timestamptz,
  revision_2_at timestamptz,
  test_done_at timestamptz,
  updated_at timestamptz default now(),
  unique(user_id, chapter)
);
create table public.study_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  chapter text,
  minutes integer not null check(minutes > 0),
  studied_at timestamptz default now(),
  notes text
);
alter table public.profiles enable row level security;
alter table public.chapter_progress enable row level security;
alter table public.study_sessions enable row level security;
create policy "profile owner" on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
create policy "progress owner" on public.chapter_progress for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "sessions owner" on public.study_sessions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
