-- Bulk-add allowed Wordle guesses from a pasted list.

create or replace function public.admin_add_wordle_words(p_words text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  raw text;
  normalized text;
  candidates text[] := '{}';
  added_count int := 0;
  skipped_count int := 0;
  invalid_count int := 0;
  sample text[] := '{}';
begin
  if auth.uid() is null or not public.has_permission('wordle.edit') then
    raise exception 'not authorized';
  end if;
  if p_words is null or cardinality(p_words) is null or cardinality(p_words) = 0 then
    raise exception 'no words provided';
  end if;
  if cardinality(p_words) > 5000 then
    raise exception 'too many words';
  end if;

  foreach raw in array p_words loop
    normalized := upper(trim(coalesce(raw, '')));
    if normalized = '' then
      continue;
    end if;
    if normalized !~ '^[A-Z]{5}$' then
      invalid_count := invalid_count + 1;
      if cardinality(sample) < 10 then
        sample := array_append(sample, normalized);
      end if;
      continue;
    end if;
    if not (normalized = any (candidates)) then
      candidates := array_append(candidates, normalized);
    end if;
  end loop;

  if cardinality(candidates) is null or cardinality(candidates) = 0 then
    return jsonb_build_object(
      'added', 0,
      'skipped', 0,
      'invalid', invalid_count,
      'invalid_sample', to_jsonb(sample)
    );
  end if;

  with incoming as (
    select unnest(candidates) as word
  ),
  inserted as (
    insert into public.wordle_allowed_words (word)
    select word from incoming
    on conflict (word) do nothing
    returning word
  )
  select count(*) into added_count from inserted;

  skipped_count := cardinality(candidates) - added_count;

  if added_count > 0 then
    perform public.write_audit_log(
      'wordle.word.add_bulk',
      'wordle',
      'wordle_allowed_word',
      null,
      null,
      jsonb_build_object(
        'added', added_count,
        'skipped', skipped_count,
        'invalid', invalid_count
      )
    );
  end if;

  return jsonb_build_object(
    'added', added_count,
    'skipped', skipped_count,
    'invalid', invalid_count,
    'invalid_sample', to_jsonb(sample)
  );
end;
$$;

grant execute on function public.admin_add_wordle_words(text[]) to authenticated;
