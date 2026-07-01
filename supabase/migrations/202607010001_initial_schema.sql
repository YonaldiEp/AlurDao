-- AlurDao initial database schema
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'premium', 'translator_pro', 'publisher')),
  monthly_character_limit integer not null default 100000 check (monthly_character_limit >= 0),
  characters_used integer not null default 0 check (characters_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  source_language text not null default 'zh',
  target_language text not null default 'id',
  translation_style text not null default 'natural' check (translation_style in ('natural', 'dramatic', 'formal', 'light')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  title text,
  source_text text not null default '',
  translated_text text not null default '',
  status text not null default 'draft' check (status in ('draft', 'translating', 'review', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, chapter_number)
);

create table public.glossary_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_term text not null,
  translated_term text not null,
  category text not null default 'other' check (category in ('character', 'sect', 'realm', 'technique', 'artifact', 'place', 'other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, source_term)
);

create table public.translation_runs (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  provider text not null,
  model text not null,
  input_characters integer not null default 0 check (input_characters >= 0),
  output_characters integer not null default 0 check (output_characters >= 0),
  duration_ms integer check (duration_ms >= 0),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects(user_id);
create index chapters_project_id_idx on public.chapters(project_id);
create index glossary_entries_project_id_idx on public.glossary_entries(project_id);
create index translation_runs_chapter_id_idx on public.translation_runs(chapter_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger chapters_set_updated_at before update on public.chapters
for each row execute function public.set_updated_at();
create trigger glossary_entries_set_updated_at before update on public.glossary_entries
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.chapters enable row level security;
alter table public.glossary_entries enable row level security;
alter table public.translation_runs enable row level security;

create policy "Users can view their own profile" on public.profiles
for select using ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles
for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users manage their own projects" on public.projects
for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage chapters in their projects" on public.chapters
for all using (
  exists (select 1 from public.projects where projects.id = chapters.project_id and projects.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.projects where projects.id = chapters.project_id and projects.user_id = (select auth.uid()))
);

create policy "Users manage glossary in their projects" on public.glossary_entries
for all using (
  exists (select 1 from public.projects where projects.id = glossary_entries.project_id and projects.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.projects where projects.id = glossary_entries.project_id and projects.user_id = (select auth.uid()))
);

create policy "Users view translation runs in their projects" on public.translation_runs
for select using (
  exists (
    select 1 from public.chapters
    join public.projects on projects.id = chapters.project_id
    where chapters.id = translation_runs.chapter_id and projects.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.chapters to authenticated;
grant select, insert, update, delete on public.glossary_entries to authenticated;
grant select on public.translation_runs to authenticated;
