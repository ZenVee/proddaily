-- Public profile URLs: stateid-nickname or stateid-firstname-lastname

create or replace function public.slugify(t text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]+', '-', 'g')),
    ''
  );
$$;

create or replace function public.profile_public_slug(p public.profiles)
returns text
language sql
immutable
as $$
  select case
    when public.slugify(p.state_id) is null then null
    when public.slugify(p.nickname) is not null then
      public.slugify(p.state_id) || '-' || public.slugify(p.nickname)
    when public.slugify(p.first_name) is not null and public.slugify(p.last_name) is not null then
      public.slugify(p.state_id) || '-' || public.slugify(p.first_name) || '-' || public.slugify(p.last_name)
    when public.slugify(p.first_name) is not null then
      public.slugify(p.state_id) || '-' || public.slugify(p.first_name)
    when public.slugify(p.last_name) is not null then
      public.slugify(p.state_id) || '-' || public.slugify(p.last_name)
    else public.slugify(p.state_id)
  end;
$$;

create or replace function public.public_profile_payload(p public.profiles)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ws public.wordle_stats;
  cs public.crossword_stats;
begin
  select * into ws from public.wordle_stats where user_id = p.id;
  select * into cs from public.crossword_stats where user_id = p.id;

  return jsonb_build_object(
    'id', p.id,
    'slug', public.profile_public_slug(p),
    'display_name', public.public_display_name(p),
    'avatar_url', coalesce(
      case when p.custom_avatar_path is not null then null else p.discord_avatar_url end,
      p.discord_avatar_url
    ),
    'custom_avatar_path', p.custom_avatar_path,
    'wordle', jsonb_build_object(
      'games_played', coalesce(ws.games_played, 0),
      'games_won', coalesce(ws.games_won, 0),
      'win_percentage', case when coalesce(ws.games_played, 0) = 0 then 0
        else round((ws.games_won::numeric / ws.games_played) * 100) end,
      'current_streak', coalesce(ws.current_streak, 0),
      'longest_streak', coalesce(ws.longest_streak, 0)
    ),
    'crossword', jsonb_build_object(
      'started', coalesce(cs.started, 0),
      'completed', coalesce(cs.completed, 0),
      'fastest_seconds', cs.fastest_seconds
    )
  );
end;
$$;

create or replace function public.get_public_profile(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where id = p_user_id and profile_setup_complete = true;
  if p.id is null then
    return null;
  end if;
  return public.public_profile_payload(p);
end;
$$;

create or replace function public.get_public_profile_by_ref(p_ref text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p public.profiles;
  ref text := lower(trim(p_ref));
begin
  if ref is null or ref = '' then
    return null;
  end if;

  if ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return public.get_public_profile(ref::uuid);
  end if;

  select * into p
  from public.profiles pr
  where pr.profile_setup_complete = true
    and public.profile_public_slug(pr) = ref
  limit 1;

  if p.id is null then
    return null;
  end if;
  return public.public_profile_payload(p);
end;
$$;

grant execute on function public.slugify(text) to anon, authenticated;
grant execute on function public.profile_public_slug(public.profiles) to anon, authenticated;
grant execute on function public.public_profile_payload(public.profiles) to anon, authenticated;
grant execute on function public.get_public_profile_by_ref(text) to anon, authenticated;
