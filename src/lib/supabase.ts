import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && publishableKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[proddaily] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Auth and API calls will fail until .env is configured.'
  );
}

export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  publishableKey ?? 'placeholder-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
);
