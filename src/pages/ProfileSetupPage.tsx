import { useState, type FormEvent } from 'react';
import { PublicPage } from '@/components/layout/PublicPage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/state/AuthContext';
import { useRouter } from '@/state/RouterContext';
import { useToast } from '@/state/ToastContext';
import { completeProfileSetup } from '@/services/profileService';

export function ProfileSetupPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [stateId, setStateId] = useState(profile?.state_id ?? '');
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await completeProfileSetup({ firstName, lastName, stateId, nickname });
      await refreshProfile();
      toast('Profile complete', 'success');
      navigate({ page: 'home' }, true);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save profile', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <PublicPage>
        <div className="max-w-md mx-auto py-20 text-center">
          <p className="text-proddaily-text-2 mb-4">Sign in to finish profile setup.</p>
          <Button onClick={() => navigate({ page: 'login' })}>Sign in</Button>
        </div>
      </PublicPage>
    );
  }

  return (
    <PublicPage>
      <div className="max-w-lg mx-auto py-12 px-4">
        <h1 className="font-serif text-3xl text-proddaily-text mb-2">Complete your profile</h1>
        <p className="text-sm text-proddaily-text-2 mb-8">
          Required before playing and using account features.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 panel-concrete p-6 rounded-street">
          <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          <Input label="State ID" value={stateId} onChange={(e) => setStateId(e.target.value)} required />
          <Input label="Nickname (optional)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving…' : 'Save profile'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </form>
      </div>
    </PublicPage>
  );
}
