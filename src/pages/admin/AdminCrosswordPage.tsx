import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { crosswordService } from '@/services/crosswordService';
import { adminService } from '@/services/adminService';
import { useToast } from '@/state/ToastContext';
import { useRouter } from '@/state/RouterContext';
import { formatDisplayDate, cn } from '@/utils/helpers';
import type { CrosswordPuzzle, CrosswordDifficulty } from '@/types';
import { Plus, Pencil, Eye, Trash2, Upload, Download, Grid3x3, FileEdit } from 'lucide-react';

const difficultyVariant: Record<CrosswordDifficulty, 'green' | 'yellow' | 'red'> = {
  easy: 'green',
  medium: 'yellow',
  hard: 'red',
};

export function AdminCrosswordPage() {
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [puzzles, setPuzzles] = useState<CrosswordPuzzle[]>(() => crosswordService.getAll());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<string | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState<string | null>(null);
  const [previewPuzzle, setPreviewPuzzle] = useState<CrosswordPuzzle | null>(null);

  const sortedPuzzles = useMemo(() =>
    [...puzzles].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
  [puzzles]);

  function handlePublish(id: string) {
    const updated = crosswordService.publish(id);
    setPuzzles(updated);
    const p = updated.find((x) => x.id === id);
    adminService.logActivity('Published crossword', p?.title ?? '');
    toast('Crossword published.', 'success');
    setConfirmPublish(null);
  }

  function handleUnpublish(id: string) {
    const updated = crosswordService.unpublish(id);
    setPuzzles(updated);
    const p = updated.find((x) => x.id === id);
    adminService.logActivity('Unpublished crossword', p?.title ?? '');
    toast('Crossword unpublished.', 'info');
    setConfirmUnpublish(null);
  }

  function handleDelete(id: string) {
    const p = puzzles.find((x) => x.id === id);
    const updated = crosswordService.remove(id);
    setPuzzles(updated);
    adminService.logActivity('Deleted crossword', p?.title ?? '');
    toast('Crossword deleted.', 'info');
    setConfirmDelete(null);
  }

  return (
    <AdminLayout current="Crossword Maker">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-proddaily-text mb-1">Crossword Puzzles</h1>
            <p className="text-sm text-proddaily-text-2">Manage, create, and publish crossword puzzles.</p>
          </div>
          <Button onClick={() => navigate({ page: 'admin-crossword-edit', id: null })}>
            <Plus size={18} /> Create Crossword
          </Button>
        </div>
      </div>

      {sortedPuzzles.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<Grid3x3 size={32} className="text-proddaily-text-2 mb-3" />}
            title="No crosswords yet"
            description="Create your first crossword puzzle to get started."
            action={<Button onClick={() => navigate({ page: 'admin-crossword-edit', id: null })}>
              <Plus size={16} /> Create Crossword
            </Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-proddaily-border">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-proddaily-text-2 font-medium">Title</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-proddaily-text-2 font-medium">Difficulty</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-proddaily-text-2 font-medium hidden sm:table-cell">Published</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-proddaily-text-2 font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wide text-proddaily-text-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-proddaily-border">
                {sortedPuzzles.map((p) => (
                  <tr key={p.id} className="hover:bg-proddaily-bg-2 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-proddaily-text font-medium">{p.title}</p>
                      <p className="text-xs text-proddaily-text-2 line-clamp-1">{p.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={difficultyVariant[p.difficulty]}>{p.difficulty}</Badge>
                    </td>
                    <td className="px-4 py-3 text-proddaily-text-2 text-xs hidden sm:table-cell">
                      {p.publishDate ? formatDisplayDate(p.publishDate) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === 'published' ? 'green' : 'yellow'}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewPuzzle(p)}
                          className="p-1.5 rounded text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card transition-colors"
                          title="Preview"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => navigate({ page: 'admin-crossword-edit', id: p.id })}
                          className="p-1.5 rounded text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        {p.status === 'published' ? (
                          <button
                            onClick={() => setConfirmUnpublish(p.id)}
                            className="p-1.5 rounded text-proddaily-text-2 hover:text-yellow-400 hover:bg-proddaily-card transition-colors"
                            title="Unpublish"
                          >
                            <Download size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmPublish(p.id)}
                            className="p-1.5 rounded text-proddaily-text-2 hover:text-green-400 hover:bg-proddaily-card transition-colors"
                            title="Publish"
                          >
                            <Upload size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(p.id)}
                          className="p-1.5 rounded text-proddaily-text-2 hover:text-red-400 hover:bg-proddaily-card transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Preview modal */}
      {previewPuzzle && (
        <PreviewModal puzzle={previewPuzzle} onClose={() => setPreviewPuzzle(null)} />
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete crossword?"
        message="This will permanently remove the crossword puzzle. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        open={!!confirmPublish}
        title="Publish crossword?"
        message="This will make the crossword visible in the public browser. Visitors will be able to play it."
        confirmLabel="Publish"
        onConfirm={() => confirmPublish && handlePublish(confirmPublish)}
        onCancel={() => setConfirmPublish(null)}
      />
      <ConfirmDialog
        open={!!confirmUnpublish}
        title="Unpublish crossword?"
        message="This will remove the crossword from the public browser. It will remain in your drafts."
        confirmLabel="Unpublish"
        variant="danger"
        onConfirm={() => confirmUnpublish && handleUnpublish(confirmUnpublish)}
        onCancel={() => setConfirmUnpublish(null)}
      />
    </AdminLayout>
  );
}

// Preview modal showing a small grid
import { Modal } from '@/components/ui/Modal';

function PreviewModal({ puzzle, onClose }: { puzzle: CrosswordPuzzle; onClose: () => void }) {
  const cellSize = puzzle.size <= 10 ? 22 : puzzle.size <= 12 ? 18 : 14;
  return (
    <Modal open={true} onClose={onClose} title={puzzle.title} className="max-w-2xl">
      <div className="space-y-4">
        <p className="text-sm text-proddaily-text-2">{puzzle.description}</p>
        <div className="flex justify-center overflow-x-auto scrollbar-thin">
          <div className="inline-block border border-proddaily-border bg-proddaily-bg-2">
            {puzzle.grid.map((row, r) => (
              <div key={r} className="flex">
                {row.map((cell, c) => (
                  <div
                    key={c}
                    style={{ width: cellSize, height: cellSize }}
                    className={cn(
                      'border border-proddaily-border/50 relative flex items-center justify-center text-[8px] font-bold',
                      cell.isBlocked ? 'bg-proddaily-bg' : 'bg-proddaily-card text-proddaily-text'
                    )}
                  >
                    {cell.number && (
                      <span className="absolute top-0 left-0.5 text-proddaily-text-2 leading-none" style={{ fontSize: cellSize * 0.3 }}>
                        {cell.number}
                      </span>
                    )}
                    {cell.letter}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto scrollbar-thin">
          <div>
            <h4 className="text-xs uppercase tracking-wide text-proddaily-text-2 mb-2">Across</h4>
            {puzzle.clues.filter((c) => c.direction === 'across').map((c) => (
              <p key={`${c.number}-a`} className="text-xs text-proddaily-text py-0.5">
                <span className="pd-accent-text font-bold">{c.number}.</span> {c.clue}
              </p>
            ))}
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wide text-proddaily-text-2 mb-2">Down</h4>
            {puzzle.clues.filter((c) => c.direction === 'down').map((c) => (
              <p key={`${c.number}-d`} className="text-xs text-proddaily-text py-0.5">
                <span className="pd-accent-text font-bold">{c.number}.</span> {c.clue}
              </p>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
