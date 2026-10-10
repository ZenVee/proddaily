import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/state/AuthContext';
import { useRouter } from '@/state/RouterContext';
import { useToast } from '@/state/ToastContext';
import {
  getUser,
  listAuditLogs,
  listUserGameHistory,
  resetUserStats,
  setUserRole,
  type AdminUserListItem,
  type StatsResetScope,
  type UserCrosswordHistoryRow,
  type UserGameHistory,
} from '@/services/adminUsersService';
import { avatarPublicUrl } from '@/services/profileService';
import { supabase } from '@/lib/supabase';
import type { AppRole, AuditLogRow, CrosswordStatsRow, WordleStatsRow } from '@/types/database';
import { formatLocalDate, formatLocalDateTime } from '@/utils/helpers';

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
  const [history, setHistory] = useState<UserGameHistory>({ wordle: [], crossword: [] });
  const [activity, setActivity] = useState<unknown[]>([]);
  const [audit, setAudit] = useState<AuditLogRow[]>([]);
  const [roleDraft, setRoleDraft] = useState<AppRole>('user');
  const [wordleDate, setWordleDate] = useState('');
  const [wordleWord, setWordleWord] = useState('');
  const [resetting, setResetting] = useState(false);

  const canEdit = hasPermission('users.edit');
  const canViewActivity = hasPermission('users.activity.view');

  const reloadStats = useCallback(async () => {
    if (!canViewActivity) return;
    const [{ data: w }, { data: c }, hist] = await Promise.all([
      supabase.from('wordle_stats').select('*').eq('user_id', id).maybeSingle(),
      supabase.from('crossword_stats').select('*').eq('user_id', id).maybeSingle(),
      listUserGameHistory(id),
    ]);
    setWordle(w as WordleStatsRow | null);
    setCrossword(c as CrosswordStatsRow | null);
    setHistory(hist);
  }, [canViewActivity, id]);

  useEffect(() => {
    getUser(id).then((u) => {
      setUser(u);
      if (u?.role_key) setRoleDraft(u.role_key);
    });
  }, [id]);

  useEffect(() => {
    if (tab === 'wordle' || tab === 'crossword' || tab === 'profile') {
      void reloadStats();
    }
    if (tab === 'activity' && canViewActivity) {
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
  }, [tab, id, hasPermission, canViewActivity, reloadStats]);

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

  async function runReset(
    scope: StatsResetScope,
    confirmMessage: string,
    extra?: { puzzleDate?: string; word?: string; puzzleId?: string },
  ) {
    if (!canEdit) return;
    if (!window.confirm(confirmMessage)) return;
    setResetting(true);
    try {
      const result = await resetUserStats({
        userId: id,
        scope,
        puzzleDate: extra?.puzzleDate,
        word: extra?.word,
        puzzleId: extra?.puzzleId,
      });
      await reloadStats();
      toast(
        `Reset complete (${result.deleted_attempts} wordle, ${result.deleted_progress} crossword, ${result.deleted_activity} activity)`,
        'success',
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Reset failed', 'error');
    } finally {
      setResetting(false);
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
    { key: 'wordle', label: 'Wordle', show: canViewActivity },
    { key: 'crossword', label: 'Crossword', show: canViewActivity },
    { key: 'activity', label: 'Activity', show: canViewActivity },
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
        <div className="space-y-6">
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
            <p>Created: {formatLocalDate(user.created_at)}</p>
            <p>Last activity: {formatLocalDateTime(user.last_activity_at)}</p>
          </div>

          {canEdit && (
            <Card className="p-5 max-w-lg">
              <h2 className="font-serif text-lg text-proddaily-text mb-2">Reset all stats</h2>
              <p className="text-sm text-proddaily-text-2 mb-4">
                Clears every Wordle attempt, crossword progress, gameplay activity, and recalculates aggregates.
              </p>
              <Button
                variant="danger"
                disabled={resetting}
                onClick={() =>
                  runReset('all', 'Reset ALL Wordle and Crossword stats for this user? This cannot be undone.')
                }
              >
                Reset all game stats
              </Button>
            </Card>
          )}
        </div>
      )}

      {tab === 'wordle' && (
        <div className="space-y-6">
          {wordle ? (
            <ul className="text-sm text-proddaily-text-2 space-y-1">
              <li>Played: {wordle.games_played}</li>
              <li>Won: {wordle.games_won}</li>
              <li>Lost: {wordle.games_lost}</li>
              <li>Current streak: {wordle.current_streak}</li>
              <li>Longest streak: {wordle.longest_streak}</li>
              <li>Distribution: {wordle.guess_distribution?.join(', ')}</li>
            </ul>
          ) : (
            <p className="text-sm text-proddaily-text-2">No Wordle stats yet.</p>
          )}

          <HistoryTable
            title="Attempts"
            empty="No Wordle attempts."
            rows={history.wordle.map((row) => (
              <tr key={row.attempt_id} className="border-t border-proddaily-border">
                <td className="p-3">{row.puzzle_date}</td>
                <td className="p-3 font-mono uppercase">{row.answer}</td>
                <td className="p-3 capitalize">{row.status.replace('_', ' ')}</td>
                <td className="p-3">{row.guess_count}</td>
                <td className="p-3 text-right">
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={resetting}
                      onClick={() =>
                        runReset(
                          'wordle_day',
                          `Reset Wordle for ${row.puzzle_date} (${row.answer})?`,
                          { puzzleDate: row.puzzle_date },
                        )
                      }
                    >
                      Reset day
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            headers={['Date', 'Word', 'Status', 'Guesses', '']}
          />

          {canEdit && (
            <Card className="p-5 space-y-4 max-w-xl">
              <h2 className="font-serif text-lg text-proddaily-text">Reset Wordle</h2>
              <div className="flex flex-wrap gap-3 items-end">
                <Input
                  label="By day"
                  type="date"
                  value={wordleDate}
                  onChange={(e) => setWordleDate(e.target.value)}
                  className="max-w-[180px]"
                />
                <Button
                  variant="secondary"
                  disabled={resetting || !wordleDate}
                  onClick={() =>
                    runReset('wordle_day', `Reset Wordle attempt for ${wordleDate}?`, {
                      puzzleDate: wordleDate,
                    })
                  }
                >
                  Reset day
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 items-end">
                <Input
                  label="By word"
                  value={wordleWord}
                  onChange={(e) => setWordleWord(e.target.value.toUpperCase())}
                  maxLength={5}
                  placeholder="CRANE"
                  className="max-w-[140px] font-mono uppercase"
                />
                <Button
                  variant="secondary"
                  disabled={resetting || wordleWord.trim().length !== 5}
                  onClick={() =>
                    runReset('wordle_word', `Reset Wordle attempts for word ${wordleWord.toUpperCase()}?`, {
                      word: wordleWord,
                    })
                  }
                >
                  Reset word
                </Button>
              </div>
              <Button
                variant="danger"
                disabled={resetting}
                onClick={() => runReset('wordle_all', 'Reset ALL Wordle stats for this user?')}
              >
                Reset all Wordle
              </Button>
            </Card>
          )}
        </div>
      )}

      {tab === 'crossword' && (
        <div className="space-y-6">
          {crossword ? (
            <ul className="text-sm text-proddaily-text-2 space-y-1">
              <li>Started: {crossword.started}</li>
              <li>Completed: {crossword.completed}</li>
              <li>Clean: {crossword.clean_completions}</li>
              <li>Assisted: {crossword.assisted_completions}</li>
              <li>Fastest: {crossword.fastest_seconds ?? '—'}s</li>
            </ul>
          ) : (
            <p className="text-sm text-proddaily-text-2">No crossword stats yet.</p>
          )}

          <HistoryTable
            title="Puzzles"
            empty="No crossword progress."
            headers={['Title', 'Status', 'Time', '']}
            rows={history.crossword.map((row: UserCrosswordHistoryRow) => (
              <tr key={row.progress_id} className="border-t border-proddaily-border">
                <td className="p-3">{row.title}</td>
                <td className="p-3 capitalize">{row.status.replace('_', ' ')}</td>
                <td className="p-3">{row.active_seconds}s</td>
                <td className="p-3 text-right">
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={resetting}
                      onClick={() =>
                        runReset('crossword_puzzle', `Reset crossword progress for “${row.title}”?`, {
                          puzzleId: row.puzzle_id,
                        })
                      }
                    >
                      Reset puzzle
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          />

          {canEdit && (
            <Card className="p-5 max-w-xl">
              <h2 className="font-serif text-lg text-proddaily-text mb-3">Reset Crossword</h2>
              <Button
                variant="danger"
                disabled={resetting}
                onClick={() => runReset('crossword_all', 'Reset ALL crossword stats for this user?')}
              >
                Reset all Crossword
              </Button>
            </Card>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <ul className="text-sm space-y-2">
          {activity.map((a) => {
            const row = a as { id: string; event_type: string; created_at: string };
            return (
              <li key={row.id} className="text-proddaily-text-2">
                {formatLocalDateTime(row.created_at)} — {row.event_type}
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'audit' && (
        <ul className="text-sm space-y-2">
          {audit.map((a) => (
            <li key={a.id} className="text-proddaily-text-2 border-b border-proddaily-border pb-2">
              {formatLocalDateTime(a.created_at)} — {a.action} ({a.result})
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

function HistoryTable({
  title,
  empty,
  headers,
  rows,
}: {
  title: string;
  empty: string;
  headers: string[];
  rows: ReactNode[];
}) {
  return (
    <div>
      <h2 className="font-serif text-lg text-proddaily-text mb-2">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-proddaily-text-2">{empty}</p>
      ) : (
        <div className="overflow-x-auto border border-proddaily-border rounded-street">
          <table className="w-full text-sm">
            <thead className="bg-proddaily-bg-2 text-left text-proddaily-text-2">
              <tr>
                {headers.map((h) => (
                  <th key={h || 'actions'} className="p-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
