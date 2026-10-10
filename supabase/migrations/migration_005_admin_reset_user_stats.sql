-- Admin RPCs to list and reset a user's Wordle/Crossword stats.
-- Also fix recalculate_wordle_stats so longest_streak can decrease after deletes.

create or replace function public.recalculate_wordle_stats(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  played int := 0;
  won int := 0;
  lost int := 0;
  dist int[] := array[0,0,0,0,0,0];
  total_guesses int := 0;
  cur_streak int := 0;
  best_streak int := 0;
  running int := 0;
  last_played date;
  last_won date;
  r record;
  prev_date date;
begin
  for r in
    select a.status, a.guess_count, a.completed_at, p.puzzle_date
    from public.wordle_attempts a
    join public.wordle_puzzles p on p.id = a.puzzle_id
    where a.user_id = p_user_id and a.status in ('won', 'lost')
    order by p.puzzle_date asc
  loop
    played := played + 1;
    total_guesses := total_guesses + r.guess_count;
    last_played := r.puzzle_date;
    if r.status = 'won' then
      won := won + 1;
      last_won := r.puzzle_date;
      if r.guess_count between 1 and 6 then
        dist[r.guess_count] := dist[r.guess_count] + 1;
      end if;
      if prev_date is null or r.puzzle_date = prev_date + 1 then
        running := running + 1;
      else
        running := 1;
      end if;
      if running > best_streak then best_streak := running; end if;
    else
      running := 0;
    end if;
    prev_date := r.puzzle_date;
  end loop;

  lost := played - won;
  cur_streak := running;
  if last_won is not null then
    if last_won < public.app_today() - 1 then
      cur_streak := 0;
    elsif last_won = public.app_today() - 1 then
      null;
    end if;
  else
    cur_streak := 0;
  end if;

  insert into public.wordle_stats as ws (
    user_id, games_played, games_won, games_lost, current_streak, longest_streak,
    total_guesses, guess_distribution, last_played_date, last_won_date, updated_at
  ) values (
    p_user_id, played, won, lost, cur_streak, best_streak,
    total_guesses, dist, last_played, last_won, timezone('utc', now())
  )
  on conflict (user_id) do update set
    games_played = excluded.games_played,
    games_won = excluded.games_won,
    games_lost = excluded.games_lost,
    current_streak = excluded.current_streak,
    longest_streak = excluded.longest_streak,
    total_guesses = excluded.total_guesses,
    guess_distribution = excluded.guess_distribution,
    last_played_date = excluded.last_played_date,
    last_won_date = excluded.last_won_date,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.admin_list_user_game_history(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.has_permission('users.activity.view') then
    raise exception 'permission denied';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'user not found';
  end if;

  return jsonb_build_object(
    'wordle', coalesce((
      select jsonb_agg(jsonb_build_object(
        'attempt_id', a.id,
        'puzzle_id', a.puzzle_id,
        'puzzle_date', p.puzzle_date,
        'answer', p.answer,
        'status', a.status,
        'guess_count', a.guess_count,
        'completed_at', a.completed_at
      ) order by p.puzzle_date desc)
      from public.wordle_attempts a
      join public.wordle_puzzles p on p.id = a.puzzle_id
      where a.user_id = p_user_id
    ), '[]'::jsonb),
    'crossword', coalesce((
      select jsonb_agg(jsonb_build_object(
        'progress_id', cp.id,
        'puzzle_id', cp.puzzle_id,
        'title', pz.title,
        'status', cp.status,
        'active_seconds', cp.active_seconds,
        'assisted', cp.assisted,
        'completed_at', cp.completed_at,
        'last_activity_at', cp.last_activity_at
      ) order by cp.last_activity_at desc)
      from public.crossword_progress cp
      join public.crossword_puzzles pz on pz.id = cp.puzzle_id
      where cp.user_id = p_user_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_reset_user_stats(
  p_user_id uuid,
  p_scope text,
  p_puzzle_date date default null,
  p_word text default null,
  p_puzzle_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_attempts int := 0;
  deleted_progress int := 0;
  deleted_activity int := 0;
  target_ids uuid[];
  normalized_word text;
begin
  if auth.uid() is null then
    perform public.write_audit_log('stats.reset', 'users', 'profile', p_user_id::text, null, null, jsonb_build_object('scope', p_scope), 'rejected');
    raise exception 'not authenticated';
  end if;

  if not public.has_permission('users.edit') then
    perform public.write_audit_log('stats.reset', 'users', 'profile', p_user_id::text, null, null, jsonb_build_object('scope', p_scope), 'rejected');
    raise exception 'permission denied';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'user not found';
  end if;

  if p_scope = 'all' then
    delete from public.wordle_attempts where user_id = p_user_id;
    get diagnostics deleted_attempts = row_count;
    delete from public.crossword_progress where user_id = p_user_id;
    get diagnostics deleted_progress = row_count;
    delete from public.gameplay_activity where user_id = p_user_id;
    get diagnostics deleted_activity = row_count;

  elsif p_scope = 'wordle_all' then
    delete from public.wordle_attempts where user_id = p_user_id;
    get diagnostics deleted_attempts = row_count;
    delete from public.gameplay_activity
    where user_id = p_user_id and game_type = 'wordle';
    get diagnostics deleted_activity = row_count;

  elsif p_scope = 'crossword_all' then
    delete from public.crossword_progress where user_id = p_user_id;
    get diagnostics deleted_progress = row_count;
    delete from public.gameplay_activity
    where user_id = p_user_id and game_type = 'crossword';
    get diagnostics deleted_activity = row_count;

  elsif p_scope = 'wordle_day' then
    if p_puzzle_date is null then
      raise exception 'puzzle date required';
    end if;
    select coalesce(array_agg(a.puzzle_id), '{}') into target_ids
    from public.wordle_attempts a
    join public.wordle_puzzles p on p.id = a.puzzle_id
    where a.user_id = p_user_id and p.puzzle_date = p_puzzle_date;

    delete from public.wordle_attempts a
    using public.wordle_puzzles p
    where a.puzzle_id = p.id
      and a.user_id = p_user_id
      and p.puzzle_date = p_puzzle_date;
    get diagnostics deleted_attempts = row_count;

    if cardinality(target_ids) > 0 then
      delete from public.gameplay_activity
      where user_id = p_user_id
        and game_type = 'wordle'
        and target_id = any (target_ids);
      get diagnostics deleted_activity = row_count;
    end if;

  elsif p_scope = 'wordle_word' then
    normalized_word := upper(trim(coalesce(p_word, '')));
    if normalized_word !~ '^[A-Z]{5}$' then
      raise exception 'word must be a 5-letter answer';
    end if;
    select coalesce(array_agg(a.puzzle_id), '{}') into target_ids
    from public.wordle_attempts a
    join public.wordle_puzzles p on p.id = a.puzzle_id
    where a.user_id = p_user_id and p.answer = normalized_word;

    delete from public.wordle_attempts a
    using public.wordle_puzzles p
    where a.puzzle_id = p.id
      and a.user_id = p_user_id
      and p.answer = normalized_word;
    get diagnostics deleted_attempts = row_count;

    if cardinality(target_ids) > 0 then
      delete from public.gameplay_activity
      where user_id = p_user_id
        and game_type = 'wordle'
        and target_id = any (target_ids);
      get diagnostics deleted_activity = row_count;
    end if;

  elsif p_scope = 'crossword_puzzle' then
    if p_puzzle_id is null then
      raise exception 'puzzle id required';
    end if;
    delete from public.crossword_progress
    where user_id = p_user_id and puzzle_id = p_puzzle_id;
    get diagnostics deleted_progress = row_count;
    delete from public.gameplay_activity
    where user_id = p_user_id
      and game_type = 'crossword'
      and target_id = p_puzzle_id;
    get diagnostics deleted_activity = row_count;

  else
    raise exception 'invalid scope';
  end if;

  if p_scope in ('all', 'wordle_all', 'wordle_day', 'wordle_word') then
    perform public.recalculate_wordle_stats(p_user_id);
  end if;
  if p_scope in ('all', 'crossword_all', 'crossword_puzzle') then
    perform public.recalculate_crossword_stats(p_user_id);
  end if;

  perform public.write_audit_log(
    'stats.reset', 'users', 'profile', p_user_id::text,
    null,
    jsonb_build_object(
      'scope', p_scope,
      'puzzle_date', p_puzzle_date,
      'word', p_word,
      'puzzle_id', p_puzzle_id,
      'deleted_attempts', deleted_attempts,
      'deleted_progress', deleted_progress,
      'deleted_activity', deleted_activity
    ),
    '{}'::jsonb,
    'success'
  );

  return jsonb_build_object(
    'scope', p_scope,
    'deleted_attempts', deleted_attempts,
    'deleted_progress', deleted_progress,
    'deleted_activity', deleted_activity
  );
end;
$$;

grant execute on function public.admin_list_user_game_history(uuid) to authenticated;
grant execute on function public.admin_reset_user_stats(uuid, text, date, text, uuid) to authenticated;
