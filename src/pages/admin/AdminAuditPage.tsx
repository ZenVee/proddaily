import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/state/AuthContext';
import { auditLogsToCsv, listAuditLogs } from '@/services/adminUsersService';
import type { AuditLogRow } from '@/types/database';
import { formatLocalDateTime } from '@/utils/helpers';

export function AdminAuditPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [result, setResult] = useState('');
  const [selected, setSelected] = useState<AuditLogRow | null>(null);

  useEffect(() => {
    if (!hasPermission('audit.view')) return;
    listAuditLogs({
      search,
      category: category || undefined,
      result: result || undefined,
      page,
      pageSize: 25,
    }).then((res) => {
      setRows(res.rows);
      setTotal(res.total);
    });
  }, [search, category, result, page, hasPermission]);

  function exportCsv() {
    const csv = auditLogsToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!hasPermission('audit.view')) {
    return (
      <AdminLayout current="Audit">
        <p className="text-proddaily-text-2">Access denied.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout current="Audit">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-proddaily-text mb-1">Audit logs</h1>
          <p className="text-sm text-proddaily-text-2">Append-only administrative history.</p>
        </div>
        {hasPermission('audit.export') && (
          <Button variant="secondary" onClick={exportCsv}>
            Export CSV
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Input placeholder="Search" value={search} onChange={(e) => { setPage(0); setSearch(e.target.value); }} />
        <Input placeholder="Category" value={category} onChange={(e) => { setPage(0); setCategory(e.target.value); }} />
        <select
          value={result}
          onChange={(e) => { setPage(0); setResult(e.target.value); }}
          className="bg-proddaily-bg-2 border border-proddaily-border rounded-lg px-3 text-sm"
        >
          <option value="">All results</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="overflow-x-auto border border-proddaily-border rounded-street">
        <table className="w-full text-sm">
          <thead className="bg-proddaily-bg-2 text-left text-proddaily-text-2">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Action</th>
              <th className="p-3">Category</th>
              <th className="p-3">Result</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-proddaily-border">
                <td className="p-3 text-proddaily-text-2">{formatLocalDateTime(r.created_at)}</td>
                <td className="p-3">{r.action}</td>
                <td className="p-3">{r.category}</td>
                <td className="p-3">{r.result}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                    Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between mt-4">
        <p className="text-xs text-proddaily-text-2">{total} events</p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <Button size="sm" variant="ghost" disabled={(page + 1) * 25 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Audit event">
        {selected && (
          <div className="space-y-3 text-sm">
            <p><span className="text-proddaily-text-2">Action:</span> {selected.action}</p>
            <p><span className="text-proddaily-text-2">Actor:</span> {selected.actor_id ?? '—'}</p>
            <p><span className="text-proddaily-text-2">Target:</span> {selected.target_type} {selected.target_id}</p>
            <div>
              <p className="text-proddaily-text-2 mb-1">Previous</p>
              <pre className="bg-proddaily-bg-2 p-2 rounded text-xs overflow-auto">{JSON.stringify(selected.previous_values, null, 2)}</pre>
            </div>
            <div>
              <p className="text-proddaily-text-2 mb-1">Updated</p>
              <pre className="bg-proddaily-bg-2 p-2 rounded text-xs overflow-auto">{JSON.stringify(selected.updated_values, null, 2)}</pre>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
