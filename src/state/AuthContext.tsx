import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AppRole, ProfileRow } from '@/types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  role: AppRole | null;
  permissions: string[];
  loading: boolean;
  configured: boolean;
  isStaff: boolean;
  hasPermission: (key: string) => boolean;
  signInWithDiscord: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<ProfileRow | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfileBundle(userId: string): Promise<{
  profile: ProfileRow | null;
  role: AppRole | null;
  permissions: string[];
}> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    return { profile: null, role: null, permissions: [] };
  }

  const typed = profile as ProfileRow;

  const { data: roleRow } = await supabase
    .from('roles')
    .select('key')
    .eq('id', typed.role_id)
    .maybeSingle();

  const role = (roleRow?.key as AppRole | undefined) ?? null;

  if (role === 'developer') {
    const { data: allPerms } = await supabase.from('permissions').select('key');
    return {
      profile: typed,
      role,
      permissions: (allPerms ?? []).map((p) => p.key as string),
    };
  }

  const { data: links } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', typed.role_id);

  const ids = (links ?? []).map((l) => l.permission_id as string);
  if (ids.length === 0) {
    return { profile: typed, role, permissions: [] };
  }

  const { data: perms } = await supabase.from('permissions').select('key').in('id', ids);

  return {
    profile: typed,
    role,
    permissions: (perms ?? []).map((p) => p.key as string),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const applyBundle = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setRole(null);
      setPermissions([]);
      return;
    }
    const bundle = await loadProfileBundle(uid);
    setProfile(bundle.profile);
    setRole(bundle.role);
    setPermissions(bundle.permissions);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return null;
    const bundle = await loadProfileBundle(user.id);
    setProfile(bundle.profile);
    setRole(bundle.role);
    setPermissions(bundle.permissions);
    return bundle.profile;
  }, [user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      applyBundle(data.session?.user?.id).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(true);
      applyBundle(next?.user?.id).finally(() => setLoading(false));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [applyBundle]);

  async function signInWithDiscord(redirectTo?: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env');
    }
    const redirect = redirectTo ?? `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: redirect },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
    setPermissions([]);
  }

  const isStaff = role === 'developer' || role === 'manager' || role === 'staff';

  function hasPermission(key: string) {
    if (role === 'developer') return true;
    return permissions.includes(key);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        permissions,
        loading,
        configured: isSupabaseConfigured,
        isStaff,
        hasPermission,
        signInWithDiscord,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
