import type { LetterFeedback } from '@/types';
import { WORDLE_ALLOWED_WORDS } from '@/data/wordleAllowedWords';

export const WORDLE_MAX_GUESSES = 6;
export const WORDLE_WORD_LENGTH = 5;

const FEEDBACK_VALUES = new Set<LetterFeedback>(['correct', 'present', 'absent']);

export function isFeedbackRow(value: unknown): value is LetterFeedback[] {
  return (
    Array.isArray(value) &&
    value.length === WORDLE_WORD_LENGTH &&
    value.every((v) => typeof v === 'string' && FEEDBACK_VALUES.has(v as LetterFeedback))
  );
}

/**
 * Normalize server/local feedback into per-guess rows.
 * Handles legacy flat arrays produced by a jsonb || bug.
 */
export function normalizeFeedbackRows(
  raw: unknown,
  guesses: string[],
  answer?: string | null,
): LetterFeedback[][] {
  if (Array.isArray(raw) && raw.length > 0) {
    if (isFeedbackRow(raw[0])) {
      return (raw as unknown[]).filter(isFeedbackRow);
    }

    // Flat ["correct","absent",...] — chunk into rows of 5
    if (typeof raw[0] === 'string' && FEEDBACK_VALUES.has(raw[0] as LetterFeedback)) {
      const flat = raw as LetterFeedback[];
      const rows: LetterFeedback[][] = [];
      for (let i = 0; i + WORDLE_WORD_LENGTH <= flat.length; i += WORDLE_WORD_LENGTH) {
        const chunk = flat.slice(i, i + WORDLE_WORD_LENGTH);
        if (isFeedbackRow(chunk)) rows.push(chunk);
      }
      if (rows.length > 0) return rows;
    }
  }

  if (answer) {
    return guesses.map((g) => evaluateGuess(g, answer));
  }

  return [];
}

/**
 * Evaluate a guess against the answer, returning per-letter feedback.
 * Green = correct position, yellow = present but misplaced, gray = absent.
 */
export function evaluateGuess(guess: string, answer: string): LetterFeedback[] {
  const result: LetterFeedback[] = new Array(WORDLE_WORD_LENGTH).fill('absent');
  const answerChars = answer.split('');
  const guessChars = guess.split('');
  const used: boolean[] = new Array(WORDLE_WORD_LENGTH).fill(false);

  // First pass: correct positions
  for (let i = 0; i < WORDLE_WORD_LENGTH; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  // Second pass: present but misplaced
  for (let i = 0; i < WORDLE_WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < WORDLE_WORD_LENGTH; j++) {
      if (!used[j] && guessChars[i] === answerChars[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

/**
 * Build the keyboard letter status from all guesses.
 */
export function getKeyboardStatus(
  guesses: string[],
  answerOrFeedback: string | LetterFeedback[][]
): Record<string, LetterFeedback> {
  const status: Record<string, LetterFeedback> = {};
  for (let g = 0; g < guesses.length; g++) {
    const guess = guesses[g];
    const feedback = Array.isArray(answerOrFeedback)
      ? answerOrFeedback[g]
      : evaluateGuess(guess, answerOrFeedback);
    if (!feedback) continue;
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const current = status[letter];
      const newStatus = feedback[i];
      if (current === 'correct') continue;
      if (current === 'present' && newStatus === 'absent') continue;
      status[letter] = newStatus;
    }
  }
  return status;
}

export function buildShareTextFromFeedback(
  guesses: string[],
  feedbackRows: LetterFeedback[][],
  won: boolean,
  puzzleDate: string
): string {
  const lines: string[] = [];
  const attemptNum = won ? guesses.length : 'X';
  lines.push(`Prod Daily Wordle ${puzzleDate} ${attemptNum}/${WORDLE_MAX_GUESSES}`);
  lines.push('');
  for (let i = 0; i < guesses.length; i++) {
    const feedback = feedbackRows[i] ?? [];
    let line = '';
    for (const f of feedback) {
      if (f === 'correct') line += '🟩';
      else if (f === 'present') line += '🟨';
      else line += '⬛';
    }
    lines.push(line);
  }
  return lines.join('\n');
}

export function isValidGuess(guess: string): boolean {
  return WORDLE_ALLOWED_WORDS.has(guess.toUpperCase());
}

export function buildShareText(
  guesses: string[],
  answer: string,
  won: boolean,
  puzzleDate: string
): string {
  const lines: string[] = [];
  const attemptNum = won ? guesses.length : 'X';
  lines.push(`Prod Daily Wordle ${puzzleDate} ${attemptNum}/${WORDLE_MAX_GUESSES}`);
  lines.push('');

  for (const guess of guesses) {
    const feedback = evaluateGuess(guess, answer);
    let line = '';
    for (const f of feedback) {
      if (f === 'correct') line += '🟩';
      else if (f === 'present') line += '🟨';
      else line += '⬛';
    }
    lines.push(line);
  }

  return lines.join('\n');
}
