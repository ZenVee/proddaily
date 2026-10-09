import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/helpers';
import type { CrosswordPuzzle, CrosswordClue } from '@/types';
import { crosswordService } from '@/services/crosswordService';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/state/ToastContext';
import { useAuth } from '@/state/AuthContext';

interface PlayerProps {
  puzzle: CrosswordPuzzle;
}

export function CrosswordPlayer({ puzzle }: PlayerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { grid, clues, size } = puzzle;
  const serverMode = isSupabaseConfigured && grid.some((row) => row.some((c) => !c.isBlocked && !c.letter));
  const [userGrid, setUserGrid] = useState<string[][]>(() =>
    Array.from({ length: size }, () => Array(size).fill(''))
  );
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [tab, setTab] = useState<'across' | 'down'>('across');
  const [completed, setCompleted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [checksUsed, setChecksUsed] = useState(0);
  const [revealsUsed, setRevealsUsed] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!serverMode || !user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void crosswordService
        .saveProgress(puzzle.id, userGrid, {
          activeSeconds: elapsed,
          checks: checksUsed,
          reveals: revealsUsed,
        })
        .catch(() => undefined);
    }, 2500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [userGrid, serverMode, user, puzzle.id, elapsed, checksUsed, revealsUsed]);

  const acrossClues = clues.filter((c) => c.direction === 'across').sort((a, b) => a.number - b.number);
  const downClues = clues.filter((c) => c.direction === 'down').sort((a, b) => a.number - b.number);

  // Find the clue for the current cell + direction
  const currentClue = useCallback((): CrosswordClue | null => {
    if (!selected) return null;
    return findClueForCell(clues, selected.row, selected.col, direction);
  }, [selected, direction, clues]);

  // Get the cells in the current word
  const currentWordCells = useCallback((): { row: number; col: number }[] => {
    const clue = currentClue();
    if (!clue) return [];
    const cells: { row: number; col: number }[] = [];
    for (let i = 0; i < clue.length; i++) {
      if (clue.direction === 'across') {
        cells.push({ row: clue.startRow, col: clue.startCol + i });
      } else {
        cells.push({ row: clue.startRow + i, col: clue.startCol });
      }
    }
    return cells;
  }, [currentClue]);

  function isCellInCurrentWord(row: number, col: number): boolean {
    return currentWordCells().some((c) => c.row === row && c.col === col);
  }

  function handleCellClick(row: number, col: number) {
    if (grid[row][col].isBlocked) return;
    if (selected && selected.row === row && selected.col === col) {
      // Toggle direction
      setDirection((d) => (d === 'across' ? 'down' : 'across'));
      setTab((t) => (t === 'across' ? 'down' : 'across'));
    } else {
      setSelected({ row, col });
      // Auto-detect direction: if there's an across word starting/through here but no down, use across
      const hasAcross = clues.some((c) => c.direction === 'across' && isCellInClue(c, row, col));
      const hasDown = clues.some((c) => c.direction === 'down' && isCellInClue(c, row, col));
      if (hasAcross && !hasDown) {
        setDirection('across');
        setTab('across');
      } else if (hasDown && !hasAcross) {
        setDirection('down');
        setTab('down');
      }
    }
    inputRef.current?.focus();
  }

  function handleClueClick(clue: CrosswordClue) {
    setSelected({ row: clue.startRow, col: clue.startCol });
    setDirection(clue.direction);
    setTab(clue.direction);
    inputRef.current?.focus();
  }

  function handleInput(letter: string) {
    if (!selected) return;
    const upper = letter.toUpperCase();
    if (!/^[A-Z]$/.test(upper)) return;

    const newGrid = userGrid.map((r) => [...r]);
    newGrid[selected.row][selected.col] = upper;
    setUserGrid(newGrid);

    // Move to next cell in current direction
    moveToNext();
    checkCompletion(newGrid);
  }

  function handleBackspace() {
    if (!selected) return;
    const newGrid = userGrid.map((r) => [...r]);
    if (newGrid[selected.row][selected.col]) {
      newGrid[selected.row][selected.col] = '';
    } else {
      // Move back and clear
      const prev = moveToPrevCell();
      if (prev) {
        newGrid[prev.row][prev.col] = '';
      }
    }
    setUserGrid(newGrid);
  }

  function moveToNext() {
    if (!selected) return;
    const clue = currentClue();
    if (!clue) return;
    const idx = currentWordCells().findIndex((c) => c.row === selected.row && c.col === selected.col);
    // Find next empty or just next cell
    for (let i = idx + 1; i < clue.length; i++) {
      const r = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
      const c = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
      if (!userGrid[r][c]) {
        setSelected({ row: r, col: c });
        return;
      }
    }
    // Just move to next cell
    if (idx + 1 < clue.length) {
      const r = clue.direction === 'across' ? clue.startRow : clue.startRow + idx + 1;
      const c = clue.direction === 'across' ? clue.startCol + idx + 1 : clue.startCol;
      setSelected({ row: r, col: c });
    }
  }

  function moveToPrevCell(): { row: number; col: number } | null {
    if (!selected) return null;
    const clue = currentClue();
    if (!clue) return null;
    const idx = currentWordCells().findIndex((c) => c.row === selected.row && c.col === selected.col);
    if (idx > 0) {
      const r = clue.direction === 'across' ? clue.startRow : clue.startRow + idx - 1;
      const c = clue.direction === 'across' ? clue.startCol + idx - 1 : clue.startCol;
      setSelected({ row: r, col: c });
      return { row: r, col: c };
    }
    return null;
  }

  function handleArrowKey(e: KeyboardEvent) {
    if (!selected) return;
    let { row, col } = selected;
    if (e.key === 'ArrowRight') { col = Math.min(size - 1, col + 1); setDirection('across'); setTab('across'); }
    else if (e.key === 'ArrowLeft') { col = Math.max(0, col - 1); setDirection('across'); setTab('across'); }
    else if (e.key === 'ArrowDown') { row = Math.min(size - 1, row + 1); setDirection('down'); setTab('down'); }
    else if (e.key === 'ArrowUp') { row = Math.max(0, row - 1); setDirection('down'); setTab('down'); }
    else return;

    // Skip blocked cells
    while (row >= 0 && row < size && col >= 0 && col < size && grid[row][col].isBlocked) {
      if (e.key === 'ArrowRight') col++;
      else if (e.key === 'ArrowLeft') col--;
      else if (e.key === 'ArrowDown') row++;
      else if (e.key === 'ArrowUp') row--;
    }
    if (row >= 0 && row < size && col >= 0 && col < size) {
      e.preventDefault();
      setSelected({ row, col });
    }
  }

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (completed) return;
      if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
      if (e.key.startsWith('Arrow')) { handleArrowKey(e); return; }
      if (e.key === ' ') {
        e.preventDefault();
        setDirection((d) => (d === 'across' ? 'down' : 'across'));
        setTab((t) => (t === 'across' ? 'down' : 'across'));
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleInput(e.key);
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });

  function checkCompletion(userInput: string[][]) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c].isBlocked) continue;
        if (userInput[r][c].toUpperCase() !== grid[r][c].letter.toUpperCase()) return;
      }
    }
    setCompleted(true);
  }

  async function handleCheck() {
    setChecksUsed((n) => n + 1);
    if (serverMode) {
      if (!user) {
        toast('Sign in to validate completion', 'info');
        return;
      }
      let filled = 0;
      let total = 0;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c].isBlocked) continue;
          total++;
          if (userGrid[r][c]) filled++;
        }
      }
      if (filled !== total) {
        toast('Fill every square before checking', 'warning');
        return;
      }
      try {
        await crosswordService.complete(puzzle.id, userGrid, elapsed);
        setCompleted(true);
        toast('Puzzle complete!', 'success');
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Not quite right', 'error');
      }
      return;
    }

    let errors = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c].isBlocked) continue;
        if (userGrid[r][c] && userGrid[r][c].toUpperCase() !== grid[r][c].letter.toUpperCase()) {
          errors++;
        }
      }
    }
    if (errors === 0) {
      let filled = 0;
      let total = 0;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c].isBlocked) continue;
          total++;
          if (userGrid[r][c]) filled++;
        }
      }
      if (filled === total) {
        setCompleted(true);
      }
    }
  }

  function handleClear() {
    setUserGrid(Array.from({ length: size }, () => Array(size).fill('')));
    setCompleted(false);
    startTimeRef.current = Date.now();
    setElapsed(0);
  }

  function handleReveal() {
    setRevealsUsed((n) => n + 1);
    if (serverMode) {
      toast('Reveal is disabled for online puzzles — solutions stay on the server', 'info');
      return;
    }
    const newGrid = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => (grid[r][c].isBlocked ? '' : grid[r][c].letter))
    );
    setUserGrid(newGrid);
    checkCompletion(newGrid);
  }

  const activeClue = currentClue();

  return (
    <CrosswordPlayerUI
      puzzle={puzzle}
      userGrid={userGrid}
      selected={selected}
      direction={direction}
      tab={tab}
      setTab={setTab}
      activeClue={activeClue}
      acrossClues={acrossClues}
      downClues={downClues}
      isCellInCurrentWord={isCellInCurrentWord}
      onCellClick={handleCellClick}
      onClueClick={handleClueClick}
      onCheck={handleCheck}
      onClear={handleClear}
      onReveal={handleReveal}
      completed={completed}
      elapsed={elapsed}
      inputRef={inputRef}
      onInputChange={handleInput}
    />
  );
}

