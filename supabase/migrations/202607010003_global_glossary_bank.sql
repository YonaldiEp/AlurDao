create table public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  source_term text not null,
  pinyin text,
  default_translation text not null,
  category text not null default 'general' check (
    category in (
      'cultivation', 'martial_arts', 'magic', 'technology', 'organization',
      'creature', 'realm', 'item', 'place', 'character', 'general'
    )
  ),
  definition text,
  review_status text not null default 'draft' check (review_status in ('draft', 'reviewed', 'verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_term, default_translation)
);

create table public.glossary_term_genres (
  term_id uuid not null references public.glossary_terms(id) on delete cascade,
  genre text not null check (genre in ('xianxia', 'xuanhuan', 'wuxia', 'qihuan', 'mohuan', 'kehuan')),
  primary key (term_id, genre)
);

create table public.glossary_aliases (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.glossary_terms(id) on delete cascade,
  alias text not null,
  alias_type text not null default 'alternative_translation' check (
    alias_type in ('source_variant', 'transliteration', 'alternative_translation')
  ),
  created_at timestamptz not null default now(),
  unique (term_id, alias)
);

alter table public.glossary_entries
add column global_term_id uuid references public.glossary_terms(id) on delete set null,
add column pinyin text;

create index glossary_terms_source_term_idx on public.glossary_terms(source_term);
create index glossary_terms_category_idx on public.glossary_terms(category);
create index glossary_term_genres_genre_idx on public.glossary_term_genres(genre);
create index glossary_aliases_term_id_idx on public.glossary_aliases(term_id);
create index glossary_entries_global_term_id_idx on public.glossary_entries(global_term_id);

create trigger glossary_terms_set_updated_at before update on public.glossary_terms
for each row execute function public.set_updated_at();

alter table public.glossary_terms enable row level security;
alter table public.glossary_term_genres enable row level security;
alter table public.glossary_aliases enable row level security;

create policy "Global glossary is publicly readable" on public.glossary_terms
for select using (true);
create policy "Global glossary genres are publicly readable" on public.glossary_term_genres
for select using (true);
create policy "Global glossary aliases are publicly readable" on public.glossary_aliases
for select using (true);

grant select on public.glossary_terms to anon, authenticated;
grant select on public.glossary_term_genres to anon, authenticated;
grant select on public.glossary_aliases to anon, authenticated;

insert into public.glossary_terms
  (source_term, pinyin, default_translation, category, definition, review_status)
values
  ('丹田', 'dāntián', 'dantian', 'cultivation', 'Pusat penyimpanan dan peredaran energi dalam tubuh.', 'verified'),
  ('灵气', 'língqì', 'energi spiritual', 'cultivation', 'Energi spiritual yang terdapat di alam atau tubuh praktisi.', 'verified'),
  ('修炼', 'xiūliàn', 'berkultivasi', 'cultivation', 'Proses melatih diri dan meningkatkan kekuatan atau ranah.', 'verified'),
  ('筑基', 'zhùjī', 'Pendirian Fondasi', 'realm', 'Tahap atau proses membangun fondasi kultivasi.', 'reviewed'),
  ('金丹', 'jīndān', 'Inti Emas', 'realm', 'Ranah atau inti energi yang terbentuk setelah tahap fondasi.', 'reviewed'),
  ('宗门', 'zōngmén', 'sekte', 'organization', 'Organisasi atau perguruan dalam dunia kultivasi.', 'verified'),
  ('功法', 'gōngfǎ', 'metode kultivasi', 'cultivation', 'Metode atau ajaran untuk melatih dan mengedarkan energi.', 'reviewed'),
  ('法宝', 'fǎbǎo', 'artefak magis', 'item', 'Benda berkekuatan supernatural yang digunakan praktisi.', 'reviewed'),
  ('江湖', 'jiānghú', 'jianghu', 'martial_arts', 'Dunia sosial para pendekar di luar tatanan masyarakat biasa.', 'verified'),
  ('内力', 'nèilì', 'tenaga dalam', 'martial_arts', 'Kekuatan internal yang dilatih oleh seorang pendekar.', 'verified'),
  ('轻功', 'qīnggōng', 'ilmu meringankan tubuh', 'martial_arts', 'Teknik gerak ringan, cepat, dan lincah dalam cerita wuxia.', 'reviewed'),
  ('掌门', 'zhǎngmén', 'ketua perguruan', 'organization', 'Pemimpin sebuah perguruan atau sekte bela diri.', 'verified'),
  ('魔法', 'mófǎ', 'sihir', 'magic', 'Kekuatan atau praktik magis.', 'verified'),
  ('法师', 'fǎshī', 'penyihir', 'magic', 'Pengguna sihir; padanan harus disesuaikan dengan konteks.', 'reviewed'),
  ('魔兽', 'móshòu', 'monster magis', 'creature', 'Makhluk atau binatang yang memiliki kekuatan magis.', 'reviewed'),
  ('异能', 'yìnéng', 'kemampuan supernatural', 'magic', 'Kemampuan khusus yang melampaui kemampuan manusia biasa.', 'reviewed'),
  ('星舰', 'xīngjiàn', 'kapal antariksa', 'technology', 'Kapal yang dirancang untuk perjalanan antariksa.', 'verified'),
  ('机甲', 'jījiǎ', 'mecha', 'technology', 'Mesin atau zirah robotik yang dikendalikan pilot.', 'verified'),
  ('人工智能', 'réngōng zhìnéng', 'kecerdasan buatan', 'technology', 'Sistem kecerdasan yang dijalankan mesin atau komputer.', 'verified'),
  ('虫洞', 'chóngdòng', 'lubang cacing', 'technology', 'Jalan pintas hipotetis yang menghubungkan dua titik ruang-waktu.', 'verified')
on conflict (source_term, default_translation) do nothing;

insert into public.glossary_term_genres (term_id, genre)
select term.id, mapping.genre
from (
  values
    ('丹田', 'xianxia'), ('丹田', 'xuanhuan'),
    ('灵气', 'xianxia'), ('灵气', 'xuanhuan'),
    ('修炼', 'xianxia'), ('修炼', 'xuanhuan'),
    ('筑基', 'xianxia'), ('金丹', 'xianxia'),
    ('宗门', 'xianxia'), ('宗门', 'xuanhuan'),
    ('功法', 'xianxia'), ('功法', 'xuanhuan'),
    ('法宝', 'xianxia'), ('法宝', 'xuanhuan'),
    ('江湖', 'wuxia'), ('内力', 'wuxia'), ('轻功', 'wuxia'), ('掌门', 'wuxia'),
    ('魔法', 'qihuan'), ('魔法', 'mohuan'),
    ('法师', 'qihuan'), ('法师', 'mohuan'),
    ('魔兽', 'xuanhuan'), ('魔兽', 'qihuan'), ('魔兽', 'mohuan'),
    ('异能', 'xuanhuan'), ('异能', 'kehuan'),
    ('星舰', 'kehuan'), ('机甲', 'kehuan'),
    ('人工智能', 'kehuan'), ('虫洞', 'kehuan')
) as mapping(source_term, genre)
join public.glossary_terms term on term.source_term = mapping.source_term
on conflict do nothing;

insert into public.glossary_aliases (term_id, alias, alias_type)
select term.id, mapping.alias, mapping.alias_type
from (
  values
    ('灵气', 'qi spiritual', 'alternative_translation'),
    ('筑基', 'Fondasi', 'alternative_translation'),
    ('金丹', 'Golden Core', 'alternative_translation'),
    ('江湖', 'dunia persilatan', 'alternative_translation'),
    ('机甲', 'robot tempur', 'alternative_translation')
) as mapping(source_term, alias, alias_type)
join public.glossary_terms term on term.source_term = mapping.source_term
on conflict do nothing;

create or replace function public.search_glossary(
  search_query text default null,
  genre_filter text default null,
  result_limit integer default 50
)
returns table (
  id uuid,
  source_term text,
  pinyin text,
  default_translation text,
  category text,
  definition text,
  review_status text,
  genres text[],
  aliases jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    term.id,
    term.source_term,
    term.pinyin,
    term.default_translation,
    term.category,
    term.definition,
    term.review_status,
    array(
      select term_genre.genre
      from public.glossary_term_genres term_genre
      where term_genre.term_id = term.id
      order by term_genre.genre
    ) as genres,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('alias', term_alias.alias, 'type', term_alias.alias_type)
          order by term_alias.alias
        )
        from public.glossary_aliases term_alias
        where term_alias.term_id = term.id
      ),
      '[]'::jsonb
    ) as aliases
  from public.glossary_terms term
  where
    (
      search_query is null
      or term.source_term ilike '%' || search_query || '%'
      or term.pinyin ilike '%' || search_query || '%'
      or term.default_translation ilike '%' || search_query || '%'
    )
    and (
      genre_filter is null
      or exists (
        select 1
        from public.glossary_term_genres term_genre
        where term_genre.term_id = term.id and term_genre.genre = genre_filter
      )
    )
  order by term.source_term
  limit least(greatest(result_limit, 1), 100);
$$;

grant execute on function public.search_glossary(text, text, integer) to anon, authenticated;
