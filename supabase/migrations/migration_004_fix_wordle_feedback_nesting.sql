-- Fix submit_wordle_guess storing feedback as a flat status array instead of
-- nested per-guess rows. Also repair existing attempt.feedback values.

create or replace function public.submit_wordle_guess(p_guess text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  puzzle public.wordle_puzzles;
  attempt public.wordle_attempts;
  guess text := upper(trim(p_guess));
  fb text[];
  new_guesses text[];
  new_feedback jsonb;
  new_status public.wordle_attempt_status;
  won boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if guess !~ '^[A-Z]{5}$' then
    raise exception 'invalid guess';
  end if;

  select * into puzzle from public.wordle_puzzles
  where puzzle_date = public.app_today()
    and status in ('published', 'scheduled', 'completed')
  order by created_at desc
  limit 1;

  if puzzle.id is null then
    raise exception 'no active puzzle';
  end if;

  select * into attempt from public.wordle_attempts
  where puzzle_id = puzzle.id and user_id = auth.uid()
  for update;

  if attempt.id is null then
    insert into public.wordle_attempts (puzzle_id, user_id)
    values (puzzle.id, auth.uid())
    returning * into attempt;
    perform public.log_gameplay_event('wordle.started', 'wordle', puzzle.id, '{}'::jsonb);
  end if;

  if attempt.status <> 'in_progress' then
    raise exception 'attempt already completed';
  end if;

  if attempt.guess_count >= 6 then
    raise exception 'no guesses remaining';
  end if;

  fb := public.evaluate_wordle_guess(guess, puzzle.answer);
  new_guesses := attempt.guesses || guess;
  -- Wrap each guess's feedback row so jsonb || nests [[...]] instead of flattening.
  new_feedback := coalesce(attempt.feedback, '[]'::jsonb) || jsonb_build_array(to_jsonb(fb));
  won := (guess = puzzle.answer);

  if won then
    new_status := 'won';
  elsif array_length(new_guesses, 1) >= 6 then
    new_status := 'lost';
  else
    new_status := 'in_progress';
  end if;

  update public.wordle_attempts set
    guesses = new_guesses,
    feedback = new_feedback,
    guess_count = array_length(new_guesses, 1),
    status = new_status,
    completed_at = case when new_status <> 'in_progress' then timezone('utc', now()) else null end,
    updated_at = timezone('utc', now())
  where id = attempt.id
  returning * into attempt;

  if new_status = 'won' then
    perform public.log_gameplay_event('wordle.completed', 'wordle', puzzle.id, jsonb_build_object('guesses', attempt.guess_count));
    perform public.recalculate_wordle_stats(auth.uid());
  elsif new_status = 'lost' then
    perform public.log_gameplay_event('wordle.failed', 'wordle', puzzle.id, '{}'::jsonb);
    perform public.recalculate_wordle_stats(auth.uid());
  end if;

  return jsonb_build_object(
    'feedback', to_jsonb(fb),
    'guess_count', attempt.guess_count,
    'status', attempt.status,
    'answer', case when attempt.status <> 'in_progress' then puzzle.answer else null end,
    'guesses', attempt.guesses,
    'all_feedback', attempt.feedback
  );
end;
$$;

-- Rebuild nested feedback from guesses for any flattened / corrupt rows.
update public.wordle_attempts a
set feedback = coalesce((
  select jsonb_agg(to_jsonb(public.evaluate_wordle_guess(g, p.answer)) order by ord)
  from unnest(a.guesses) with ordinality as u(g, ord)
  join public.wordle_puzzles p on p.id = a.puzzle_id
), '[]'::jsonb)
where coalesce(cardinality(a.guesses), 0) > 0
  and (
    a.feedback is null
    or jsonb_typeof(a.feedback) <> 'array'
    or jsonb_array_length(a.feedback) = 0
    or jsonb_typeof(a.feedback -> 0) = 'string'
  );
