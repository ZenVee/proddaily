import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { RolePermissionsPanel } from '@/components/admin/RolePermissionsPanel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRouter } from '@/state/RouterContext';
import { useAuth } from '@/state/AuthContext';
import { listUsers, type AdminUserListItem } from '@/services/adminUsersService';
import { avatarPublicUrl } from '@/services/profileService';
import { cn, formatLocalDate } from '@/utils/helpers';

type UsersTab = 'list' | 'permissions';

function UserTable({
  rows,
  canViewPrivate,
  onOpen,
}: {
  rows: AdminUserListItem[];
  canViewPrivate: boolean;
  onOpen: (id: string) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-proddaily-text-2 py-4">No users found.</p>;
  }

  return (
    <div className="overflow-x-auto border border-proddaily-border rounded-street">
      <table className="w-full text-sm">
        <thead className="bg-proddaily-bg-2 text-left text-proddaily-text-2">
          <tr>
            <th className="p-3">User</th>
            <th className="p-3">Role</th>
            <th className="p-3">Status</th>
            <th className="p-3">Created</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => {
            const avatar = avatarPublicUrl(u.custom_avatar_path, u.discord_avatar_url);
            const display =
              u.nickname ||
              [u.first_name, u.last_name].filter(Boolean).join(' ') ||
              u.discord_username ||
              'Player';
            return (
              <tr key={u.id} className="border-t border-proddaily-border">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {avatar && <img src={avatar} alt="" className="w-8 h-8 rounded-street object-cover" />}
                    <div>
                      <div className="text-proddaily-text">{display}</div>
                      {canViewPrivate && (
                        <div className="text-xs text-proddaily-text-2">
                          {u.state_id ?? '—'} · {u.discord_username ?? '—'}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3 capitalize">{u.role_label ?? u.role_key}</td>
                <td className="p-3">{u.profile_setup_complete ? 'Complete' : 'Incomplete'}</td>
                <td className="p-3 text-proddaily-text-2">{formatLocalDate(u.created_at)}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="secondary" onClick={() => onOpen(u.id)}>
                    Open
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AdminUsersPage() {
  const { navigate } = useRouter();
  const { hasPermission, role } = useAuth();
  const isDeveloper = role === 'developer';
  const [tab, setTab] = useState<UsersTab>('list');
  const [staffRows, setStaffRows] = useState<AdminUserListItem[]>([]);
  const [staffTotal, setStaffTotal] = useState(0);
  const [playerRows, setPlayerRows] = useState<AdminUserListItem[]>([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [profileStatus, setProfileStatus] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [staffPage, setStaffPage] = useState(0);
  const [playerPage, setPlayerPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasPermission('users.view')) return;
    if (tab !== 'list') return;
    setLoading(true);
    const filters = { search, profileStatus, pageSize: 20 as const };
    Promise.all([
      listUsers({ ...filters, roleGroup: 'staff', page: staffPage }),
      listUsers({ ...filters, roleGroup: 'players', page: playerPage }),
    ])
      .then(([staff, players]) => {
        setStaffRows(staff.rows);
        setStaffTotal(staff.total);
        setPlayerRows(players.rows);
        setPlayerTotal(players.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, profileStatus, staffPage, playerPage, hasPermission, tab]);

  if (!hasPermission('users.view')) {
    return (
      <AdminLayout current="Users">
        <p className="text-proddaily-text-2">Access denied.</p>
      </AdminLayout>
    );
  }

  const showPermissions = isDeveloper && tab === 'permissions';
  const canViewPrivate = hasPermission('users.private.view');

  return (
    <AdminLayout current="Users">
      <h1 className="font-serif text-3xl text-proddaily-text mb-1">Users</h1>
      <p className="text-sm text-proddaily-text-2 mb-6">Manage accounts, roles, and profile status.</p>

      {isDeveloper && (
        <div className="flex flex-wrap gap-2 mb-6 border-b border-proddaily-border pb-2">
          <button
            type="button"
            onClick={() => setTab('list')}
            className={cn(
              'px-2 py-1 text-sm font-serif',
              tab === 'list'
                ? 'pd-accent-text border-b-2 pd-accent-border'
                : 'text-proddaily-text-2',
            )}
          >
            Directory
          </button>
          <button
            type="button"
            onClick={() => setTab('permissions')}
            className={cn(
              'px-2 py-1 text-sm font-serif',
              tab === 'permissions'
                ? 'pd-accent-text border-b-2 pd-accent-border'
                : 'text-proddaily-text-2',
            )}
          >
            Role permissions
          </button>
        </div>
      )}

      {showPermissions ? (
        <RolePermissionsPanel />
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-8">
            <Input
              placeholder="Search name, nickname, State ID, Discord…"
              value={search}
              onChange={(e) => {
                setStaffPage(0);
                setPlayerPage(0);
                setSearch(e.target.value);
              }}
              className="min-w-[240px] flex-1"
            />
            <select
              value={profileStatus}
              onChange={(e) => {
                setStaffPage(0);
                setPlayerPage(0);
                setProfileStatus(e.target.value as 'all' | 'complete' | 'incomplete');
              }}
              className="bg-proddaily-bg-2 border border-proddaily-border rounded-lg px-3 text-sm"
            >
              <option value="all">All profiles</option>
              <option value="complete">Complete</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </div>

          {loading ? (
            <p className="text-proddaily-text-2">Loading…</p>
          ) : (
            <div className="space-y-10">
              <section>
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <h2 className="font-serif text-xl text-proddaily-text">Staff</h2>
                  <p className="text-xs text-proddaily-text-2">{staffTotal} accounts</p>
                </div>
                <UserTable
                  rows={staffRows}
                  canViewPrivate={canViewPrivate}
                  onOpen={(id) => navigate({ page: 'admin-user', id })}
                />
                <div className="flex justify-end gap-2 mt-3">
                  <Button size="sm" variant="ghost" disabled={staffPage === 0} onClick={() => setStaffPage((p) => p - 1)}>
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={(staffPage + 1) * 20 >= staffTotal}
                    onClick={() => setStaffPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </section>

              <section>
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <h2 className="font-serif text-xl text-proddaily-text">Players</h2>
                  <p className="text-xs text-proddaily-text-2">{playerTotal} accounts</p>
                </div>
                <UserTable
                  rows={playerRows}
                  canViewPrivate={canViewPrivate}
                  onOpen={(id) => navigate({ page: 'admin-user', id })}
                />
                <div className="flex justify-end gap-2 mt-3">
                  <Button size="sm" variant="ghost" disabled={playerPage === 0} onClick={() => setPlayerPage((p) => p - 1)}>
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={(playerPage + 1) * 20 >= playerTotal}
                    onClick={() => setPlayerPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
