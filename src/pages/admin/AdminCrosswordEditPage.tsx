import { useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CrosswordPlayer } from '@/components/game/crossword/CrosswordPlayer';
import { crosswordService } from '@/services/crosswordService';
import { adminService } from '@/services/adminService';
import { useToast } from '@/state/ToastContext';
import { useRouter } from '@/state/RouterContext';
import { generateCrossword, createEmptyGrid } from '@/utils/crosswordGenerator';
import { uid, todayStr, cn } from '@/utils/helpers';
import type { CrosswordPuzzle, CrosswordCell, CrosswordClue, CrosswordDifficulty } from '@/types';
import {
  ArrowLeft, Plus, Trash2, Wand2, RefreshCw, Save, Upload, Eye,
  Pencil, ListChecks, AlertCircle, CheckCircle2,
} from 'lucide-react';

interface WordEntry {
  id: string;
  word: string;
  clue: string;
}

export function AdminCrosswordEditPage({ id }: { id: string | null }) {
  const { navigate } = useRouter();
  const { toast } = useToast();

  const existing = id ? crosswordService.getById(id) : null;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [difficulty, setDifficulty] = useState<CrosswordDifficulty>(existing?.difficulty ?? 'easy');
  const [size, setSize] = useState(existing?.size ?? 12);
  const [publishDate, setPublishDate] = useState(existing?.publishDate ?? '');
  const [tab, setTab] = useState<'editor' | 'clues' | 'preview'>('editor');

  const [wordEntries, setWordEntries] = useState<WordEntry[]>(() => {
    if (existing && existing.clues.length > 0) {
      return existing.clues.map((c) => ({ id: uid(), word: c.answer, clue: c.clue }));
    }
    return [{ id: uid(), word: '', clue: '' }];
  });

  const [grid, setGrid] = useState<CrosswordCell[][]>(existing?.grid ?? createEmptyGrid(size));
  const [clues, setClues] = useState<CrosswordClue[]>(existing?.clues ?? []);
  const [unplaced, setUnplaced] = useState<string[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(!!existing && existing.clues.length > 0);

  const handleGenerate = useCallback(() => {
    const valid = wordEntries.filter((w) => w.word.trim() && w.clue.trim());
    if (valid.length < 2) {
      toast('Add at least 2 words with clues to generate a grid.', 'warning');
      return;
    }
    const result = generateCrossword(valid, size);
    setGrid(result.grid);
    setClues(result.clues);
    setUnplaced(result.unplaced);
    setHasGenerated(true);
    if (result.unplaced.length > 0) {
      toast(`Grid generated. ${result.unplaced.length} word(s) could not be placed.`, 'warning');
    } else {
      toast('Grid generated successfully.', 'success');
    }
  }, [wordEntries, size, toast]);

  function addWord() {
    setWordEntries([...wordEntries, { id: uid(), word: '', clue: '' }]);
  }

  function removeWord(wordId: string) {
    setWordEntries(wordEntries.filter((w) => w.id !== wordId));
  }

  function updateWord(wordId: string, field: 'word' | 'clue', value: string) {
    setWordEntries(wordEntries.map((w) => w.id === wordId ? { ...w, [field]: value } : w));
  }

  function handleSizeChange(newSize: number) {
    setSize(newSize);
    setGrid(createEmptyGrid(newSize));
    setClues([]);
    setUnplaced([]);
    setHasGenerated(false);
  }

  function buildPuzzle(status: 'draft' | 'published'): CrosswordPuzzle {
    return {
      id: existing?.id ?? uid(),
      title: title.trim() || 'Untitled Puzzle',
      description: description.trim(),
      difficulty,
      size,
      status,
      publishDate: status === 'published' ? (publishDate || todayStr()) : null,
      createdAt: existing?.createdAt ?? todayStr(),
      updatedAt: todayStr(),
      grid,
      clues,
    };
  }

  function handleSaveDraft() {
    if (!title.trim()) {
      toast('Please enter a title.', 'warning');
      return;
    }
    const puzzle = buildPuzzle('draft');
    crosswordService.save(puzzle);
    adminService.logActivity('Saved crossword draft', puzzle.title);
    toast('Draft saved.', 'success');
    navigate({ page: 'admin-crossword' });
  }

  function handlePublish() {
    if (!title.trim()) {
      toast('Please enter a title.', 'warning');
      return;
    }
    if (!hasGenerated || clues.length === 0) {
      toast('Generate a grid before publishing.', 'warning');
      return;
    }
    const puzzle = buildPuzzle('published');
    crosswordService.save(puzzle);
    adminService.logActivity('Published crossword', puzzle.title);
    toast('Crossword published.', 'success');
    setConfirmPublish(false);
    navigate({ page: 'admin-crossword' });
  }

  // Editor grid cell click — toggle blocked
  function handleCellClick(row: number, col: number) {
    const newGrid = grid.map((r) => r.map((c) => ({ ...c })));
    newGrid[row][col].isBlocked = !newGrid[row][col].isBlocked;
    if (newGrid[row][col].isBlocked) {
      newGrid[row][col].letter = '';
      newGrid[row][col].number = null;
    }
    setGrid(newGrid);
    setSelectedCell({ row, col });
  }

  // Keyboard in editor grid
  function handleEditorKey(e: React.KeyboardEvent) {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    const newGrid = grid.map((r) => r.map((c) => ({ ...c })));

    if (e.key === 'Backspace') {
      e.preventDefault();
      newGrid[row][col].letter = '';
      if (col > 0) setSelectedCell({ row, col: col - 1 });
      setGrid(newGrid);
      return;
    }
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      let nr = row, nc = col;
      if (e.key === 'ArrowRight') nc = Math.min(size - 1, col + 1);
      else if (e.key === 'ArrowLeft') nc = Math.max(0, col - 1);
      else if (e.key === 'ArrowDown') nr = Math.min(size - 1, row + 1);
      else if (e.key === 'ArrowUp') nr = Math.max(0, row - 1);
      setSelectedCell({ row: nr, col: nc });
      return;
    }
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      newGrid[row][col].letter = e.key.toUpperCase();
      newGrid[row][col].isBlocked = false;
      setGrid(newGrid);
      if (col < size - 1) setSelectedCell({ row, col: col + 1 });
    }
  }

  const cellSize = size <= 10 ? 32 : size <= 12 ? 26 : 20;

  const acrossClues = clues.filter((c) => c.direction === 'across').sort((a, b) => a.number - b.number);
  const downClues = clues.filter((c) => c.direction === 'down').sort((a, b) => a.number - b.number);

  // Preview puzzle
  const previewPuzzle = useMemo((): CrosswordPuzzle => ({
    id: 'preview',
    title: title || 'Untitled Puzzle',
    description,
    difficulty,
    size,
    status: 'draft',
    publishDate: null,
    createdAt: todayStr(),
    updatedAt: todayStr(),
    grid,
    clues,
  }), [title, description, difficulty, size, grid, clues]);

  return (
    <AdminLayout current="Crossword Maker">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ page: 'admin-crossword' })}
            className="text-proddaily-text-2 hover:text-proddaily-text transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-serif text-2xl text-proddaily-text">
            {existing ? 'Edit Crossword' : 'New Crossword'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleSaveDraft}>
            <Save size={16} /> Save Draft
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setTab('preview')}>
            <Eye size={16} /> Preview
          </Button>
          <Button size="sm" onClick={() => setConfirmPublish(true)}>
            <Upload size={16} /> Publish
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <Card className="p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Puzzle title" />
          <Select label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as CrosswordDifficulty)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
          <Select label="Grid Size" value={size} onChange={(e) => handleSizeChange(Number(e.target.value))}>
            <option value={10}>10 x 10</option>
            <option value={12}>12 x 12</option>
            <option value={15}>15 x 15</option>
          </Select>
          <Input label="Publish Date (optional)" type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
        </div>
        <div className="mt-4">
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="A brief description of the puzzle" />
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-proddaily-border">
        {[
          { key: 'editor', label: 'Editor', icon: Pencil },
          { key: 'clues', label: 'Clues', icon: ListChecks },
          { key: 'preview', label: 'Preview', icon: Eye },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'editor' | 'clues' | 'preview')}
            className={cn(
              'px-4 py-2.5 text-sm font-serif transition-colors border-b-2 -mb-px flex items-center gap-2',
              tab === t.key ? 'pd-accent-text pd-accent-border' : 'text-proddaily-text-2 border-transparent hover:text-proddaily-text'
            )}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Editor tab */}
      {tab === 'editor' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Grid editor */}
          <div className="flex-1 min-w-0">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-proddaily-text">Grid Editor</h3>
                <p className="text-xs text-proddaily-text-2">Click to toggle blocked cells · Type letters · Arrow keys to navigate</p>
              </div>
              <div className="overflow-x-auto scrollbar-thin" tabIndex={0} onKeyDown={handleEditorKey}>
                <div className="inline-block border border-proddaily-border bg-proddaily-bg-2">
                  {grid.map((row, r) => (
                    <div key={r} className="flex">
                      {row.map((cell, c) => {
                        const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                        return (
                          <button
                            key={c}
                            onClick={() => handleCellClick(r, c)}
                            style={{ width: cellSize, height: cellSize }}
                            className={cn(
                              'border border-proddaily-border/50 relative flex items-center justify-center font-bold text-sm uppercase transition-colors',
                              cell.isBlocked
                                ? 'bg-proddaily-bg'
                                : isSelected
                                  ? 'pd-accent-bg text-proddaily-bg'
                                  : 'bg-proddaily-card text-proddaily-text hover:bg-proddaily-card-2'
                            )}
                          >
                            {cell.number && (
                              <span
                                className="absolute top-0 left-0.5 text-proddaily-text-2 leading-none"
                                style={{ fontSize: cellSize * 0.25 }}
                              >
                                {cell.number}
                              </span>
                            )}
                            {cell.letter}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Word entries */}
          <div className="lg:w-96 flex-shrink-0">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-proddaily-text">Words & Clues</h3>
                <Button size="sm" variant="secondary" onClick={addWord}>
                  <Plus size={14} /> Add Word
                </Button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                {wordEntries.map((entry, i) => (
                  <div key={entry.id} className="flex flex-col gap-2 p-3 bg-proddaily-bg-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-proddaily-text-2 flex-shrink-0">#{i + 1}</span>
                      <Input
                        value={entry.word}
                        onChange={(e) => updateWord(entry.id, 'word', e.target.value)}
                        placeholder="Answer"
                        className="flex-1"
                      />
                      {wordEntries.length > 1 && (
                        <button
                          onClick={() => removeWord(entry.id)}
                          className="p-2 text-proddaily-text-2 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    <Input
                      value={entry.clue}
                      onChange={(e) => updateWord(entry.id, 'clue', e.target.value)}
                      placeholder="Clue text"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={handleGenerate} className="flex-1">
                  <Wand2 size={16} /> Generate Grid
                </Button>
                <Button variant="secondary" onClick={handleGenerate} title="Regenerate layout">
                  <RefreshCw size={16} />
                </Button>
              </div>

              {/* Unplaced words */}
              {unplaced.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-yellow-900/10 border border-yellow-900/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-yellow-500 font-medium mb-1">Words that could not fit:</p>
                      <p className="text-xs text-yellow-500/70">{unplaced.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}

              {hasGenerated && unplaced.length === 0 && (
                <div className="mt-4 p-3 rounded-lg bg-green-900/10 border border-green-900/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500" />
                    <p className="text-xs text-green-500">All words placed successfully.</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Clues tab */}
      {tab === 'clues' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="font-medium text-proddaily-text mb-4">Across</h3>
            {acrossClues.length === 0 ? (
              <p className="text-sm text-proddaily-text-2 py-8 text-center">No across clues. Generate a grid first.</p>
            ) : (
              <div className="space-y-3">
                {acrossClues.map((clue) => (
                  <ClueEditorRow key={`${clue.number}-a`} clue={clue} />
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="font-medium text-proddaily-text mb-4">Down</h3>
            {downClues.length === 0 ? (
              <p className="text-sm text-proddaily-text-2 py-8 text-center">No down clues. Generate a grid first.</p>
            ) : (
              <div className="space-y-3">
                {downClues.map((clue) => (
                  <ClueEditorRow key={`${clue.number}-d`} clue={clue} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Preview tab */}
      {tab === 'preview' && (
        <div>
          {clues.length === 0 ? (
            <Card className="p-6">
              <div className="text-center py-12">
                <Eye size={32} className="text-proddaily-text-2 mx-auto mb-3" />
                <p className="text-proddaily-text-2">Generate a grid to see a preview.</p>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <h3 className="font-serif text-xl text-proddaily-text mb-4">{title || 'Untitled Puzzle'}</h3>
              <CrosswordPlayer puzzle={previewPuzzle} />
            </Card>
          )}
        </div>
      )}

      {/* Publish confirm */}
      <ConfirmDialog
        open={confirmPublish}
        title="Publish crossword?"
        message="This will make the crossword visible in the public browser. Visitors will be able to play it immediately."
        confirmLabel="Publish"
        onConfirm={handlePublish}
        onCancel={() => setConfirmPublish(false)}
      />
    </AdminLayout>
  );
}

function ClueEditorRow({ clue }: { clue: CrosswordClue }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-proddaily-bg-2 rounded-lg">
      <span className="pd-accent-text font-bold text-sm flex-shrink-0 w-8">{clue.number}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-proddaily-text-2 mb-1">
          {clue.direction === 'across' ? 'Across' : 'Down'} · {clue.answer} ({clue.length})
        </p>
        <p className="text-sm text-proddaily-text">{clue.clue}</p>
      </div>
    </div>
  );
}
