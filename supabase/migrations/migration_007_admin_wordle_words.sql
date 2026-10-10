-- Staff can search, add, and remove allowed Wordle guesses.
-- Players can check a single word without reading the table.

create or replace function public.is_allowed_wordle_word(p_word text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wordle_allowed_words
    where word = upper(trim(p_word))
  );
$$;

create or replace function public.admin_search_wordle_words(
  p_query text default '',
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := upper(trim(coalesce(p_query, '')));
  lim int := least(greatest(coalesce(p_limit, 50), 1), 100);
  off int := greatest(coalesce(p_offset, 0), 0);
  total int;
  words jsonb;
begin
  if auth.uid() is null or not public.has_permission('wordle.view') then
    raise exception 'not authorized';
  end if;
  if q <> '' and q !~ '^[A-Z]+$' then
    raise exception 'invalid search';
  end if;

  select count(*) into total
  from public.wordle_allowed_words
  where word like q || '%';

  select coalesce(jsonb_agg(s.word order by s.word), '[]'::jsonb)
  into words
  from (
    select word
    from public.wordle_allowed_words
    where word like q || '%'
    order by word
    limit lim offset off
  ) s;

  return jsonb_build_object('total', total, 'words', words);
end;
$$;

create or replace function public.admin_add_wordle_word(p_word text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := upper(trim(p_word));
begin
  if auth.uid() is null or not public.has_permission('wordle.edit') then
    raise exception 'not authorized';
  end if;
  if normalized !~ '^[A-Z]{5}$' then
    raise exception 'word must be 5 letters';
  end if;

  insert into public.wordle_allowed_words (word) values (normalized)
  on conflict (word) do nothing;
  if not found then
    return;
  end if;

  perform public.write_audit_log(
    'wordle.word.add',
    'wordle',
    'wordle_allowed_word',
    normalized,
    null,
    jsonb_build_object('word', normalized)
  );
end;
$$;

create or replace function public.admin_remove_wordle_word(p_word text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := upper(trim(p_word));
begin
  if auth.uid() is null or not public.has_permission('wordle.edit') then
    raise exception 'not authorized';
  end if;
  if normalized !~ '^[A-Z]{5}$' then
    raise exception 'word must be 5 letters';
  end if;
  if exists (
    select 1 from public.wordle_puzzles
    where answer = normalized and status in ('draft', 'scheduled', 'published')
  ) then
    raise exception 'word is used by a puzzle';
  end if;

  delete from public.wordle_allowed_words where word = normalized;
  if not found then
    raise exception 'not in word list';
  end if;

  perform public.write_audit_log(
    'wordle.word.remove',
    'wordle',
    'wordle_allowed_word',
    normalized,
    jsonb_build_object('word', normalized),
    null
  );
end;
$$;

grant execute on function public.is_allowed_wordle_word(text) to anon, authenticated;
grant execute on function public.admin_search_wordle_words(text, int, int) to authenticated;
grant execute on function public.admin_add_wordle_word(text) to authenticated;
grant execute on function public.admin_remove_wordle_word(text) to authenticated;
