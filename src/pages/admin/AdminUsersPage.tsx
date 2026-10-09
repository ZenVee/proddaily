import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRouter } from '@/state/RouterContext';
import { useAuth } from '@/state/AuthContext';
import { listUsers, type AdminUserListItem } from '@/services/adminUsersService';
import { avatarPublicUrl } from '@/services/profileService';
import type { AppRole } from '@/types/database';

export function AdminUsersPage() {
  const { navigate } = useRouter();
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<AppRole | 'all'>('all');
  const [profileStatus, setProfileStatus] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasPermission('users.view')) return;
    setLoading(true);
    listUsers({ search, role, profileStatus, page, pageSize: 20 })
      .then((res) => {
        setRows(res.rows);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, role, profileStatus, page, hasPermission]);

  if (!hasPermission('users.view')) {
    return (
      <AdminLayout current="Users">
        <p className="text-proddaily-text-2">Access denied.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout current="Users">
      <h1 className="font-serif text-3xl text-proddaily-text mb-1">Users</h1>
      <p className="text-sm text-proddaily-text-2 mb-6">Manage accounts, roles, and profile status.</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <Input
          placeholder="Search name, nickname, State ID, Discord…"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
          className="min-w-[240px] flex-1"
        />
        <select
          value={role}
          onChange={(e) => {
            setPage(0);
            setRole(e.target.value as AppRole | 'all');
          }}
          className="bg-proddaily-bg-2 border border-proddaily-border rounded-lg px-3 text-sm"
        >
          <option value="all">All roles</option>
          <option value="developer">Developer</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
          <option value="user">User</option>
        </select>
        <select
          value={profileStatus}
          onChange={(e) => {
            setPage(0);
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
                          {hasPermission('users.private.view') && (
                            <div className="text-xs text-proddaily-text-2">
                              {u.state_id ?? '—'} · {u.discord_username ?? '—'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 capitalize">{u.role_label ?? u.role_key}</td>
                    <td className="p-3">{u.profile_setup_complete ? 'Complete' : 'Incomplete'}</td>
                    <td className="p-3 text-proddaily-text-2">{u.created_at.slice(0, 10)}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => navigate({ page: 'admin-user', id: u.id })}>
                        Open
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-proddaily-text-2">{total} users</p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <Button size="sm" variant="ghost" disabled={(page + 1) * 20 >= total} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
