create policy "Users insert translation runs in their projects" on public.translation_runs
for insert with check (
  exists (
    select 1
    from public.chapters
    join public.projects on projects.id = chapters.project_id
    where chapters.id = translation_runs.chapter_id
      and projects.user_id = (select auth.uid())
  )
);

grant insert on public.translation_runs to authenticated;

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
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if char_length(trim(project_title)) < 1 or char_length(project_title) > 160 then
    raise exception 'Project title must contain 1-160 characters';
  end if;

  insert into public.projects (
    user_id,
    title,
    description,
    genre,
    translation_style
  )
  values (
    auth.uid(),
    trim(project_title),
    nullif(trim(project_description), ''),
    project_genre,
    project_style
  )
  returning id into new_project_id;

  insert into public.chapters (project_id, chapter_number, title)
  values (new_project_id, 1, 'Bab 1');

  return new_project_id;
end;
$$;

grant execute on function public.create_project_with_first_chapter(text, text, text, text)
to authenticated;
