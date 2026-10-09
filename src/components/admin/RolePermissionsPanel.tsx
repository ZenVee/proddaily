import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/state/ToastContext';
import {
  EDITABLE_ROLE_KEYS,
  groupPermissionsByCategory,
  listPermissions,
  listRolePermissionLinks,
  listRoles,
  setRolePermissionIds,
} from '@/services/rolePermissionsService';
import type { AppRole, PermissionRow, RoleRow } from '@/types/database';
import { cn } from '@/utils/helpers';

export function RolePermissionsPanel() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<AppRole>('manager');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [baselineIds, setBaselineIds] = useState<Set<string>>(new Set());
  const [linksByRole, setLinksByRole] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const editableRoles = useMemo(
    () => roles.filter((r) => EDITABLE_ROLE_KEYS.includes(r.key)),
    [roles],
  );

  const selectedRole = editableRoles.find((r) => r.key === selectedKey) ?? editableRoles[0];
  const grouped = useMemo(() => groupPermissionsByCategory(permissions), [permissions]);
  const dirty =
    selectedIds.size !== baselineIds.size ||
    [...selectedIds].some((id) => !baselineIds.has(id));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listRoles(), listPermissions(), listRolePermissionLinks()])
      .then(([roleRows, permRows, links]) => {
        if (cancelled) return;
        setRoles(roleRows);
        setPermissions(permRows);
        const map: Record<string, Set<string>> = {};
        for (const role of roleRows) map[role.id] = new Set();
        for (const link of links) {
          (map[link.role_id] ??= new Set()).add(link.permission_id);
        }
        setLinksByRole(map);
        const manager = roleRows.find((r) => r.key === 'manager');
        const initial = manager ?? roleRows.find((r) => EDITABLE_ROLE_KEYS.includes(r.key));
        if (initial) {
          setSelectedKey(initial.key);
          const ids = map[initial.id] ?? new Set();
          setSelectedIds(new Set(ids));
          setBaselineIds(new Set(ids));
        }
      })
      .catch((err) => {
        console.error(err);
        toast(err instanceof Error ? err.message : 'Failed to load permissions', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  function selectRole(role: RoleRow) {
    if (dirty && !window.confirm('Discard unsaved permission changes?')) return;
    setSelectedKey(role.key);
    const ids = linksByRole[role.id] ?? new Set();
    setSelectedIds(new Set(ids));
    setBaselineIds(new Set(ids));
  }

  function toggle(permissionId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  }

  function toggleCategory(categoryPerms: PermissionRow[], on: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of categoryPerms) {
        if (on) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }

  async function save() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const ids = [...selectedIds];
      await setRolePermissionIds(selectedRole.id, ids);
      setLinksByRole((prev) => ({ ...prev, [selectedRole.id]: new Set(ids) }));
      setBaselineIds(new Set(ids));
      toast('Role permissions saved. Affected staff should refresh.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-proddaily-text-2">Loading permissions…</p>;
  }

  if (!selectedRole) {
    return <p className="text-proddaily-text-2">No editable roles found.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl text-proddaily-text mb-1">Role permissions</h2>
        <p className="text-sm text-proddaily-text-2">
          Assign dashboard permissions to Manager and Staff. Developers always have full access.
          Users cannot access the staff dashboard.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {editableRoles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => selectRole(role)}
            className={cn(
              'px-3 py-1.5 text-sm font-serif border rounded-street transition-colors',
              selectedRole.id === role.id
                ? 'pd-accent-border pd-accent-text bg-proddaily-card'
                : 'border-proddaily-border text-proddaily-text-2 hover:text-proddaily-text',
            )}
          >
            {role.label}
          </button>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-sm text-proddaily-text-2 mb-4">{selectedRole.description}</p>

        <div className="space-y-6">
          {Object.entries(grouped).map(([category, perms]) => {
            const allOn = perms.every((p) => selectedIds.has(p.id));
            const someOn = perms.some((p) => selectedIds.has(p.id));
            return (
              <div key={category}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif text-sm uppercase tracking-wide text-proddaily-text capitalize">
                    {category}
                  </h3>
                  <button
                    type="button"
                    className="text-xs text-proddaily-text-2 hover:pd-accent-text"
                    onClick={() => toggleCategory(perms, !allOn)}
                  >
                    {allOn ? 'Clear' : someOn ? 'Select all' : 'Select all'}
                  </button>
                </div>
                <ul className="space-y-2">
                  {perms.map((p) => (
                    <li key={p.id}>
                      <label className="flex items-start gap-3 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggle(p.id)}
                          className="mt-0.5 accent-[var(--pd-accent)]"
                        />
                        <span>
                          <span className="text-proddaily-text font-mono text-xs">{p.key}</span>
                          <span className="block text-proddaily-text-2">{p.description}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-proddaily-border">
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save permissions'}
          </Button>
          {dirty && <span className="text-xs text-proddaily-text-2">Unsaved changes</span>}
        </div>
      </Card>
    </div>
  );
}
