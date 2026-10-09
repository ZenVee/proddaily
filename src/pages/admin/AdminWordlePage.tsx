import { useState, useMemo, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { wordleService } from '@/services/wordleService';
import { adminService } from '@/services/adminService';
import { useToast } from '@/state/ToastContext';
import { todayStr, formatDisplayDate, parseDate, addDays, cn } from '@/utils/helpers';
import type { WordlePuzzle } from '@/types';
import { Plus, Pencil, Trash2, Eye, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const statusVariant: Record<string, 'green' | 'yellow' | 'blue' | 'default'> = {
  active: 'green',
  scheduled: 'blue',
  draft: 'yellow',
  completed: 'default',
};

export function AdminWordlePage() {
  const { toast } = useToast();
  const [puzzles, setPuzzles] = useState<WordlePuzzle[]>([]);

  useEffect(() => {
    wordleService.listPuzzlesAdmin().then(setPuzzles).catch((err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to load puzzles', 'error');
      setPuzzles(wordleService.getPuzzles());
    });
  }, [toast]);
  const [showModal, setShowModal] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [modalDate, setModalDate] = useState('');
  const [modalWord, setModalWord] = useState('');
  const [wordError, setWordError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [previewPuzzle, setPreviewPuzzle] = useState<WordlePuzzle | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const today = todayStr();
    return today.substring(0, 7);
  });

  const today = todayStr();

  const sortedPuzzles = useMemo(() =>
    [...puzzles].sort((a, b) => a.date.localeCompare(b.date)),
  [puzzles]);

  function openCreate() {
    setEditingDate(null);
    setModalDate(today);
    setModalWord('');
    setWordError('');
    setShowModal(true);
  }

  function openEdit(p: WordlePuzzle) {
    setEditingDate(p.date);
    setModalDate(p.date);
    setModalWord(p.word);
    setWordError('');
    setShowModal(true);
  }

  async function handleSave() {
    const word = modalWord.toUpperCase().trim();
    if (word.length !== 5) {
      setWordError('Word must be exactly 5 letters.');
      return;
    }
    if (!/^[A-Z]+$/.test(word)) {
      setWordError('Word must contain only letters A-Z.');
      return;
    }

    if (!editingDate) {
      const exists = puzzles.find((p) => p.date === modalDate);
      if (exists) {
        setWordError('A puzzle already exists for this date.');
        return;
      }
    }

    try {
      await wordleService.upsertPuzzleAdmin(modalDate, word);
      setPuzzles(await wordleService.listPuzzlesAdmin());
      adminService.logActivity('Set daily word', `${word} for ${modalDate}`);
      toast(editingDate ? 'Word updated.' : 'Word scheduled.', 'success');
      setShowModal(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    }
  }

  async function handleDelete(date: string) {
    try {
      await wordleService.removePuzzleAdmin(date);
      setPuzzles(await wordleService.listPuzzlesAdmin());
      adminService.logActivity('Removed daily word', `Date: ${date}`);
      toast('Entry removed.', 'info');
      setConfirmDelete(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }

  // Calendar
  const [year, month] = viewMonth.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const calendarCells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push(dateStr);
  }

  function changeMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function puzzleForDate(date: string): WordlePuzzle | undefined {
    return puzzles.find((p) => p.date === date);
  }

  return (
    <AdminLayout current="Wordle Manager">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-proddaily-text mb-1">Wordle Manager</h1>
        <p className="text-sm text-proddaily-text-2">Schedule and manage daily Prod Daily Wordle puzzles.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <div className="lg:w-1/2">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-proddaily-text">
                {firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)}>
                  <ChevronLeft size={18} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => changeMonth(1)}>
                  <ChevronRight size={18} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs text-proddaily-text-2 py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((date, i) => {
                if (!date) return <div key={i} />;
                const puzzle = puzzleForDate(date);
                const isToday = date === today;
                return (
                  <button
                    key={i}
                    onClick={() => puzzle ? openEdit(puzzle) : (setModalDate(date), setModalWord(''), setEditingDate(null), setShowModal(true))}
                    className={cn(
                      'aspect-square rounded-street text-xs flex flex-col items-center justify-center transition-colors border',
                      isToday ? 'pd-accent-border' : 'border-transparent',
                      puzzle ? 'bg-proddaily-bg-2 hover:bg-proddaily-card' : 'hover:bg-proddaily-card',
                    )}
                  >
                    <span className={cn('text-proddaily-text', isToday && 'pd-accent-text font-bold')}>
                      {Number(date.split('-')[2])}
                    </span>
                    {puzzle && (
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full mt-0.5',
                        puzzle.status === 'active' ? 'bg-green-500' :
                        puzzle.status === 'completed' ? 'bg-proddaily-text-2' :
                        'bg-blue-500'
                      )} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-proddaily-border">
              <div className="flex items-center gap-1.5 text-xs text-proddaily-text-2">
                <div className="w-2 h-2 rounded-full bg-green-500" /> Active
              </div>
              <div className="flex items-center gap-1.5 text-xs text-proddaily-text-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> Scheduled
              </div>
              <div className="flex items-center gap-1.5 text-xs text-proddaily-text-2">
                <div className="w-2 h-2 rounded-full bg-proddaily-text-2" /> Completed
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <div className="lg:w-1/2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-proddaily-text">All Entries</h2>
            <Button size="sm" onClick={openCreate}>
              <Plus size={16} /> Add Word
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-proddaily-border">
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-proddaily-text-2 font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-proddaily-text-2 font-medium">Word</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-proddaily-text-2 font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-xs uppercase tracking-wide text-proddaily-text-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-proddaily-border">
                  {sortedPuzzles.map((p) => (
                    <tr key={p.date} className="hover:bg-proddaily-bg-2 transition-colors">
                      <td className="px-4 py-3 text-proddaily-text">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-proddaily-text-2" />
                          {formatDisplayDate(p.date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-proddaily-text">{p.word}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
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
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(p.date)}
                            className="p-1.5 rounded text-proddaily-text-2 hover:text-red-400 hover:bg-proddaily-card transition-colors"
                            title="Remove"
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
        </div>
      </div>

      {/* Create/Edit modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingDate ? 'Edit Word' : 'Schedule New Word'}
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={modalDate}
            onChange={(e) => setModalDate(e.target.value)}
            disabled={!!editingDate}
          />
          <Input
            label="Word (5 letters)"
            value={modalWord}
            onChange={(e) => {
              setModalWord(e.target.value);
              setWordError('');
            }}
            maxLength={5}
            placeholder="e.g. CRANE"
            error={wordError}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Preview modal */}
      <Modal
        open={!!previewPuzzle}
        onClose={() => setPreviewPuzzle(null)}
        title="Puzzle Preview"
      >
        {previewPuzzle && (
          <div className="text-center">
            <p className="text-sm text-proddaily-text-2 mb-2">{formatDisplayDate(previewPuzzle.date)}</p>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-lg pd-accent-bg mb-3">
              <span className="font-serif text-3xl font-bold text-proddaily-bg">{previewPuzzle.word}</span>
            </div>
            <div className="flex justify-center gap-3 mb-2">
              <Badge variant={statusVariant[previewPuzzle.status]}>{previewPuzzle.status}</Badge>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Remove entry?"
        message="This will remove the scheduled word for this date. This cannot be undone."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </AdminLayout>
  );
}
