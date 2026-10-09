import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/state/RouterContext';
import { useAuth } from '@/state/AuthContext';

export function AuthCallbackPage() {
  const { navigate } = useRouter();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const { error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (!cancelled) setError(sessionError.message);
        return;
      }

      const profile = await refreshProfile();
      if (cancelled) return;

      if (profile && !profile.profile_setup_complete) {
        navigate({ page: 'profile-setup' }, true);
      } else {
        navigate({ page: 'home' }, true);
      }
    }

    finish().catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Sign-in failed');
    });

    return () => {
      cancelled = true;
    };
  }, [navigate, refreshProfile]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-proddaily-bg text-proddaily-text">
      <div className="text-center space-y-3 p-8">
        <p className="font-serif text-xl tracking-widest">
          {error ? 'Sign-in error' : 'Completing sign-in…'}
        </p>
        {error && <p className="text-sm text-proddaily-text-2">{error}</p>}
        {error && (
          <button
            className="text-sm pd-accent-text underline"
            onClick={() => navigate({ page: 'login' })}
          >
            Back to login
          </button>
        )}
      </div>
    </div>
  );
}
