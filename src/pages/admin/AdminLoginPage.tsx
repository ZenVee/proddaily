import { useEffect, useState } from 'react';
import { Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Wordmark } from '@/components/brand/Wordmark';
import { useRouter } from '@/state/RouterContext';
import { useToast } from '@/state/ToastContext';
import { useAuth } from '@/state/AuthContext';

export function AdminLoginPage() {
  const { navigate } = useRouter();
  const { toast } = useToast();
  const { signInWithDiscord, user, profile, isStaff, loading, configured, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) return;
    if (!profile.profile_setup_complete) {
      navigate({ page: 'profile-setup' }, true);
      return;
    }
    if (isStaff) {
      navigate({ page: 'admin-overview' }, true);
      return;
    }
    navigate({ page: 'home' }, true);
  }, [user, profile, isStaff, loading, navigate]);

  async function handleDiscord() {
    setBusy(true);
    try {
      await signInWithDiscord(`${window.location.origin}/auth/callback`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Discord sign-in failed', 'error');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col admin-shell relative overflow-hidden">
      <button
        onClick={() => navigate({ page: 'home' })}
        className="relative z-10 flex items-center gap-2 text-sm text-proddaily-text-2 hover:text-proddaily-text transition-colors p-4"
      >
        <ArrowLeft size={16} /> Back to Site
      </button>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md">
          <div className="street-modal relative border border-proddaily-border rounded-street shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-3">
                <Wordmark size="compact" />
              </div>
              <p className="font-serif text-sm text-proddaily-text-2">Sign in with Discord</p>
            </div>

            <div className="space-y-4">
              <Button onClick={handleDiscord} className="w-full" size="lg" disabled={busy || !configured}>
                {busy ? (
                  <>
                    <div className="w-4 h-4 border-2 border-proddaily-bg border-t-transparent rounded-full animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    <Lock size={18} /> Sign in with Discord
                  </>
                )}
              </Button>

              {user && !isStaff && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-proddaily-text-2">
                    Signed in, but this account does not have staff dashboard access.
                  </p>
                  <Button variant="ghost" onClick={() => signOut()}>
                    Sign out
                  </Button>
                </div>
              )}
            </div>

            {!configured && (
              <div className="mt-6 flex items-start gap-2 p-3 rounded-street bg-yellow-950/20 border border-yellow-900/30">
                <AlertCircle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-500/80">
                  Supabase is not configured. Copy `.env.example` to `.env` and add your project URL and publishable key.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
