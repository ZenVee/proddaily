import { supabase } from '@/lib/supabase';
import type { AppRole, PermissionRow, RolePermissionRow, RoleRow } from '@/types/database';

/** Permissions that must stay developer-only (not assignable via UI). */
export const DEVELOPER_ONLY_PERMISSIONS = new Set(['permissions.manage']);

/** Roles whose permission matrix can be edited. */
export const EDITABLE_ROLE_KEYS: AppRole[] = ['manager', 'staff'];

export async function listRoles(): Promise<RoleRow[]> {
  const { data, error } = await supabase.from('roles').select('*').order('key');
  if (error) throw error;
  return (data ?? []) as RoleRow[];
}

export async function listPermissions(): Promise<PermissionRow[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('category')
    .order('key');
  if (error) throw error;
  return ((data ?? []) as PermissionRow[]).filter((p) => !DEVELOPER_ONLY_PERMISSIONS.has(p.key));
}

export async function listRolePermissionLinks(): Promise<RolePermissionRow[]> {
  const { data, error } = await supabase.from('role_permissions').select('role_id, permission_id');
  if (error) throw error;
  return (data ?? []) as RolePermissionRow[];
}

export async function setRolePermissionIds(roleId: string, permissionIds: string[]): Promise<void> {
  const { error: delError } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
  if (delError) throw delError;

  if (permissionIds.length === 0) return;

  const rows = permissionIds.map((permission_id) => ({ role_id: roleId, permission_id }));
  const { error: insError } = await supabase.from('role_permissions').insert(rows);
  if (insError) throw insError;
}

export function groupPermissionsByCategory(perms: PermissionRow[]): Record<string, PermissionRow[]> {
  const groups: Record<string, PermissionRow[]> = {};
  for (const p of perms) {
    (groups[p.category] ??= []).push(p);
  }
  return groups;
}
