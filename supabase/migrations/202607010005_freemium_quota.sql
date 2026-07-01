alter table public.profiles
add column project_limit integer not null default 3 check (project_limit >= 0),
add column chapter_limit_per_project integer not null default 30 check (chapter_limit_per_project >= 0),
add column quota_period_start date not null default date_trunc('month', current_date)::date;

create table public.translation_quota_reservations (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  character_count integer not null check (character_count > 0),
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index translation_quota_reservations_user_id_idx
on public.translation_quota_reservations(user_id, created_at desc);

create trigger translation_quota_reservations_set_updated_at
before update on public.translation_quota_reservations
for each row execute function public.set_updated_at();

alter table public.translation_quota_reservations enable row level security;

create policy "Users view their own quota reservations"
on public.translation_quota_reservations
for select using ((select auth.uid()) = user_id);

grant select on public.translation_quota_reservations to authenticated;

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

  if requested_characters < 1 or requested_characters > 30000 then
    raise exception 'Requested characters must be between 1 and 30000';
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

  remaining_characters := greatest(
    current_profile.monthly_character_limit - current_profile.characters_used,
    0
  );

  if requested_characters > remaining_characters then
    return jsonb_build_object(
      'allowed', false,
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
    'plan', current_profile.plan,
    'limit', current_profile.monthly_character_limit,
    'used', current_profile.characters_used,
    'remaining', greatest(current_profile.monthly_character_limit - current_profile.characters_used, 0),
    'periodStart', current_profile.quota_period_start
  );
end;
$$;

create or replace function public.complete_translation_quota(reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.translation_quota_reservations
  set status = 'completed'
  where id = reservation_id
    and user_id = auth.uid()
    and status = 'reserved';
end;
$$;

create or replace function public.refund_translation_quota(reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_characters integer;
begin
  update public.translation_quota_reservations
  set status = 'refunded'
  where id = reservation_id
    and user_id = auth.uid()
    and status = 'reserved'
  returning character_count into reserved_characters;

  if reserved_characters is not null then
    update public.profiles
    set characters_used = greatest(characters_used - reserved_characters, 0)
    where id = auth.uid();
  end if;
end;
$$;

revoke all on function public.reserve_translation_quota(uuid, integer) from public;
revoke all on function public.complete_translation_quota(uuid) from public;
revoke all on function public.refund_translation_quota(uuid) from public;
grant execute on function public.reserve_translation_quota(uuid, integer) to authenticated;
grant execute on function public.complete_translation_quota(uuid) to authenticated;
grant execute on function public.refund_translation_quota(uuid) to authenticated;

create or replace function public.create_project_with_first_chapter(
  project_title text,
  project_genre text default 'xianxia',
  project_style text default 'natural',
  project_description text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_project_id uuid;
  allowed_projects integer;
  existing_projects integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if char_length(trim(project_title)) < 1 or char_length(project_title) > 160 then
    raise exception 'Project title must contain 1-160 characters';
  end if;

  select project_limit into allowed_projects
  from public.profiles
  where id = auth.uid();

  select count(*) into existing_projects
  from public.projects
  where user_id = auth.uid();

  if existing_projects >= allowed_projects then
    raise exception 'PROJECT_LIMIT_REACHED';
  end if;

  insert into public.projects (
    user_id, title, description, genre, translation_style
  ) values (
    auth.uid(), trim(project_title), nullif(trim(project_description), ''), project_genre, project_style
  ) returning id into new_project_id;

  insert into public.chapters (project_id, chapter_number, title)
  values (new_project_id, 1, 'Bab 1');

  return new_project_id;
end;
$$;

create or replace function public.create_next_chapter(target_project_id uuid)
returns public.chapters
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_chapter public.chapters;
  next_number integer;
  existing_chapters integer;
  allowed_chapters integer;
begin
  if not exists (
    select 1 from public.projects
    where id = target_project_id and user_id = auth.uid()
  ) then
    raise exception 'Project not found';
  end if;

  select chapter_limit_per_project into allowed_chapters
  from public.profiles
  where id = auth.uid();

  select count(*), coalesce(max(chapter_number), 0) + 1
  into existing_chapters, next_number
  from public.chapters
  where project_id = target_project_id;

  if existing_chapters >= allowed_chapters then
    raise exception 'CHAPTER_LIMIT_REACHED';
  end if;

  insert into public.chapters (project_id, chapter_number, title)
  values (target_project_id, next_number, 'Bab ' || next_number)
  returning * into new_chapter;

  return new_chapter;
end;
$$;

grant execute on function public.create_next_chapter(uuid) to authenticated;
