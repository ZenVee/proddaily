# Prod Daily

Daily Wordle, custom crosswords, profiles, and a staff dashboard — React frontend with Supabase backend.

## Quick start

```bash
cp .env.example .env
# Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev
```

Without Supabase env vars, some localStorage demo paths still work; Discord auth and secure gameplay require a real project.

## Backend docs

See [docs/BACKEND.md](docs/BACKEND.md) for Discord OAuth, migrations (`master_schema.sql`, `supabase/migrations/`), Developer bootstrap, RLS, storage, and Edge Functions.

Test checklist: [docs/TESTING.md](docs/TESTING.md).
