import { supabase } from '@/lib/supabase';
import type { AppRole, AuditLogRow, ProfileRow } from '@/types/database';

export interface AdminUserListItem extends ProfileRow {
  role_key?: AppRole;
  role_label?: string;
}

export type UserRoleGroup = 'staff' | 'players';

const STAFF_ROLE_KEYS: AppRole[] = ['developer', 'manager', 'staff'];

export async function listUsers(params: {
  search?: string;
  role?: AppRole | 'all';
  roleGroup?: UserRoleGroup;
  profileStatus?: 'all' | 'complete' | 'incomplete';
  sort?: 'created' | 'activity';
  page?: number;
  pageSize?: number;
}): Promise<{ rows: AdminUserListItem[]; total: number }> {
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 20;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const useRoleJoin = Boolean(params.roleGroup) || (params.role && params.role !== 'all');

  let query = supabase
    .from('profiles')
    .select(useRoleJoin ? '*, roles!inner(key, label)' : '*, roles(key, label)', { count: 'exact' });

  if (params.roleGroup === 'staff') {
    query = query.in('roles.key', STAFF_ROLE_KEYS);
  } else if (params.roleGroup === 'players') {
    query = query.eq('roles.key', 'user');
  } else if (params.role && params.role !== 'all') {
    query = query.eq('roles.key', params.role);
  }

  if (params.search?.trim()) {
    const q = `%${params.search.trim()}%`;
    query = query.or(
      `first_name.ilike.${q},last_name.ilike.${q},nickname.ilike.${q},state_id.ilike.${q},discord_username.ilike.${q}`
    );
  }

  if (params.profileStatus === 'complete') {
    query = query.eq('profile_setup_complete', true);
  } else if (params.profileStatus === 'incomplete') {
    query = query.eq('profile_setup_complete', false);
  }

  if (params.sort === 'activity') {
    query = query.order('last_activity_at', { ascending: false, nullsFirst: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const rows = (data ?? []).map((row) => {
    const roles = row.roles as { key: AppRole; label: string } | { key: AppRole; label: string }[] | null;
    const roleObj = Array.isArray(roles) ? roles[0] : roles;
    const { roles: _r, ...rest } = row as ProfileRow & { roles: unknown };
    return {
      ...rest,
      role_key: roleObj?.key,
      role_label: roleObj?.label,
    } as AdminUserListItem;
  });

  return { rows, total: count ?? rows.length };
}

export async function getUser(userId: string): Promise<AdminUserListItem | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, roles(key, label)')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const roles = data.roles as { key: AppRole; label: string } | { key: AppRole; label: string }[] | null;
  const roleObj = Array.isArray(roles) ? roles[0] : roles;
  const { roles: _r, ...rest } = data as ProfileRow & { roles: unknown };
  return { ...rest, role_key: roleObj?.key, role_label: roleObj?.label };
}

export async function setUserRole(userId: string, role: AppRole): Promise<ProfileRow> {
  const { data, error } = await supabase.rpc('admin_set_user_role', {
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;
  return data as ProfileRow;
}

export async function listAuditLogs(params: {
  search?: string;
  category?: string;
  actorId?: string;
  action?: string;
  result?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: AuditLogRow[]; total: number }> {
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 25;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from('audit_logs').select('*', { count: 'exact' });

  if (params.category) query = query.eq('category', params.category);
  if (params.actorId) query = query.eq('actor_id', params.actorId);
  if (params.action) query = query.eq('action', params.action);
  if (params.result) query = query.eq('result', params.result);
  if (params.from) query = query.gte('created_at', params.from);
  if (params.to) query = query.lte('created_at', params.to);
  if (params.search?.trim()) {
    const q = `%${params.search.trim()}%`;
    query = query.or(`action.ilike.${q},category.ilike.${q},target_type.ilike.${q}`);
  }

  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as AuditLogRow[], total: count ?? 0 };
}

export function auditLogsToCsv(rows: AuditLogRow[]): string {
  const header = ['id', 'created_at', 'actor_id', 'action', 'category', 'result', 'target_type', 'target_id'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [r.id, r.created_at, r.actor_id ?? '', r.action, r.category, r.result, r.target_type ?? '', r.target_id ?? '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
  }
  return lines.join('\n');
}
