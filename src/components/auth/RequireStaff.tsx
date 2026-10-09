import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuth } from '@/state/AuthContext';
import { useRouter } from '@/state/RouterContext';

export function RequireStaff({ children }: { children: ReactNode }) {
  const { user, loading, isStaff, profile } = useAuth();
  const { navigate } = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ page: 'login' }, true);
      return;
    }
    if (profile && !profile.profile_setup_complete) {
      navigate({ page: 'profile-setup' }, true);
      return;
    }
    if (!isStaff) {
      navigate({ page: 'login' }, true);
    }
  }, [user, loading, isStaff, profile, navigate]);

  if (loading || !user || !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center admin-shell text-proddaily-text-2">
        Checking access…
      </div>
    );
  }

  return <>{children}</>;
}
