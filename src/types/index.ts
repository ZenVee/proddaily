// =====================
// Theme
// =====================
export type AccentPreset =
  | 'tan'
  | 'gold'
  | 'sage'
  | 'muted-blue'
  | 'steel-blue'
  | 'purple'
  | 'rose'
  | 'burnt-orange'
  | 'custom';

export interface AccentOption {
  id: AccentPreset;
  label: string;
  primary: string;
  secondary: string;
}

export interface ThemeState {
  preset: AccentPreset;
  primary: string;
  secondary: string;
  customHex: string;
}

// =====================
// Wordle
// =====================
export type LetterFeedback = 'correct' | 'present' | 'absent';
export type GameStatus = 'not-started' | 'in-progress' | 'won' | 'lost' | 'completed';

export interface WordlePuzzle {
  date: string; // YYYY-MM-DD
  word: string;
  status: 'active' | 'scheduled' | 'draft' | 'completed';
}

export interface WordleProgress {
  date: string;
  guesses: string[];
  status: 'won' | 'lost' | 'in-progress';
  solvedAt?: string;
}

// =====================
// Crossword
// =====================
export type CrosswordDifficulty = 'easy' | 'medium' | 'hard';
export type CrosswordStatus = 'draft' | 'published';

export interface CrosswordCell {
  row: number;
  col: number;
  letter: string;
  number: number | null;
  isBlocked: boolean;
}

export interface CrosswordClue {
  number: number;
  direction: 'across' | 'down';
  clue: string;
  answer: string;
  startRow: number;
  startCol: number;
  length: number;
}

export interface CrosswordPuzzle {
  id: string;
  title: string;
  description: string;
  difficulty: CrosswordDifficulty;
  size: number;
  status: CrosswordStatus;
  publishDate: string | null;
  createdAt: string;
  updatedAt: string;
  grid: CrosswordCell[][];
  clues: CrosswordClue[];
}

// =====================
// Admin
// =====================
export interface AdminActivity {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
}

// =====================
// Toast
// =====================
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

// =====================
// Page route
// =====================
export type Route =
  | { page: 'home' }
  | { page: 'wordle' }
  | { page: 'crossword' }
  | { page: 'crossword-play'; id: string }
  | { page: 'auth-callback' }
  | { page: 'profile-setup' }
  | { page: 'profile-edit' }
  | { page: 'profile'; id: string }
  | { page: 'login' }
  | { page: 'admin' }
  | { page: 'admin-overview' }
  | { page: 'admin-wordle' }
  | { page: 'admin-crossword' }
  | { page: 'admin-crossword-edit'; id: string | null }
  | { page: 'admin-appearance' }
  | { page: 'admin-settings' }
  | { page: 'admin-users' }
  | { page: 'admin-user'; id: string }
  | { page: 'admin-audit' };
