import type { LetterFeedback, WordlePuzzle, WordleProgress } from '@/types';
import { loadJSON, saveJSON } from '@/utils/storage';
import { seedWordlePuzzles } from '@/data/mockData';
import { todayStr } from '@/utils/helpers';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const PUZZLES_KEY = 'wordle-puzzles';
const PROGRESS_KEY = 'wordle-progress';

export interface ActiveWordlePayload {
  id: string;
  puzzle_date: string;
  status: string;
  answer: string | null;
  attempt: {
    guesses: string[];
    feedback: LetterFeedback[][];
    guess_count: number;
    status: 'in_progress' | 'won' | 'lost';
    started_at: string;
    completed_at: string | null;
  } | null;
}

export interface WordleGuessResult {
  feedback: LetterFeedback[];
  guess_count: number;
  status: 'in_progress' | 'won' | 'lost';
  answer: string | null;
  guesses: string[];
  all_feedback: LetterFeedback[][];
}

function localGetPuzzles(): WordlePuzzle[] {
  return loadJSON<WordlePuzzle[]>(PUZZLES_KEY, seedWordlePuzzles());
}

export const wordleService = {
  async getActivePuzzleRemote(): Promise<ActiveWordlePayload | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc('get_active_wordle_puzzle');
    if (error) throw error;
    return data as ActiveWordlePayload | null;
  },

  async submitGuess(guess: string): Promise<WordleGuessResult> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured');
    }
    const { data, error } = await supabase.rpc('submit_wordle_guess', { p_guess: guess });
    if (error) throw error;
    return data as WordleGuessResult;
  },

  async listPuzzlesAdmin(): Promise<WordlePuzzle[]> {
    if (!isSupabaseConfigured) return localGetPuzzles();
    const { data, error } = await supabase
      .from('wordle_puzzles')
      .select('id, puzzle_date, answer, status')
      .order('puzzle_date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((p) => ({
      date: p.puzzle_date as string,
      word: p.answer as string,
      status: (p.status === 'published' ? 'active' : p.status) as WordlePuzzle['status'],
    }));
  },

  async upsertPuzzleAdmin(date: string, word: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const puzzles = localGetPuzzles();
      const existing = puzzles.find((p) => p.date === date);
      if (existing) existing.word = word.toUpperCase();
      else puzzles.push({ date, word: word.toUpperCase(), status: 'scheduled' });
      puzzles.sort((a, b) => a.date.localeCompare(b.date));
      saveJSON(PUZZLES_KEY, puzzles);
      return;
    }

    const answer = word.toUpperCase();
    const { data: existing } = await supabase
      .from('wordle_puzzles')
      .select('id')
      .eq('puzzle_date', date)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('wordle_puzzles')
        .update({ answer, status: 'scheduled' })
        .eq('id', existing.id);
      if (error) throw error;
      await supabase.rpc('write_audit_log', {
        p_action: 'wordle.edit',
        p_category: 'wordle',
        p_target_type: 'wordle_puzzle',
        p_target_id: existing.id,
        p_previous: null,
        p_updated: { answer: '***', date },
      });
    } else {
      const { data, error } = await supabase
        .from('wordle_puzzles')
        .insert({ puzzle_date: date, answer, status: 'scheduled' })
        .select('id')
        .single();
      if (error) throw error;
      await supabase.rpc('write_audit_log', {
        p_action: 'wordle.create',
        p_category: 'wordle',
        p_target_type: 'wordle_puzzle',
        p_target_id: data.id,
        p_previous: null,
        p_updated: { date, status: 'scheduled' },
      });
    }
  },

  async removePuzzleAdmin(date: string): Promise<void> {
    if (!isSupabaseConfigured) {
      saveJSON(
        PUZZLES_KEY,
        localGetPuzzles().filter((p) => p.date !== date)
      );
      return;
    }
    const { data: existing } = await supabase
      .from('wordle_puzzles')
      .select('id')
      .eq('puzzle_date', date)
      .maybeSingle();
    if (!existing?.id) return;
    const { error } = await supabase.from('wordle_puzzles').delete().eq('id', existing.id);
    if (error) throw error;
    await supabase.rpc('write_audit_log', {
      p_action: 'wordle.delete',
      p_category: 'wordle',
      p_target_type: 'wordle_puzzle',
      p_target_id: existing.id,
      p_previous: { date },
      p_updated: null,
    });
  },

  // Local fallbacks for offline/demo
  getPuzzles(): WordlePuzzle[] {
    return localGetPuzzles();
  },

  getActivePuzzle(): WordlePuzzle | null {
    return localGetPuzzles().find((p) => p.date === todayStr()) ?? null;
  },

  getProgress(date: string): WordleProgress | null {
    const all = loadJSON<Record<string, WordleProgress>>(PROGRESS_KEY, {});
    return all[date] ?? null;
  },

  saveProgress(progress: WordleProgress): void {
    const all = loadJSON<Record<string, WordleProgress>>(PROGRESS_KEY, {});
    all[progress.date] = progress;
    saveJSON(PROGRESS_KEY, all);
  },

  clearProgress(date: string): void {
    const all = loadJSON<Record<string, WordleProgress>>(PROGRESS_KEY, {});
    delete all[date];
    saveJSON(PROGRESS_KEY, all);
  },
};
