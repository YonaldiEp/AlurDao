alter table public.profiles
drop constraint if exists profiles_plan_check;

alter table public.profiles
add constraint profiles_plan_check
check (plan in ('free', 'premium', 'translator_pro', 'publisher', 'admin'));

-- Pengguna hanya boleh mengubah kolom profil publiknya sendiri. Plan dan limit
-- hanya dapat diubah oleh postgres/service role, bukan melalui browser.
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

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
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if requested_characters < 1 or requested_characters > 5000 then
    raise exception 'Requested characters must be between 1 and 5000';
  end if;

  select * into current_profile
  from public.profiles
  where id = current_user_id
  for update;

  if current_profile.id is null then
    raise exception 'Profile not found';
  end if;

  if current_profile.quota_period_start < current_month then
    update public.profiles
    set characters_used = 0,
        quota_period_start = current_month
    where id = current_user_id
    returning * into current_profile;
  end if;

  if current_profile.plan = 'admin' then
    return jsonb_build_object(
      'allowed', true,
      'unlimited', true,
      'plan', current_profile.plan,
      'limit', 0,
      'used', current_profile.characters_used,
      'remaining', 0,
      'periodStart', current_profile.quota_period_start
    );
  end if;

  remaining_characters := greatest(
    current_profile.monthly_character_limit - current_profile.characters_used,
    0
  );

  if requested_characters > remaining_characters then
    return jsonb_build_object(
      'allowed', false,
      'unlimited', false,
      'plan', current_profile.plan,
      'limit', current_profile.monthly_character_limit,
      'used', current_profile.characters_used,
      'remaining', remaining_characters,
      'periodStart', current_profile.quota_period_start
    );
  end if;

  insert into public.translation_quota_reservations (
    id,
    user_id,
    character_count,
    status
  ) values (
    reservation_id,
    current_user_id,
    requested_characters,
    'reserved'
  );

  update public.profiles
  set characters_used = characters_used + requested_characters
  where id = current_user_id
  returning * into current_profile;

  return jsonb_build_object(
    'allowed', true,
    'unlimited', false,
    'plan', current_profile.plan,
    'limit', current_profile.monthly_character_limit,
    'used', current_profile.characters_used,
    'remaining', greatest(current_profile.monthly_character_limit - current_profile.characters_used, 0),
    'periodStart', current_profile.quota_period_start
  );
end;
$$;
