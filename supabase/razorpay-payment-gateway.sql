-- Razorpay payment records for CA Progress.
-- Safe migration: creates missing objects only and preserves existing data.

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

create index if not exists payment_orders_user_created_idx
  on public.payment_orders(user_id,created_at desc);
create index if not exists payment_orders_provider_payment_idx
  on public.payment_orders(provider_payment_id)
  where provider_payment_id is not null;

alter table public.payment_orders enable row level security;

do $$ begin
  if not exists(
    select 1 from pg_policies
    where schemaname='public' and tablename='payment_orders'
      and policyname='payment orders read own'
  ) then
    create policy "payment orders read own"
      on public.payment_orders for select
      using(user_id=auth.uid() or public.is_admin(array['owner','admin']));
  end if;
end $$;

grant select on public.payment_orders to authenticated;
revoke insert,update,delete on public.payment_orders from anon,authenticated;
