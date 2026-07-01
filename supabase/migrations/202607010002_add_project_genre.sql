alter table public.projects
add column genre text not null default 'xianxia';

alter table public.projects
add constraint projects_genre_check
check (genre in ('xianxia', 'xuanhuan', 'wuxia', 'qihuan', 'mohuan', 'kehuan'));

comment on column public.projects.genre is
'Primary Chinese web-novel genre used to guide translation context.';
