-- Prod Daily — master schema (fresh Supabase install)
-- Safe to run on a new project. Does not include production user data or secrets.
-- Keep synchronized with supabase/migrations/migration_*.sql

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('developer', 'manager', 'staff', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wordle_puzzle_status as enum ('draft', 'scheduled', 'published', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wordle_attempt_status as enum ('in_progress', 'won', 'lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.crossword_difficulty as enum ('easy', 'medium', 'hard');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.crossword_puzzle_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.crossword_progress_status as enum ('in_progress', 'completed', 'abandoned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.audit_result as enum ('success', 'failure', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Roles & permissions
-- ---------------------------------------------------------------------------
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key public.app_role not null unique,
  label text not null,
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  category text not null,
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique,
  discord_username text,
  discord_avatar_url text,
  first_name text,
  last_name text,
  nickname text,
  state_id text unique,
  custom_avatar_path text,
  role_id uuid not null references public.roles(id),
  profile_setup_complete boolean not null default false,
  last_activity_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_names_when_complete check (
    profile_setup_complete = false
    or (first_name is not null and length(trim(first_name)) > 0
        and last_name is not null and length(trim(last_name)) > 0
        and state_id is not null and length(trim(state_id)) > 0)
  )
);

create index if not exists profiles_role_id_idx on public.profiles(role_id);
create index if not exists profiles_last_activity_idx on public.profiles(last_activity_at desc nulls last);
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);
create index if not exists profiles_discord_username_idx on public.profiles(discord_username);
create index if not exists profiles_state_id_idx on public.profiles(state_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- App settings
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

-- Timezone helpers (require app_settings)
create or replace function public.current_app_timezone()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value #>> '{}' from public.app_settings where key = 'timezone'),
    'America/New_York'
  );
$$;

create or replace function public.app_today()
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (timezone(public.current_app_timezone(), now()))::date;
$$;

-- ---------------------------------------------------------------------------
-- Wordle
-- ---------------------------------------------------------------------------
create table if not exists public.wordle_puzzles (
  id uuid primary key default gen_random_uuid(),
  puzzle_date date not null,
  answer text not null,
  status public.wordle_puzzle_status not null default 'scheduled',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint wordle_answer_format check (answer ~ '^[A-Z]{5}$')
);

create unique index if not exists wordle_puzzles_published_date_uidx
  on public.wordle_puzzles(puzzle_date)
  where status in ('published', 'completed', 'scheduled');

create index if not exists wordle_puzzles_status_date_idx on public.wordle_puzzles(status, puzzle_date);

drop trigger if exists wordle_puzzles_set_updated_at on public.wordle_puzzles;
create trigger wordle_puzzles_set_updated_at
before update on public.wordle_puzzles
for each row execute function public.set_updated_at();

create table if not exists public.wordle_attempts (
  id uuid primary key default gen_random_uuid(),
  puzzle_id uuid not null references public.wordle_puzzles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  guesses text[] not null default '{}',
  feedback jsonb not null default '[]'::jsonb,
  guess_count int not null default 0 check (guess_count >= 0 and guess_count <= 6),
  status public.wordle_attempt_status not null default 'in_progress',
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (puzzle_id, user_id)
);

create index if not exists wordle_attempts_user_idx on public.wordle_attempts(user_id, started_at desc);

drop trigger if exists wordle_attempts_set_updated_at on public.wordle_attempts;
create trigger wordle_attempts_set_updated_at
before update on public.wordle_attempts
for each row execute function public.set_updated_at();

create table if not exists public.wordle_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  games_played int not null default 0,
  games_won int not null default 0,
  games_lost int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  total_guesses int not null default 0,
  guess_distribution int[] not null default '{0,0,0,0,0,0}',
  last_played_date date,
  last_won_date date,
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Crossword
-- ---------------------------------------------------------------------------
create table if not exists public.crossword_puzzles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  difficulty public.crossword_difficulty not null default 'medium',
  size int not null check (size >= 5 and size <= 25),
  grid jsonb not null,
  answer_key jsonb not null,
  clues jsonb not null,
  status public.crossword_puzzle_status not null default 'draft',
  publish_date date,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists crossword_puzzles_status_idx on public.crossword_puzzles(status, publish_date desc nulls last);

drop trigger if exists crossword_puzzles_set_updated_at on public.crossword_puzzles;
create trigger crossword_puzzles_set_updated_at
before update on public.crossword_puzzles
for each row execute function public.set_updated_at();

create table if not exists public.crossword_progress (
  id uuid primary key default gen_random_uuid(),
  puzzle_id uuid not null references public.crossword_puzzles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entered_letters jsonb not null default '[]'::jsonb,
  status public.crossword_progress_status not null default 'in_progress',
  hints_used int not null default 0,
  reveals_used int not null default 0,
  checks_used int not null default 0,
  active_seconds int not null default 0,
  assisted boolean not null default false,
  started_at timestamptz not null default timezone('utc', now()),
  last_activity_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (puzzle_id, user_id)
);

create index if not exists crossword_progress_user_idx on public.crossword_progress(user_id, last_activity_at desc);

drop trigger if exists crossword_progress_set_updated_at on public.crossword_progress;
create trigger crossword_progress_set_updated_at
before update on public.crossword_progress
for each row execute function public.set_updated_at();

create table if not exists public.crossword_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  started int not null default 0,
  completed int not null default 0,
  clean_completions int not null default 0,
  assisted_completions int not null default 0,
  total_active_seconds int not null default 0,
  fastest_seconds int,
  hints_used int not null default 0,
  reveals_used int not null default 0,
  checks_used int not null default 0,
  last_played_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Activity & audit
-- ---------------------------------------------------------------------------
create table if not exists public.gameplay_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  game_type text not null check (game_type in ('wordle', 'crossword')),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists gameplay_activity_user_idx on public.gameplay_activity(user_id, created_at desc);
create index if not exists gameplay_activity_type_idx on public.gameplay_activity(event_type, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  category text not null,
  target_type text,
  target_id text,
  previous_values jsonb,
  updated_values jsonb,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  ip_address inet,
  result public.audit_result not null default 'success',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_category_idx on public.audit_logs(category, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action, created_at desc);
create index if not exists audit_logs_target_idx on public.audit_logs(target_type, target_id);

-- Prevent mutation of audit logs via table grants / RLS
create or replace function public.deny_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs are append-only';
end;
$$;

drop trigger if exists audit_logs_no_update on public.audit_logs;
create trigger audit_logs_no_update
before update on public.audit_logs
for each row execute function public.deny_audit_mutation();

drop trigger if exists audit_logs_no_delete on public.audit_logs;
create trigger audit_logs_no_delete
before delete on public.audit_logs
for each row execute function public.deny_audit_mutation();

-- ---------------------------------------------------------------------------
-- Seed roles & permissions
-- ---------------------------------------------------------------------------
insert into public.roles (key, label, description) values
  ('developer', 'Developer', 'Full administration access with permission bypass'),
  ('manager', 'Manager', 'Staff dashboard with configurable permissions'),
  ('staff', 'Staff', 'Staff dashboard with assigned permissions only'),
  ('user', 'User', 'Default player role')
on conflict (key) do nothing;

insert into public.permissions (key, category, description) values
  ('users.view', 'users', 'View user list'),
  ('users.edit', 'users', 'Edit user profiles'),
  ('users.roles.manage', 'users', 'Change user roles'),
  ('users.private.view', 'users', 'View private profile fields'),
  ('users.activity.view', 'users', 'View user gameplay activity'),
  ('wordle.view', 'wordle', 'View wordle admin'),
  ('wordle.create', 'wordle', 'Create wordle puzzles'),
  ('wordle.edit', 'wordle', 'Edit wordle puzzles'),
  ('wordle.publish', 'wordle', 'Publish wordle puzzles'),
  ('wordle.delete', 'wordle', 'Delete wordle puzzles'),
  ('crosswords.view', 'crosswords', 'View crossword admin'),
  ('crosswords.create', 'crosswords', 'Create crosswords'),
  ('crosswords.edit', 'crosswords', 'Edit crosswords'),
  ('crosswords.publish', 'crosswords', 'Publish crosswords'),
  ('crosswords.delete', 'crosswords', 'Delete crosswords'),
  ('audit.view', 'administration', 'View audit logs'),
  ('audit.export', 'administration', 'Export audit logs'),
  ('permissions.manage', 'administration', 'Manage role permissions'),
  ('settings.manage', 'administration', 'Manage app settings'),
  ('appearance.manage', 'administration', 'Manage site appearance')
on conflict (key) do nothing;

-- Manager/Staff get empty permission sets by default (assign via dashboard).
-- Developer bypasses via has_permission(); no need to grant every key.

insert into public.app_settings (key, value) values
  ('timezone', '"America/New_York"'::jsonb),
  ('site_theme', '{"preset":"tan","primary":"#D4B896","secondary":"#BFA582","customHex":"#D4B896"}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Auth helpers
-- ---------------------------------------------------------------------------
create or replace function public.get_my_role_key()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select r.key
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid();
$$;

create or replace function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role_key() = 'developer', false);
$$;

create or replace function public.is_staff_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role_key() in ('developer', 'manager', 'staff'), false);
$$;

create or replace function public.has_permission(perm_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  role_key public.app_role;
begin
  if auth.uid() is null then
    return false;
  end if;

  select public.get_my_role_key() into role_key;
  if role_key is null then
    return false;
  end if;

  if role_key = 'developer' then
    return true;
  end if;

  return exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role_id
    join public.permissions perm on perm.id = rp.permission_id
    where p.id = auth.uid() and perm.key = perm_key
  );
end;
$$;

create or replace function public.discord_identity_from_user(u auth.users)
returns table (discord_id text, discord_username text, discord_avatar_url text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ident jsonb;
  meta jsonb;
  did text;
  uname text;
  avatar text;
begin
  meta := coalesce(u.raw_user_meta_data, '{}'::jsonb);

  select i into ident
  from jsonb_array_elements(coalesce(u.raw_app_meta_data->'providers', '[]'::jsonb)) as x(i)
  where false;

  -- Prefer identity data from auth.identities when available via metadata fields Discord provides
  did := coalesce(meta->>'provider_id', meta->>'sub', meta->>'id');
  uname := coalesce(meta->>'full_name', meta->>'name', meta->>'preferred_username', meta->>'user_name');
  avatar := coalesce(meta->>'avatar_url', meta->>'picture');

  -- custom_avatar from Discord CDN often in avatar_url
  return query select did, uname, avatar;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role_id uuid;
  did text;
  uname text;
  avatar text;
begin
  select id into user_role_id from public.roles where key = 'user' limit 1;

  did := coalesce(
    new.raw_user_meta_data->>'provider_id',
    new.raw_user_meta_data->>'sub',
    new.raw_user_meta_data->>'id'
  );
  uname := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'user_name'
  );
  avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  insert into public.profiles (
    id, discord_id, discord_username, discord_avatar_url, role_id, profile_setup_complete
  ) values (
    new.id, did, uname, avatar, user_role_id, false
  )
  on conflict (id) do update set
    discord_id = coalesce(excluded.discord_id, public.profiles.discord_id),
    discord_username = coalesce(excluded.discord_username, public.profiles.discord_username),
    discord_avatar_url = coalesce(excluded.discord_avatar_url, public.profiles.discord_avatar_url),
    updated_at = timezone('utc', now());

  insert into public.wordle_stats (user_id) values (new.id) on conflict do nothing;
  insert into public.crossword_stats (user_id) values (new.id) on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Audit helper
-- ---------------------------------------------------------------------------
create or replace function public.write_audit_log(
  p_action text,
  p_category text,
  p_target_type text default null,
  p_target_id text default null,
  p_previous jsonb default null,
  p_updated jsonb default null,
  p_metadata jsonb default '{}'::jsonb,
  p_result public.audit_result default 'success',
  p_request_id text default null,
  p_ip inet default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.audit_logs (
    actor_id, action, category, target_type, target_id,
    previous_values, updated_values, metadata, request_id, ip_address, result
  ) values (
    auth.uid(), p_action, p_category, p_target_type, p_target_id,
    p_previous, p_updated, coalesce(p_metadata, '{}'::jsonb), p_request_id, p_ip, p_result
  ) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.log_gameplay_event(
  p_event_type text,
  p_game_type text,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.gameplay_activity (user_id, event_type, game_type, target_id, metadata)
  values (auth.uid(), p_event_type, p_game_type, p_target_id, coalesce(p_metadata, '{}'::jsonb))
  returning id into new_id;

  update public.profiles set last_activity_at = timezone('utc', now()) where id = auth.uid();
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile RPCs
-- ---------------------------------------------------------------------------
create or replace function public.complete_profile_setup(
  p_first_name text,
  p_last_name text,
  p_state_id text,
  p_nickname text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if length(trim(p_first_name)) = 0 or length(trim(p_last_name)) = 0 then
    raise exception 'first and last name are required';
  end if;
  if length(trim(p_state_id)) = 0 then
    raise exception 'state id is required';
  end if;

  update public.profiles set
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    state_id = trim(p_state_id),
    nickname = nullif(trim(coalesce(p_nickname, '')), ''),
    profile_setup_complete = true,
    updated_at = timezone('utc', now())
  where id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'profile not found';
  end if;

  return result;
exception
  when unique_violation then
    raise exception 'state id is already taken';
end;
$$;

create or replace function public.update_own_profile(
  p_first_name text,
  p_last_name text,
  p_state_id text,
  p_nickname text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles set
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    state_id = trim(p_state_id),
    nickname = nullif(trim(coalesce(p_nickname, '')), ''),
    updated_at = timezone('utc', now())
  where id = auth.uid() and profile_setup_complete = true
  returning * into result;

  if result.id is null then
    raise exception 'profile not found or incomplete';
  end if;
  return result;
exception
  when unique_violation then
    raise exception 'state id is already taken';
end;
$$;

create or replace function public.public_display_name(p public.profiles)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(p.nickname), ''),
    case when p.discord_username is not null then 'Player-' || left(replace(p.id::text, '-', ''), 8)
         else 'Player-' || left(replace(p.id::text, '-', ''), 8) end
  );
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
  ws public.wordle_stats;
  cs public.crossword_stats;
begin
  select * into p from public.profiles where id = p_user_id and profile_setup_complete = true;
  if p.id is null then
    return null;
  end if;
  select * into ws from public.wordle_stats where user_id = p_user_id;
  select * into cs from public.crossword_stats where user_id = p_user_id;

  return jsonb_build_object(
    'id', p.id,
    'display_name', public.public_display_name(p),
    'avatar_url', coalesce(
      case when p.custom_avatar_path is not null
        then null -- client resolves storage URL
        else p.discord_avatar_url end,
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

-- ---------------------------------------------------------------------------
-- Role management
-- ---------------------------------------------------------------------------
create or replace function public.count_developers()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where r.key = 'developer';
$$;

create or replace function public.admin_set_user_role(p_user_id uuid, p_role public.app_role)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles;
  old_role public.app_role;
  new_role_id uuid;
  actor_role public.app_role;
begin
  if auth.uid() is null then
    perform public.write_audit_log('role.change', 'users', 'profile', p_user_id::text, null, null, '{}'::jsonb, 'rejected');
    raise exception 'not authenticated';
  end if;

  if not public.has_permission('users.roles.manage') then
    perform public.write_audit_log('role.change', 'users', 'profile', p_user_id::text, null, null, '{}'::jsonb, 'rejected');
    raise exception 'permission denied';
  end if;

  actor_role := public.get_my_role_key();

  select r.key into old_role
  from public.profiles p join public.roles r on r.id = p.role_id
  where p.id = p_user_id;

  if old_role is null then
    raise exception 'user not found';
  end if;

  if p_role = 'developer' and actor_role <> 'developer' then
    perform public.write_audit_log('role.change', 'users', 'profile', p_user_id::text, null, null, '{}'::jsonb, 'rejected');
    raise exception 'only developers can assign the developer role';
  end if;

  if old_role = 'developer' and p_role <> 'developer' and public.count_developers() <= 1 then
    perform public.write_audit_log('role.change', 'users', 'profile', p_user_id::text, null, null, '{}'::jsonb, 'rejected');
    raise exception 'cannot remove the final developer';
  end if;

  if p_user_id = auth.uid() and actor_role <> 'developer' and p_role <> old_role then
    -- Managers/Staff cannot change their own role
    perform public.write_audit_log('role.change', 'users', 'profile', p_user_id::text, null, null, '{}'::jsonb, 'rejected');
    raise exception 'cannot change your own role';
  end if;

  select id into new_role_id from public.roles where key = p_role;

  update public.profiles set role_id = new_role_id, updated_at = timezone('utc', now())
  where id = p_user_id
  returning * into target;

  perform public.write_audit_log(
    'role.change', 'users', 'profile', p_user_id::text,
    jsonb_build_object('role', old_role),
    jsonb_build_object('role', p_role),
    '{}'::jsonb, 'success'
  );

  return target;
end;
$$;

-- ---------------------------------------------------------------------------
-- Wordle secure gameplay
-- ---------------------------------------------------------------------------
create or replace function public.evaluate_wordle_guess(guess text, answer text)
returns text[]
language plpgsql
immutable
as $$
declare
  g text := upper(guess);
  a text := upper(answer);
  result text[] := array['absent','absent','absent','absent','absent'];
  used boolean[] := array[false,false,false,false,false];
  i int;
  j int;
begin
  for i in 1..5 loop
    if substr(g, i, 1) = substr(a, i, 1) then
      result[i] := 'correct';
      used[i] := true;
    end if;
  end loop;
  for i in 1..5 loop
    if result[i] = 'correct' then continue; end if;
    for j in 1..5 loop
      if not used[j] and substr(g, i, 1) = substr(a, j, 1) then
        result[i] := 'present';
        used[j] := true;
        exit;
      end if;
    end loop;
  end loop;
  return result;
end;
$$;

create or replace function public.get_active_wordle_puzzle()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p public.wordle_puzzles;
  attempt public.wordle_attempts;
  reveal boolean := false;
begin
  select * into p from public.wordle_puzzles
  where puzzle_date = public.app_today()
    and status in ('published', 'scheduled', 'completed')
  order by created_at desc
  limit 1;

  if p.id is null then
    return null;
  end if;

  if auth.uid() is not null then
    select * into attempt from public.wordle_attempts
    where puzzle_id = p.id and user_id = auth.uid();
    reveal := attempt.status in ('won', 'lost');
  end if;

  -- Also reveal after the puzzle day has passed
  if p.puzzle_date < public.app_today() then
    reveal := true;
  end if;

  return jsonb_build_object(
    'id', p.id,
    'puzzle_date', p.puzzle_date,
    'status', p.status,
    'answer', case when reveal then p.answer else null end,
    'attempt', case when attempt.id is null then null else jsonb_build_object(
      'guesses', attempt.guesses,
      'feedback', attempt.feedback,
      'guess_count', attempt.guess_count,
      'status', attempt.status,
      'started_at', attempt.started_at,
      'completed_at', attempt.completed_at
    ) end
  );
end;
$$;

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
  new_feedback := coalesce(attempt.feedback, '[]'::jsonb) || to_jsonb(fb);
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
    'feedback', fb,
    'guess_count', attempt.guess_count,
    'status', attempt.status,
    'answer', case when attempt.status <> 'in_progress' then puzzle.answer else null end,
    'guesses', attempt.guesses,
    'all_feedback', attempt.feedback
  );
end;
$$;

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
  tz text := public.current_app_timezone();
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
  -- Break streak if missed yesterday relative to app today (and not played today yet winning)
  if last_won is not null then
    if last_won < public.app_today() - 1 then
      cur_streak := 0;
    elsif last_won = public.app_today() - 1 then
      -- still visible during today before deadline
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
    longest_streak = greatest(ws.longest_streak, excluded.longest_streak),
    total_guesses = excluded.total_guesses,
    guess_distribution = excluded.guess_distribution,
    last_played_date = excluded.last_played_date,
    last_won_date = excluded.last_won_date,
    updated_at = excluded.updated_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Crossword player-safe + progress
-- ---------------------------------------------------------------------------
create or replace function public.get_published_crosswords()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'title', title,
    'description', description,
    'difficulty', difficulty,
    'size', size,
    'status', status,
    'publish_date', publish_date,
    'created_at', created_at,
    'updated_at', updated_at
  ) order by publish_date desc nulls last), '[]'::jsonb)
  from public.crossword_puzzles
  where status = 'published';
$$;

create or replace function public.get_crossword_for_play(p_puzzle_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p public.crossword_puzzles;
  progress public.crossword_progress;
  safe_grid jsonb;
  safe_clues jsonb;
begin
  select * into p from public.crossword_puzzles where id = p_puzzle_id and status = 'published';
  if p.id is null then
    if public.has_permission('crosswords.view') then
      select * into p from public.crossword_puzzles where id = p_puzzle_id;
    end if;
  end if;
  if p.id is null then
    return null;
  end if;

  -- Strip letters from grid for players
  safe_grid := (
    select jsonb_agg(
      (select jsonb_agg(
        case when (cell->>'isBlocked')::boolean then cell
        else (cell - 'letter') || jsonb_build_object('letter', '')
        end
      ) from jsonb_array_elements(row_cells) cell)
    )
    from jsonb_array_elements(p.grid) row_cells
  );

  safe_clues := (
    select jsonb_agg(c - 'answer')
    from jsonb_array_elements(p.clues) c
  );

  if auth.uid() is not null then
    select * into progress from public.crossword_progress
    where puzzle_id = p.id and user_id = auth.uid();
  end if;

  return jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'description', p.description,
    'difficulty', p.difficulty,
    'size', p.size,
    'status', p.status,
    'publish_date', p.publish_date,
    'grid', safe_grid,
    'clues', safe_clues,
    'progress', case when progress.id is null then null else to_jsonb(progress) end
  );
end;
$$;

create or replace function public.save_crossword_progress(
  p_puzzle_id uuid,
  p_entered_letters jsonb,
  p_active_seconds int default null,
  p_hints_used int default null,
  p_reveals_used int default null,
  p_checks_used int default null
)
returns public.crossword_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.crossword_progress;
  exists_pub boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select exists(select 1 from public.crossword_puzzles where id = p_puzzle_id and status = 'published')
  into exists_pub;
  if not exists_pub then raise exception 'puzzle not available'; end if;

  insert into public.crossword_progress as cp (
    puzzle_id, user_id, entered_letters, active_seconds, hints_used, reveals_used, checks_used, last_activity_at
  ) values (
    p_puzzle_id, auth.uid(), coalesce(p_entered_letters, '[]'::jsonb),
    coalesce(p_active_seconds, 0), coalesce(p_hints_used, 0), coalesce(p_reveals_used, 0), coalesce(p_checks_used, 0),
    timezone('utc', now())
  )
  on conflict (puzzle_id, user_id) do update set
    entered_letters = excluded.entered_letters,
    active_seconds = coalesce(p_active_seconds, cp.active_seconds),
    hints_used = coalesce(p_hints_used, cp.hints_used),
    reveals_used = coalesce(p_reveals_used, cp.reveals_used),
    checks_used = coalesce(p_checks_used, cp.checks_used),
    assisted = cp.assisted or coalesce(p_reveals_used, 0) > cp.reveals_used or coalesce(p_hints_used, 0) > cp.hints_used,
    last_activity_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where cp.status = 'in_progress'
  returning * into result;

  if result.id is null then
    select * into result from public.crossword_progress where puzzle_id = p_puzzle_id and user_id = auth.uid();
  elsif result.created_at = result.updated_at then
    perform public.log_gameplay_event('crossword.started', 'crossword', p_puzzle_id, '{}'::jsonb);
  end if;

  update public.profiles set last_activity_at = timezone('utc', now()) where id = auth.uid();
  return result;
end;
$$;

create or replace function public.complete_crossword(
  p_puzzle_id uuid,
  p_entered_letters jsonb,
  p_active_seconds int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  puzzle public.crossword_puzzles;
  progress public.crossword_progress;
  cell jsonb;
  row_cells jsonb;
  r int := 0;
  c int;
  entered text;
  expected text;
  ok boolean := true;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into puzzle from public.crossword_puzzles where id = p_puzzle_id and status = 'published';
  if puzzle.id is null then raise exception 'puzzle not available'; end if;

  for row_cells in select * from jsonb_array_elements(puzzle.grid)
  loop
    c := 0;
    for cell in select * from jsonb_array_elements(row_cells)
    loop
      if not coalesce((cell->>'isBlocked')::boolean, false) then
        expected := upper(coalesce(cell->>'letter', ''));
        entered := upper(coalesce(p_entered_letters->r->>c, ''));
        if entered <> expected then
          ok := false;
          exit;
        end if;
      end if;
      c := c + 1;
    end loop;
    exit when not ok;
    r := r + 1;
  end loop;

  if not ok then
    raise exception 'solution incorrect';
  end if;

  insert into public.crossword_progress as cp (
    puzzle_id, user_id, entered_letters, status, active_seconds, completed_at, last_activity_at
  ) values (
    p_puzzle_id, auth.uid(), p_entered_letters, 'completed', p_active_seconds,
    timezone('utc', now()), timezone('utc', now())
  )
  on conflict (puzzle_id, user_id) do update set
    entered_letters = excluded.entered_letters,
    status = 'completed',
    active_seconds = excluded.active_seconds,
    completed_at = timezone('utc', now()),
    last_activity_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  returning * into progress;

  perform public.log_gameplay_event(
    'crossword.completed', 'crossword', p_puzzle_id,
    jsonb_build_object('assisted', progress.assisted, 'seconds', progress.active_seconds)
  );
  perform public.recalculate_crossword_stats(auth.uid());

  return jsonb_build_object('ok', true, 'assisted', progress.assisted, 'progress', to_jsonb(progress));
end;
$$;

create or replace function public.recalculate_crossword_stats(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started int;
  v_completed int;
  v_clean int;
  v_assisted int;
  v_seconds int;
  v_fastest int;
  v_hints int;
  v_reveals int;
  v_checks int;
  v_last timestamptz;
begin
  select
    count(*),
    count(*) filter (where status = 'completed'),
    count(*) filter (where status = 'completed' and assisted = false),
    count(*) filter (where status = 'completed' and assisted = true),
    coalesce(sum(active_seconds), 0),
    min(active_seconds) filter (where status = 'completed'),
    coalesce(sum(hints_used), 0),
    coalesce(sum(reveals_used), 0),
    coalesce(sum(checks_used), 0),
    max(last_activity_at)
  into v_started, v_completed, v_clean, v_assisted, v_seconds, v_fastest, v_hints, v_reveals, v_checks, v_last
  from public.crossword_progress
  where user_id = p_user_id;

  insert into public.crossword_stats as cs (
    user_id, started, completed, clean_completions, assisted_completions,
    total_active_seconds, fastest_seconds, hints_used, reveals_used, checks_used, last_played_at, updated_at
  ) values (
    p_user_id, v_started, v_completed, v_clean, v_assisted,
    v_seconds, v_fastest, v_hints, v_reveals, v_checks, v_last, timezone('utc', now())
  )
  on conflict (user_id) do update set
    started = excluded.started,
    completed = excluded.completed,
    clean_completions = excluded.clean_completions,
    assisted_completions = excluded.assisted_completions,
    total_active_seconds = excluded.total_active_seconds,
    fastest_seconds = excluded.fastest_seconds,
    hints_used = excluded.hints_used,
    reveals_used = excluded.reveals_used,
    checks_used = excluded.checks_used,
    last_played_at = excluded.last_played_at,
    updated_at = excluded.updated_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.wordle_puzzles enable row level security;
alter table public.wordle_attempts enable row level security;
alter table public.wordle_stats enable row level security;
alter table public.crossword_puzzles enable row level security;
alter table public.crossword_progress enable row level security;
alter table public.crossword_stats enable row level security;
alter table public.gameplay_activity enable row level security;
alter table public.audit_logs enable row level security;

-- Roles/permissions readable by authenticated
drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles for select to authenticated using (true);

drop policy if exists permissions_read on public.permissions;
create policy permissions_read on public.permissions for select to authenticated using (true);

drop policy if exists role_permissions_read on public.role_permissions;
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);

drop policy if exists role_permissions_manage on public.role_permissions;
create policy role_permissions_manage on public.role_permissions for all to authenticated
using (public.has_permission('permissions.manage'))
with check (public.has_permission('permissions.manage'));

-- Profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.has_permission('users.view')
  or public.has_permission('users.private.view')
);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
using (id = auth.uid() or public.has_permission('users.edit'))
with check (
  (id = auth.uid() and role_id = (select role_id from public.profiles where id = auth.uid()))
  or public.has_permission('users.edit')
);

-- Settings
drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select to authenticated, anon using (true);

drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all to authenticated
using (public.has_permission('settings.manage') or public.has_permission('appearance.manage'))
with check (public.has_permission('settings.manage') or public.has_permission('appearance.manage'));

-- Wordle puzzles: never expose answer via direct select for players
drop policy if exists wordle_puzzles_admin on public.wordle_puzzles;
create policy wordle_puzzles_admin on public.wordle_puzzles for all to authenticated
using (public.has_permission('wordle.view') or public.has_permission('wordle.create') or public.has_permission('wordle.edit'))
with check (public.has_permission('wordle.create') or public.has_permission('wordle.edit') or public.has_permission('wordle.publish') or public.has_permission('wordle.delete'));

-- Attempts: own only
drop policy if exists wordle_attempts_own on public.wordle_attempts;
create policy wordle_attempts_own on public.wordle_attempts for select to authenticated
using (user_id = auth.uid() or public.has_permission('users.activity.view'));

drop policy if exists wordle_stats_read on public.wordle_stats;
create policy wordle_stats_read on public.wordle_stats for select to authenticated
using (user_id = auth.uid() or public.has_permission('users.activity.view') or public.has_permission('users.view'));

-- Crossword: direct table access for staff only (players use RPCs without answer_key)
drop policy if exists crossword_admin on public.crossword_puzzles;
create policy crossword_admin on public.crossword_puzzles for all to authenticated
using (
  public.has_permission('crosswords.view')
  or public.has_permission('crosswords.edit')
  or public.has_permission('crosswords.create')
)
with check (
  public.has_permission('crosswords.create')
  or public.has_permission('crosswords.edit')
  or public.has_permission('crosswords.publish')
  or public.has_permission('crosswords.delete')
);

drop policy if exists crossword_progress_own on public.crossword_progress;
create policy crossword_progress_own on public.crossword_progress for select to authenticated
using (user_id = auth.uid() or public.has_permission('users.activity.view'));

drop policy if exists crossword_stats_read on public.crossword_stats;
create policy crossword_stats_read on public.crossword_stats for select to authenticated
using (user_id = auth.uid() or public.has_permission('users.activity.view') or public.has_permission('users.view'));

-- Activity
drop policy if exists gameplay_own on public.gameplay_activity;
create policy gameplay_own on public.gameplay_activity for select to authenticated
using (user_id = auth.uid() or public.has_permission('users.activity.view'));

-- Audit
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated
using (public.has_permission('audit.view'));

-- Inserts into audit/gameplay go through security definer functions

-- ---------------------------------------------------------------------------
-- Storage policies for avatars (run after creating bucket `avatars`)
-- ---------------------------------------------------------------------------
-- create bucket via dashboard or: insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.roles, public.permissions, public.role_permissions to authenticated;
grant select on public.app_settings to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.wordle_stats, public.crossword_stats to authenticated;
grant select on public.wordle_attempts, public.crossword_progress, public.gameplay_activity to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.crossword_puzzles to authenticated;
grant all on public.wordle_puzzles to authenticated;
grant all on public.crossword_puzzles to authenticated;
grant all on public.role_permissions to authenticated;
grant all on public.app_settings to authenticated;

grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.is_staff_role() to authenticated;
grant execute on function public.is_developer() to authenticated;
grant execute on function public.get_my_role_key() to authenticated;
grant execute on function public.complete_profile_setup(text, text, text, text) to authenticated;
grant execute on function public.update_own_profile(text, text, text, text) to authenticated;
grant execute on function public.get_public_profile(uuid) to anon, authenticated;
grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.get_active_wordle_puzzle() to anon, authenticated;
grant execute on function public.submit_wordle_guess(text) to authenticated;
grant execute on function public.get_published_crosswords() to anon, authenticated;
grant execute on function public.get_crossword_for_play(uuid) to anon, authenticated;
grant execute on function public.save_crossword_progress(uuid, jsonb, int, int, int, int) to authenticated;
grant execute on function public.complete_crossword(uuid, jsonb, int) to authenticated;
grant execute on function public.write_audit_log(text, text, text, text, jsonb, jsonb, jsonb, public.audit_result, text, inet) to authenticated;
grant execute on function public.log_gameplay_event(text, text, uuid, jsonb) to authenticated;
grant execute on function public.app_today() to anon, authenticated;
grant execute on function public.current_app_timezone() to anon, authenticated;

-- See also: supabase/migrations/migration_002_storage_avatars.sql for avatars bucket policies.

