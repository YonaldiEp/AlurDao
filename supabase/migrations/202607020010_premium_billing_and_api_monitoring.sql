create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'midtrans' check (provider in ('midtrans')),
  provider_order_id text not null unique,
  provider_transaction_id text,
  amount_idr integer not null check (amount_idr > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  checkout_token text,
  checkout_url text,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  plan text not null default 'premium' check (plan in ('premium')),
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.api_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  request_id uuid not null,
  endpoint text not null,
  provider text,
  model text,
  status_code integer not null check (status_code between 100 and 599),
  duration_ms integer not null default 0 check (duration_ms >= 0),
  input_characters integer not null default 0 check (input_characters >= 0),
  output_characters integer not null default 0 check (output_characters >= 0),
  error_code text,
  created_at timestamptz not null default now()
);

create index payments_user_created_idx on public.payments(user_id, created_at desc);
create index api_usage_events_created_idx on public.api_usage_events(created_at desc);
create index api_usage_events_user_created_idx on public.api_usage_events(user_id, created_at desc);

create trigger payments_set_updated_at before update on public.payments
for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.api_usage_events enable row level security;

create policy "Users view own payments" on public.payments
for select using ((select auth.uid()) = user_id);
create policy "Users create own pending payments" on public.payments
for insert with check ((select auth.uid()) = user_id and status = 'pending');
create policy "Users view own subscription" on public.subscriptions
for select using ((select auth.uid()) = user_id);
create policy "Users create own API events" on public.api_usage_events
for insert with check ((select auth.uid()) = user_id);
create policy "Users view own API events" on public.api_usage_events
for select using ((select auth.uid()) = user_id);
create policy "Admins view all API events" on public.api_usage_events
for select using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and plan = 'admin')
);

grant select, insert on public.payments to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert on public.api_usage_events to authenticated;

create or replace function public.activate_premium_subscription(
  target_user_id uuid,
  target_payment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_start timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  select greatest(coalesce(current_period_end, now()), now()) into next_start
  from public.subscriptions where user_id = target_user_id;
  next_start := coalesce(next_start, now());

  insert into public.subscriptions (
    user_id, plan, status, current_period_start, current_period_end, payment_id
  ) values (
    target_user_id, 'premium', 'active', now(), next_start + interval '30 days', target_payment_id
  )
  on conflict (user_id) do update set
    plan = 'premium',
    status = 'active',
    current_period_start = now(),
    current_period_end = next_start + interval '30 days',
    payment_id = target_payment_id,
    updated_at = now();

  update public.profiles set
    plan = 'premium',
    monthly_character_limit = 100000,
    project_limit = 10,
    chapter_limit_per_project = 100
  where id = target_user_id and plan <> 'admin';
end;
$$;

revoke all on function public.activate_premium_subscription(uuid, uuid) from public;
grant execute on function public.activate_premium_subscription(uuid, uuid) to service_role;

create or replace function public.reserve_translation_quota(
  reservation_id uuid,
  requested_characters integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_profile public.profiles;
  current_month date := date_trunc('month', current_date)::date;
  remaining_characters integer;
  max_limit integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into current_profile from public.profiles
  where id = current_user_id for update;
  if current_profile.id is null then raise exception 'Profile not found'; end if;

  if current_profile.plan = 'premium' and not exists (
    select 1 from public.subscriptions
    where user_id = current_user_id and status = 'active' and current_period_end > now()
  ) then
    update public.profiles set
      plan = 'free', monthly_character_limit = 15000,
      project_limit = 2, chapter_limit_per_project = 10
    where id = current_user_id returning * into current_profile;
    update public.subscriptions set status = 'expired'
    where user_id = current_user_id and status = 'active';
  end if;

  max_limit := case
    when current_profile.plan = 'admin' then 20000
    when current_profile.plan = 'premium' then 10000
    else 5000
  end;
  if requested_characters < 1 or requested_characters > max_limit then
    raise exception 'Requested characters must be between 1 and %', max_limit;
  end if;

  if current_profile.quota_period_start < current_month then
    update public.profiles set characters_used = 0, quota_period_start = current_month
    where id = current_user_id returning * into current_profile;
  end if;

  if current_profile.plan = 'admin' then
    return jsonb_build_object('allowed', true, 'unlimited', true, 'plan', 'admin',
      'limit', 0, 'used', current_profile.characters_used, 'remaining', 0,
      'periodStart', current_profile.quota_period_start);
  end if;

  remaining_characters := greatest(current_profile.monthly_character_limit - current_profile.characters_used, 0);
  if requested_characters > remaining_characters then
    return jsonb_build_object('allowed', false, 'unlimited', false, 'plan', current_profile.plan,
      'limit', current_profile.monthly_character_limit, 'used', current_profile.characters_used,
      'remaining', remaining_characters, 'periodStart', current_profile.quota_period_start);
  end if;

  insert into public.translation_quota_reservations (id, user_id, character_count, status)
  values (reservation_id, current_user_id, requested_characters, 'reserved');
  update public.profiles set characters_used = characters_used + requested_characters
  where id = current_user_id returning * into current_profile;

  return jsonb_build_object('allowed', true, 'unlimited', false, 'plan', current_profile.plan,
    'limit', current_profile.monthly_character_limit, 'used', current_profile.characters_used,
    'remaining', greatest(current_profile.monthly_character_limit - current_profile.characters_used, 0),
    'periodStart', current_profile.quota_period_start);
end;
$$;
