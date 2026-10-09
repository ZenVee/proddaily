# Prod Daily — Backend Setup

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **publishable** key into `.env` (see `.env.example`).
3. Never expose the **service_role** key in the frontend.

## 2. Discord OAuth

1. Create an application at [Discord Developer Portal](https://discord.com/developers/applications).
2. Add a redirect URL:
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. In Supabase → Authentication → Providers → Discord, enable Discord and paste Client ID / Secret.
4. Site URL / additional redirects should include your app origin, e.g. `http://localhost:5173` and production URL.
5. App callback path used by this frontend: `/auth/callback`.

## 3. Environment variables

Browser (`.env`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server-only (Supabase Dashboard / Edge Function secrets):

- `SUPABASE_SERVICE_ROLE_KEY` (never in `VITE_*`)
- Discord client secret (Auth provider settings only)

## 4. Database migrations

Apply in order against a fresh project:

1. `supabase/migrations/migration_001_initial_schema.sql` (or run `master_schema.sql`)
2. `supabase/migrations/migration_002_storage_avatars.sql`
3. `supabase/migrations/migration_003_profile_public_slug.sql` (included in updated `master_schema.sql`)

Public profile URLs use `/profile/{stateid-nickname}` or `/profile/{stateid-firstname-lastname}` (not UUIDs). UUID refs still resolve and should redirect to the slug.

`master_schema.sql` is the full clean-install schema. Keep it synchronized when adding migrations.

Default timezone setting: `America/New_York` (`app_settings.timezone`).

## 5. Developer bootstrap

After your Discord account signs in once (profile row created):

```sql
-- Replace with your auth user UUID from auth.users / profiles
update public.profiles
set role_id = (select id from public.roles where key = 'developer')
where id = 'YOUR_USER_UUID';
```

Only Developers can assign the Developer role. The final Developer cannot be demoted.

## 6. Roles and permissions

Roles: `developer`, `manager`, `staff`, `user`.

- Developer bypasses permission checks via `has_permission()` (RLS remains enabled).
- Manager / Staff receive permissions through `role_permissions`.
- Users cannot access the staff dashboard.

## 7. Storage

Bucket: `avatars` (public read, user-folder write). Paths: `{user_id}/avatar.*`.

## 8. Edge Functions

Optional: `supabase/functions/wordle-guess` wraps `submit_wordle_guess`.

Primary gameplay uses Postgres RPCs directly with the user JWT:

- `get_active_wordle_puzzle` / `submit_wordle_guess`
- `get_published_crosswords` / `get_crossword_for_play` / `save_crossword_progress` / `complete_crossword`

## 9. RLS design

- Profiles: own row + staff with `users.view` / `users.private.view`
- Wordle answers: not exposed via public table reads for players; use RPCs
- Crossword answer keys: staff table access only; players use player-safe RPCs
- Audit logs: append-only (triggers block update/delete); read requires `audit.view`

## 10. Audit & activity

- `audit_logs` — administrative / privileged actions
- `gameplay_activity` — Wordle/Crossword lifecycle events (not keystrokes)

## 11. Statistics & streaks

Wordle streaks recalculate from verified `wordle_attempts` using `app_today()` / configured timezone. Missing a calendar day breaks the streak. Cached rows in `wordle_stats` / `crossword_stats` can be rebuilt via `recalculate_wordle_stats` / `recalculate_crossword_stats`.

## 12. Local development

```bash
cp .env.example .env
# fill Supabase values
npm install
npm run dev
```

Without `.env`, the UI still runs with localStorage fallbacks for some puzzle admin/demo paths; Discord auth and secure gameplay require a real project.

## 13. Test checklist

See plan §19: auth flows, role denial, Wordle guess rules, crossword publish/progress, audit immutability, public profile privacy.

## Manual Dashboard steps

- Enable Discord provider
- Run SQL migrations (SQL editor or CLI)
- Confirm `avatars` bucket exists
- Bootstrap first Developer
- (Optional) deploy Edge Functions
