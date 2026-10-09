import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/state/AuthContext';
import { useRouter } from '@/state/RouterContext';
import { useToast } from '@/state/ToastContext';
import {
  getUser,
  listAuditLogs,
  setUserRole,
  type AdminUserListItem,
} from '@/services/adminUsersService';
import { avatarPublicUrl } from '@/services/profileService';
import { supabase } from '@/lib/supabase';
import type { AppRole, AuditLogRow, CrosswordStatsRow, WordleStatsRow } from '@/types/database';

interface Props {
  id: string;
}

type Tab = 'profile' | 'wordle' | 'crossword' | 'activity' | 'audit' | 'role';

export function AdminUserDetailPage({ id }: Props) {
  const { hasPermission } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('profile');
  const [user, setUser] = useState<AdminUserListItem | null>(null);
  const [wordle, setWordle] = useState<WordleStatsRow | null>(null);
  const [crossword, setCrossword] = useState<CrosswordStatsRow | null>(null);
  const [activity, setActivity] = useState<unknown[]>([]);
  const [audit, setAudit] = useState<AuditLogRow[]>([]);
  const [roleDraft, setRoleDraft] = useState<AppRole>('user');

  useEffect(() => {
    getUser(id).then((u) => {
      setUser(u);
      if (u?.role_key) setRoleDraft(u.role_key);
    });
  }, [id]);

  useEffect(() => {
    if (tab === 'wordle' && hasPermission('users.activity.view')) {
      supabase.from('wordle_stats').select('*').eq('user_id', id).maybeSingle().then(({ data }) => setWordle(data as WordleStatsRow | null));
    }
    if (tab === 'crossword' && hasPermission('users.activity.view')) {
      supabase.from('crossword_stats').select('*').eq('user_id', id).maybeSingle().then(({ data }) => setCrossword(data as CrosswordStatsRow | null));
    }
    if (tab === 'activity' && hasPermission('users.activity.view')) {
      supabase
        .from('gameplay_activity')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data }) => setActivity(data ?? []));
    }
    if (tab === 'audit' && hasPermission('audit.view')) {
      listAuditLogs({ page: 0, pageSize: 50 }).then((res) => {
        setAudit(res.rows.filter((r) => r.target_id === id || r.actor_id === id));
      });
    }
  }, [tab, id, hasPermission]);

  async function saveRole() {
    try {
      await setUserRole(id, roleDraft);
      const refreshed = await getUser(id);
      setUser(refreshed);
      toast('Role updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Role change failed', 'error');
    }
  }

  if (!hasPermission('users.view')) {
    return (
      <AdminLayout current="Users">
        <p className="text-proddaily-text-2">Access denied.</p>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout current="Users">
        <p className="text-proddaily-text-2">Loading…</p>
      </AdminLayout>
    );
  }

  const avatar = avatarPublicUrl(user.custom_avatar_path, user.discord_avatar_url);
  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'profile', label: 'Profile', show: true },
    { key: 'wordle', label: 'Wordle', show: hasPermission('users.activity.view') },
    { key: 'crossword', label: 'Crossword', show: hasPermission('users.activity.view') },
    { key: 'activity', label: 'Activity', show: hasPermission('users.activity.view') },
    { key: 'audit', label: 'Audit', show: hasPermission('audit.view') },
    { key: 'role', label: 'Role', show: hasPermission('users.roles.manage') },
  ];

  return (
    <AdminLayout current="Users">
      <button className="text-sm text-proddaily-text-2 mb-4" onClick={() => navigate({ page: 'admin-users' })}>
        ← Back to users
      </button>
      <div className="flex items-center gap-3 mb-6">
        {avatar && <img src={avatar} alt="" className="w-12 h-12 rounded-street object-cover" />}
        <div>
          <h1 className="font-serif text-2xl text-proddaily-text">
            {user.nickname || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.discord_username}
          </h1>
          <p className="text-sm text-proddaily-text-2 capitalize">{user.role_label}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-proddaily-border pb-2">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? 'pd-accent-text border-b-2 pd-accent-border px-2 py-1 text-sm font-serif'
                : 'text-proddaily-text-2 px-2 py-1 text-sm font-serif'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="text-sm space-y-2 text-proddaily-text-2">
          {hasPermission('users.private.view') ? (
            <>
              <p>Name: {user.first_name} {user.last_name}</p>
              <p>State ID: {user.state_id ?? '—'}</p>
              <p>Discord: {user.discord_username ?? '—'} ({user.discord_id ?? '—'})</p>
            </>
          ) : (
            <p>Nickname: {user.nickname ?? '—'}</p>
          )}
          <p>Profile: {user.profile_setup_complete ? 'Complete' : 'Incomplete'}</p>
          <p>Created: {user.created_at}</p>
          <p>Last activity: {user.last_activity_at ?? '—'}</p>
        </div>
      )}

      {tab === 'wordle' && wordle && (
        <ul className="text-sm text-proddaily-text-2 space-y-1">
          <li>Played: {wordle.games_played}</li>
          <li>Won: {wordle.games_won}</li>
          <li>Lost: {wordle.games_lost}</li>
          <li>Current streak: {wordle.current_streak}</li>
          <li>Longest streak: {wordle.longest_streak}</li>
          <li>Distribution: {wordle.guess_distribution?.join(', ')}</li>
        </ul>
      )}

      {tab === 'crossword' && crossword && (
        <ul className="text-sm text-proddaily-text-2 space-y-1">
          <li>Started: {crossword.started}</li>
          <li>Completed: {crossword.completed}</li>
          <li>Clean: {crossword.clean_completions}</li>
          <li>Assisted: {crossword.assisted_completions}</li>
          <li>Fastest: {crossword.fastest_seconds ?? '—'}s</li>
        </ul>
      )}

      {tab === 'activity' && (
        <ul className="text-sm space-y-2">
          {activity.map((a) => {
            const row = a as { id: string; event_type: string; created_at: string };
            return (
              <li key={row.id} className="text-proddaily-text-2">
                {row.created_at.slice(0, 19)} — {row.event_type}
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'audit' && (
        <ul className="text-sm space-y-2">
          {audit.map((a) => (
            <li key={a.id} className="text-proddaily-text-2 border-b border-proddaily-border pb-2">
              {a.created_at.slice(0, 19)} — {a.action} ({a.result})
            </li>
          ))}
        </ul>
      )}

      {tab === 'role' && (
        <div className="space-y-3 max-w-sm">
          <select
            value={roleDraft}
            onChange={(e) => setRoleDraft(e.target.value as AppRole)}
            className="w-full bg-proddaily-bg-2 border border-proddaily-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="user">User</option>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="developer">Developer</option>
          </select>
          <Button onClick={saveRole}>Save role</Button>
        </div>
      )}
    </AdminLayout>
  );
}
