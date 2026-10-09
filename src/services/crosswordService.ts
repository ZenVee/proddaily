import type { CrosswordPuzzle } from '@/types';
import { loadJSON, saveJSON } from '@/utils/storage';
import { seedCrosswordPuzzles } from '@/data/mockData';
import { todayStr, uid } from '@/utils/helpers';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const KEY = 'crossword-puzzles';

function localAll(): CrosswordPuzzle[] {
  const existing = loadJSON<CrosswordPuzzle[] | null>(KEY, null);
  if (existing && existing.length > 0) return existing;
  const seeded = seedCrosswordPuzzles();
  saveJSON(KEY, seeded);
  return seeded;
}

export const crosswordService = {
  async listPublishedRemote(): Promise<Partial<CrosswordPuzzle>[]> {
    if (!isSupabaseConfigured) return this.getPublished();
    const { data, error } = await supabase.rpc('get_published_crosswords');
    if (error) throw error;
    return (data as Partial<CrosswordPuzzle>[]) ?? [];
  },

  async getForPlay(id: string) {
    if (!isSupabaseConfigured) {
      const p = this.getById(id);
      return p;
    }
    const { data, error } = await supabase.rpc('get_crossword_for_play', { p_puzzle_id: id });
    if (error) throw error;
    return data as (CrosswordPuzzle & { progress?: unknown }) | null;
  },

  async saveProgress(
    puzzleId: string,
    enteredLetters: string[][],
    opts?: { activeSeconds?: number; hints?: number; reveals?: number; checks?: number }
  ) {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.rpc('save_crossword_progress', {
      p_puzzle_id: puzzleId,
      p_entered_letters: enteredLetters,
      p_active_seconds: opts?.activeSeconds,
      p_hints_used: opts?.hints,
      p_reveals_used: opts?.reveals,
      p_checks_used: opts?.checks,
    });
    if (error) throw error;
  },

  async complete(puzzleId: string, enteredLetters: string[][], activeSeconds: number) {
    if (!isSupabaseConfigured) {
      return { ok: true, assisted: false };
    }
    const { data, error } = await supabase.rpc('complete_crossword', {
      p_puzzle_id: puzzleId,
      p_entered_letters: enteredLetters,
      p_active_seconds: activeSeconds,
    });
    if (error) throw error;
    return data as { ok: boolean; assisted: boolean };
  },

  async listAdmin(): Promise<CrosswordPuzzle[]> {
    if (!isSupabaseConfigured) return this.getAll();
    const { data, error } = await supabase
      .from('crossword_puzzles')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapDbPuzzle);
  },

  async saveAdmin(puzzle: CrosswordPuzzle): Promise<CrosswordPuzzle> {
    if (!isSupabaseConfigured) {
      return this.save(puzzle)[0] ? puzzle : puzzle;
    }

    const payload = {
      title: puzzle.title,
      description: puzzle.description,
      difficulty: puzzle.difficulty,
      size: puzzle.size,
      grid: puzzle.grid,
      answer_key: puzzle.grid,
      clues: puzzle.clues,
      status: puzzle.status,
      publish_date: puzzle.publishDate,
      updated_at: new Date().toISOString(),
    };

    if (puzzle.id && !puzzle.id.startsWith('local-')) {
      const { data, error } = await supabase
        .from('crossword_puzzles')
        .update(payload)
        .eq('id', puzzle.id)
        .select('*')
        .single();
      if (error) throw error;
      await supabase.rpc('write_audit_log', {
        p_action: puzzle.status === 'published' ? 'crossword.publish' : 'crossword.edit',
        p_category: 'crosswords',
        p_target_type: 'crossword_puzzle',
        p_target_id: puzzle.id,
      });
      return mapDbPuzzle(data);
    }

    const { data, error } = await supabase
      .from('crossword_puzzles')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    await supabase.rpc('write_audit_log', {
      p_action: 'crossword.create',
      p_category: 'crosswords',
      p_target_type: 'crossword_puzzle',
      p_target_id: data.id,
    });
    return mapDbPuzzle(data);
  },

  async removeAdmin(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      this.remove(id);
      return;
    }
    const { error } = await supabase.from('crossword_puzzles').delete().eq('id', id);
    if (error) throw error;
    await supabase.rpc('write_audit_log', {
      p_action: 'crossword.delete',
      p_category: 'crosswords',
      p_target_type: 'crossword_puzzle',
      p_target_id: id,
    });
  },

  getAll(): CrosswordPuzzle[] {
    return localAll();
  },

  getPublished(): CrosswordPuzzle[] {
    return localAll().filter((p) => p.status === 'published');
  },

  getById(id: string): CrosswordPuzzle | null {
    return localAll().find((p) => p.id === id) ?? null;
  },

  save(puzzle: CrosswordPuzzle): CrosswordPuzzle[] {
    const all = localAll();
    const idx = all.findIndex((p) => p.id === puzzle.id);
    const next = { ...puzzle, updatedAt: todayStr() };
    if (idx >= 0) all[idx] = next;
    else all.push(next);
    saveJSON(KEY, all);
    return all;
  },

  create(partial: Partial<CrosswordPuzzle>): CrosswordPuzzle {
    return {
      id: uid(),
      title: partial.title ?? 'Untitled',
      description: partial.description ?? '',
      difficulty: partial.difficulty ?? 'medium',
      size: partial.size ?? 12,
      status: 'draft',
      publishDate: null,
      createdAt: todayStr(),
      updatedAt: todayStr(),
      grid: partial.grid ?? [],
      clues: partial.clues ?? [],
    };
  },

  publish(id: string): CrosswordPuzzle[] {
    const all = localAll();
    const p = all.find((x) => x.id === id);
    if (p) {
      p.status = 'published';
      p.publishDate = todayStr();
      p.updatedAt = todayStr();
    }
    saveJSON(KEY, all);
    return all;
  },

  unpublish(id: string): CrosswordPuzzle[] {
    const all = localAll();
    const p = all.find((x) => x.id === id);
    if (p) {
      p.status = 'draft';
      p.publishDate = null;
      p.updatedAt = todayStr();
    }
    saveJSON(KEY, all);
    return all;
  },

  remove(id: string): CrosswordPuzzle[] {
    const all = localAll().filter((p) => p.id !== id);
    saveJSON(KEY, all);
    return all;
  },
};

function mapDbPuzzle(row: Record<string, unknown>): CrosswordPuzzle {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    difficulty: (row.difficulty as CrosswordPuzzle['difficulty']) ?? 'medium',
    size: Number(row.size ?? 12),
    status: (row.status as CrosswordPuzzle['status']) ?? 'draft',
    publishDate: (row.publish_date as string | null) ?? null,
    createdAt: String(row.created_at ?? '').slice(0, 10),
    updatedAt: String(row.updated_at ?? '').slice(0, 10),
    grid: (row.grid as CrosswordPuzzle['grid']) ?? [],
    clues: (row.clues as CrosswordPuzzle['clues']) ?? [],
  };
}
