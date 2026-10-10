import type { LetterFeedback, WordlePuzzle, WordleProgress } from '@/types';
import { loadJSON, saveJSON } from '@/utils/storage';
import { seedWordlePuzzles } from '@/data/mockData';
import { WORDLE_ALLOWED_WORDS } from '@/data/wordleAllowedWords';
import { todayStr } from '@/utils/helpers';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const PUZZLES_KEY = 'wordle-puzzles';
const PROGRESS_KEY = 'wordle-progress';
const ADDED_WORDS_KEY = 'wordle-words-added';
const REMOVED_WORDS_KEY = 'wordle-words-removed';

export interface WordleWordPage {
  total: number;
  words: string[];
}

export interface WordleBulkAddResult {
  added: number;
  skipped: number;
  invalid: number;
  invalidSample: string[];
}

export function parseWordList(raw: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const part of raw.toUpperCase().split(/[^A-Z]+/)) {
    if (!part || seen.has(part)) continue;
    seen.add(part);
    words.push(part);
  }
  return words;
}

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

function localWordSets(): { added: Set<string>; removed: Set<string> } {
  return {
    added: new Set(loadJSON<string[]>(ADDED_WORDS_KEY, [])),
    removed: new Set(loadJSON<string[]>(REMOVED_WORDS_KEY, [])),
  };
}

function localAllowedWords(): string[] {
  const { added, removed } = localWordSets();
  return [...new Set([...WORDLE_ALLOWED_WORDS, ...added])]
    .filter((word) => !removed.has(word))
    .sort();
}

function normalizeWord(word: string): string {
  return word.toUpperCase().trim();
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

  async isAllowedWord(word: string): Promise<boolean> {
    const normalized = normalizeWord(word);
    if (!/^[A-Z]{5}$/.test(normalized)) return false;
    if (!isSupabaseConfigured) {
      const { added, removed } = localWordSets();
      if (removed.has(normalized)) return false;
      return added.has(normalized) || WORDLE_ALLOWED_WORDS.has(normalized);
    }
    const { data, error } = await supabase.functions.invoke('wordle-check-word', {
      body: { word: normalized },
    });
    if (error) return WORDLE_ALLOWED_WORDS.has(normalized);
    return Boolean((data as { allowed?: boolean } | null)?.allowed);
  },

  async searchAllowedWords(query: string, limit: number, offset: number): Promise<WordleWordPage> {
    const q = normalizeWord(query);
    if (!isSupabaseConfigured) {
      const matches = localAllowedWords().filter((word) => word.startsWith(q));
      return { total: matches.length, words: matches.slice(offset, offset + limit) };
    }
    const { data, error } = await supabase.rpc('admin_search_wordle_words', {
      p_query: q,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    const payload = data as { total?: number; words?: string[] };
    return { total: payload.total ?? 0, words: payload.words ?? [] };
  },

  async addAllowedWord(word: string): Promise<void> {
    const normalized = normalizeWord(word);
    if (!/^[A-Z]{5}$/.test(normalized)) throw new Error('Word must be 5 letters.');
    if (!isSupabaseConfigured) {
      const { added, removed } = localWordSets();
      removed.delete(normalized);
      if (!WORDLE_ALLOWED_WORDS.has(normalized)) added.add(normalized);
      saveJSON(ADDED_WORDS_KEY, [...added]);
      saveJSON(REMOVED_WORDS_KEY, [...removed]);
      return;
    }
    const { error } = await supabase.rpc('admin_add_wordle_word', { p_word: normalized });
    if (error) throw error;
  },

  async addAllowedWords(words: string[]): Promise<WordleBulkAddResult> {
    const unique = [...new Set(words.map(normalizeWord).filter(Boolean))];
    if (unique.length === 0) throw new Error('No words provided.');
    if (unique.length > 5000) throw new Error('Too many words (max 5000).');

    const valid = unique.filter((w) => /^[A-Z]{5}$/.test(w));
    const invalid = unique.filter((w) => !/^[A-Z]{5}$/.test(w));

    if (!isSupabaseConfigured) {
      const { added, removed } = localWordSets();
      let addedCount = 0;
      let skipped = 0;
      for (const word of valid) {
        const already = (WORDLE_ALLOWED_WORDS.has(word) || added.has(word)) && !removed.has(word);
        if (already) {
          skipped += 1;
          continue;
        }
        removed.delete(word);
        if (!WORDLE_ALLOWED_WORDS.has(word)) added.add(word);
        addedCount += 1;
      }
      saveJSON(ADDED_WORDS_KEY, [...added]);
      saveJSON(REMOVED_WORDS_KEY, [...removed]);
      return {
        added: addedCount,
        skipped,
        invalid: invalid.length,
        invalidSample: invalid.slice(0, 10),
      };
    }

    const { data, error } = await supabase.rpc('admin_add_wordle_words', { p_words: unique });
    if (error) throw error;
    const payload = data as {
      added?: number;
      skipped?: number;
      invalid?: number;
      invalid_sample?: string[];
    };
    return {
      added: payload.added ?? 0,
      skipped: payload.skipped ?? 0,
      invalid: payload.invalid ?? 0,
      invalidSample: payload.invalid_sample ?? [],
    };
  },

  async removeAllowedWord(word: string): Promise<void> {
    const normalized = normalizeWord(word);
    if (!isSupabaseConfigured) {
      const { added, removed } = localWordSets();
      added.delete(normalized);
      removed.add(normalized);
      saveJSON(ADDED_WORDS_KEY, [...added]);
      saveJSON(REMOVED_WORDS_KEY, [...removed]);
      return;
    }
    const { error } = await supabase.rpc('admin_remove_wordle_word', { p_word: normalized });
    if (error) throw error;
  },
};