// =====================
// Helper functions
// =====================
function isCellInClue(clue: CrosswordClue, row: number, col: number): boolean {
  if (clue.direction === 'across') {
    return row === clue.startRow && col >= clue.startCol && col < clue.startCol + clue.length;
  } else {
    return col === clue.startCol && row >= clue.startRow && row < clue.startRow + clue.length;
  }
}

function findClueForCell(clues: CrosswordClue[], row: number, col: number, direction: 'across' | 'down'): CrosswordClue | null {
  return clues.find((c) => c.direction === direction && isCellInClue(c, row, col)) ?? null;
}

// =====================
// UI Component
// =====================
import { useRef as useRefReact } from 'react';
import { Check, Eraser, Lightbulb, ArrowLeft, Clock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { formatElapsed } from '@/utils/helpers';
import { useRouter } from '@/state/RouterContext';
import { useState as useStateReact } from 'react';

interface PlayerUIProps {
  puzzle: CrosswordPuzzle;
  userGrid: string[][];
  selected: { row: number; col: number } | null;
  direction: 'across' | 'down';
  tab: 'across' | 'down';
  setTab: (t: 'across' | 'down') => void;
  activeClue: CrosswordClue | null;
  acrossClues: CrosswordClue[];
  downClues: CrosswordClue[];
  isCellInCurrentWord: (r: number, c: number) => boolean;
  onCellClick: (r: number, c: number) => void;
  onClueClick: (c: CrosswordClue) => void;
  onCheck: () => void;
  onClear: () => void;
  onReveal: () => void;
  completed: boolean;
  elapsed: number;
  inputRef: React.RefObject<HTMLInputElement>;
  onInputChange: (letter: string) => void;
}

function CrosswordPlayerUI(props: PlayerUIProps) {
  const { navigate } = useRouter();
  const [confirmClear, setConfirmClear] = useStateReact(false);
  const [confirmReveal, setConfirmReveal] = useStateReact(false);
  const [showComplete, setShowComplete] = useStateReact(props.completed);
  const { puzzle, selected, direction, tab, setTab, activeClue, acrossClues, downClues } = props;
  const { grid, size } = puzzle;

  // Show completion modal when completed becomes true
  useEffect(() => {
    if (props.completed) setShowComplete(true);
  }, [props.completed]);

  // Calculate cell size based on grid size
  const cellSize = size <= 10 ? 40 : size <= 12 ? 34 : 28;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0 panel-concrete p-4">
        {activeClue && (
          <div className="mb-3 px-4 py-2.5 bg-proddaily-card rounded-street border border-proddaily-border">
            <span className="pd-accent-text text-sm font-serif">{activeClue.number} {activeClue.direction === 'across' ? 'Across' : 'Down'}</span>
            <span className="text-proddaily-text-2 mx-2">·</span>
            <span className="text-proddaily-text text-sm">{activeClue.clue}</span>
          </div>
        )}

        {/* Grid */}
        <div className="overflow-x-auto scrollbar-thin pb-2 flex justify-center lg:justify-start">
          <div
            className="inline-block border-2 border-[#4a4a4a] bg-[#101010]"
            style={{ fontSize: `${cellSize * 0.4}px` }}
          >
            {grid.map((row, r) => (
              <div key={r} className="flex">
                {row.map((cell, c) => {
                  if (cell.isBlocked) {
                    return <div key={c} style={{ width: cellSize, height: cellSize }} className="bg-proddaily-bg" />;
                  }
                  const isSelected = selected?.row === r && selected?.col === c;
                  const isInWord = props.isCellInCurrentWord(r, c);
                  const userLetter = props.userGrid[r][c];
                  const correctLetter = cell.letter;
                  const isCorrect = userLetter && userLetter.toUpperCase() === correctLetter.toUpperCase();

                  return (
                    <button
                      key={c}
                      onClick={() => props.onCellClick(r, c)}
                      style={{ width: cellSize, height: cellSize }}
                      className={cn(
                        'relative border border-[#3a3a3a] flex items-center justify-center font-bold uppercase transition-colors bg-[#f3f0ea] text-[#161616]',
                        isSelected
                          ? 'pd-accent-bg text-proddaily-bg'
                          : isInWord
                            ? 'pd-word-bg text-[#161616]'
                            : 'hover:bg-white'
                      )}
                    >
                      {cell.number && (
                        <span
                          className={cn(
                            'absolute top-0 left-0.5 leading-none',
                            isSelected ? 'text-proddaily-bg/80' : 'text-[#5c584f]'
                          )}
                          style={{ fontSize: `${cellSize * 0.25}px` }}
                        >
                          {cell.number}
                        </span>
                      )}
                      {userLetter}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={props.onCheck}>
            <Check size={16} /> Check
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setConfirmClear(true)}>
            <Eraser size={16} /> Clear
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setConfirmReveal(true)}>
            <Lightbulb size={16} /> Reveal
          </Button>
          <div className="flex items-center gap-2 ml-auto text-sm text-proddaily-text-2">
            <Clock size={16} />
            <span className="font-mono">{formatElapsed(props.elapsed)}</span>
          </div>
        </div>
      </div>

      {/* Clue panel */}
      <div className="lg:w-80 flex-shrink-0 panel-concrete p-4">
        <div className="flex gap-1 mb-3 border-b border-proddaily-border">
          <button
            onClick={() => setTab('across')}
            className={cn(
              'px-4 py-2 text-sm font-serif transition-colors border-b-2 -mb-px',
              tab === 'across' ? 'pd-accent-text pd-accent-border' : 'text-proddaily-text-2 border-transparent hover:text-proddaily-text'
            )}
          >
            Across ({acrossClues.length})
          </button>
          <button
            onClick={() => setTab('down')}
            className={cn(
              'px-4 py-2 text-sm font-serif transition-colors border-b-2 -mb-px',
              tab === 'down' ? 'pd-accent-text pd-accent-border' : 'text-proddaily-text-2 border-transparent hover:text-proddaily-text'
            )}
          >
            Down ({downClues.length})
          </button>
        </div>

        {/* Clue list */}
        <div className="max-h-96 lg:max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
          {(tab === 'across' ? acrossClues : downClues).map((clue) => {
            const isActive = activeClue?.number === clue.number && activeClue?.direction === clue.direction;
            return (
              <button
                key={`${clue.number}-${clue.direction}`}
                onClick={() => props.onClueClick(clue)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-street text-sm transition-colors mb-0.5',
                  isActive ? 'pd-accent-bg text-proddaily-bg' : 'text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card'
                )}
              >
                <span className="font-bold mr-2">{clue.number}</span>
                {clue.clue}
                <span className="text-xs opacity-60 ml-1">({clue.length})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hidden input for mobile keyboard */}
      <input
        ref={props.inputRef}
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        className="sr-only"
        value=""
        onChange={(e) => {
          const val = e.target.value;
          if (val) props.onInputChange(val[val.length - 1]);
        }}
      />

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmClear}
        title="Clear all answers?"
        message="This will erase everything you've entered. This cannot be undone."
        confirmLabel="Clear All"
        variant="danger"
        onConfirm={() => { props.onClear(); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />
      <ConfirmDialog
        open={confirmReveal}
        title="Reveal all answers?"
        message="This will show the complete solution. You won't be able to solve it yourself after this."
        confirmLabel="Reveal"
        variant="danger"
        onConfirm={() => { props.onReveal(); setConfirmReveal(false); }}
        onCancel={() => setConfirmReveal(false)}
      />

      {/* Completion modal */}
      <Modal open={showComplete && props.completed} onClose={() => setShowComplete(false)} title="Puzzle Complete!">
        <div className="text-center">
          <div className="w-16 h-16 rounded-street bg-green-950/40 border border-green-900/40 flex items-center justify-center mx-auto mb-4">
            <Trophy size={32} className="text-green-400" />
          </div>
          <h3 className="font-serif text-3xl text-proddaily-text mb-2">{puzzle.title}</h3>
          <p className="text-proddaily-text-2 mb-2">
            Difficulty: <Badge variant="accent">{puzzle.difficulty}</Badge>
          </p>
          <p className="text-proddaily-text-2 mb-6">
            Completed in <span className="pd-accent-text font-mono font-bold">{formatElapsed(props.elapsed)}</span>
          </p>
          <Button onClick={() => navigate({ page: 'crossword' })} className="w-full max-w-xs">
            <ArrowLeft size={18} /> Back to Puzzles
          </Button>
        </div>
      </Modal>
    </div>
  );
}
