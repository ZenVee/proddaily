import type { CrosswordCell, CrosswordClue } from '@/types';

interface WordEntry {
  word: string;
  clue: string;
}

interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number: number;
}

interface GridChar {
  letter: string;
  wordIndex: number;
}

/**
 * Attempts to place a list of words into a crossword grid by intersecting
 * matching letters. Returns the generated grid, clues, and any words that
 * could not be placed.
 */
export function generateCrossword(
  words: WordEntry[],
  size: number
): {
  grid: CrosswordCell[][];
  clues: CrosswordClue[];
  unplaced: string[];
} {
  const cleanWords = words
    .map((w) => ({ word: w.word.toUpperCase().replace(/[^A-Z]/g, ''), clue: w.clue.trim() }))
    .filter((w) => w.word.length > 0 && w.word.length <= size && w.clue.length > 0);

  // Sort by length descending — longer words anchor the grid better
  cleanWords.sort((a, b) => b.word.length - a.word.length);

  const grid: (GridChar | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );

  const placed: PlacedWord[] = [];
  const unplaced: string[] = [];

  if (cleanWords.length === 0) {
    return { grid: emptyGrid(size), clues: [], unplaced: [] };
  }

  // Place the first word in the middle, horizontally
  const first = cleanWords[0];
  const startCol = Math.floor((size - first.word.length) / 2);
  const startRow = Math.floor(size / 2);
  placeWord(grid, first.word, startRow, startCol, 'across');
  placed.push({ ...first, row: startRow, col: startCol, direction: 'across', number: 0 });

  // Try to place remaining words
  for (let i = 1; i < cleanWords.length; i++) {
    const entry = cleanWords[i];
    const result = tryPlace(grid, entry.word, size, placed);

    if (result) {
      placeWord(grid, entry.word, result.row, result.col, result.direction);
      placed.push({
        word: entry.word,
        clue: entry.clue,
        row: result.row,
        col: result.col,
        direction: result.direction,
        number: 0,
      });
    } else {
      unplaced.push(entry.word);
    }
  }

  // Number the grid
  const { cells, numberedClues } = buildNumberedGrid(grid, placed, size);

  return { grid: cells, clues: numberedClues, unplaced };
}

function emptyGrid(size: number): CrosswordCell[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      row: r,
      col: c,
      letter: '',
      number: null,
      isBlocked: true,
    }))
  );
}

function placeWord(
  grid: (GridChar | null)[][],
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down'
): void {
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    grid[r][c] = { letter: word[i], wordIndex: 0 };
  }
}

interface PlacementResult {
  row: number;
  col: number;
  direction: 'across' | 'down';
}

function tryPlace(
  grid: (GridChar | null)[][],
  word: string,
  size: number,
  placed: PlacedWord[]
): PlacementResult | null {
  let best: { result: PlacementResult; score: number } | null = null;

  for (const p of placed) {
    const perpDir: 'across' | 'down' = p.direction === 'across' ? 'down' : 'across';
    for (let i = 0; i < p.word.length; i++) {
      const letter = p.word[i];
      for (let j = 0; j < word.length; j++) {
        if (word[j] !== letter) continue;

        let row: number, col: number;
        if (perpDir === 'down') {
          // p is across, new word is down, intersecting at p's (row, col+i)
          row = p.row - j;
          col = p.col + i;
        } else {
          // p is down, new word is across, intersecting at p's (row+i, col)
          row = p.row + i;
          col = p.col - j;
        }

        if (canPlace(grid, word, row, col, perpDir, size)) {
          const score = countIntersections(grid, word, row, col, perpDir);
          if (!best || score > best.score) {
            best = { result: { row, col, direction: perpDir }, score };
          }
        }
      }
    }
  }

  return best?.result ?? null;
}

function canPlace(
  grid: (GridChar | null)[][],
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down',
  size: number
): boolean {
  // Bounds check
  if (row < 0 || col < 0) return false;
  if (direction === 'across') {
    if (col + word.length > size) return false;
    if (row >= size) return false;
  } else {
    if (row + word.length > size) return false;
    if (col >= size) return false;
  }

  // Cell before start must be empty
  if (direction === 'across') {
    if (col > 0 && grid[row][col - 1] !== null) return false;
    if (col + word.length < size && grid[row][col + word.length] !== null) return false;
  } else {
    if (row > 0 && grid[row - 1][col] !== null) return false;
    if (row + word.length < size && grid[row + word.length][col] !== null) return false;
  }

  let hasIntersection = false;

  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    const existing = grid[r][c];

    if (existing !== null) {
      if (existing.letter !== word[i]) return false;
      hasIntersection = true;
    } else {
      // Check perpendicular neighbors are empty (no adjacent parallel words)
      if (direction === 'across') {
        if (r > 0 && grid[r - 1][c] !== null) return false;
        if (r < size - 1 && grid[r + 1][c] !== null) return false;
      } else {
        if (c > 0 && grid[r][c - 1] !== null) return false;
        if (c < size - 1 && grid[r][c + 1] !== null) return false;
      }
    }
  }

  return hasIntersection;
}

function countIntersections(
  grid: (GridChar | null)[][],
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down'
): number {
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    if (grid[r][c] !== null) count++;
  }
  return count;
}

function buildNumberedGrid(
  grid: (GridChar | null)[][],
  placed: PlacedWord[],
  size: number
): { cells: CrosswordCell[][]; numberedClues: CrosswordClue[] } {
  // Find all word starts and assign numbers
  const starts = new Map<string, number>();
  let currentNumber = 1;

  // Collect all start positions
  const allStarts: { row: number; col: number; directions: ('across' | 'down')[] }[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) continue;
      const directions: ('across' | 'down')[] = [];
      // Check if this is the start of an across word
      const isAcrossStart = (c === 0 || grid[r][c - 1] === null) && c < size - 1 && grid[r][c + 1] !== null;
      // Check if this is the start of a down word
      const isDownStart = (r === 0 || grid[r - 1][c] === null) && r < size - 1 && grid[r + 1][c] !== null;

      if (isAcrossStart) directions.push('across');
      if (isDownStart) directions.push('down');

      if (directions.length > 0) {
        const key = `${r},${c}`;
        if (!starts.has(key)) {
          starts.set(key, currentNumber++);
        }
        allStarts.push({ row: r, col: c, directions });
      }
    }
  }

  // Build cell grid
  const cells: CrosswordCell[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      const existing = grid[r][c];
      const key = `${r},${c}`;
      return {
        row: r,
        col: c,
        letter: existing?.letter ?? '',
        number: starts.has(key) ? starts.get(key)! : null,
        isBlocked: existing === null,
      };
    })
  );

  // Build clues with numbering
  const numberedClues: CrosswordClue[] = [];
  for (const p of placed) {
    const key = `${p.row},${p.col}`;
    const num = starts.get(key);
    if (num !== undefined) {
      numberedClues.push({
        number: num,
        direction: p.direction,
        clue: p.clue,
        answer: p.word,
        startRow: p.row,
        startCol: p.col,
        length: p.word.length,
      });
    }
  }

  // Sort clues by number, then across before down
  numberedClues.sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    return a.direction === 'across' ? -1 : 1;
  });

  return { cells, numberedClues };
}

/**
 * Build a fully playable empty grid (all blocked) for manual editing.
 */
export function createEmptyGrid(size: number): CrosswordCell[][] {
  return emptyGrid(size);
}
