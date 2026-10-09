import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { PublicPage } from '@/components/layout/PublicPage';
import { CrosswordPlayer } from '@/components/game/crossword/CrosswordPlayer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { crosswordService } from '@/services/crosswordService';
import { useRouter } from '@/state/RouterContext';
import { formatDisplayDate } from '@/utils/helpers';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { CrosswordDifficulty, CrosswordPuzzle } from '@/types';

const difficultyVariant: Record<CrosswordDifficulty, 'green' | 'yellow' | 'red'> = {
  easy: 'green',
  medium: 'yellow',
  hard: 'red',
};

export function CrosswordPlayPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (isSupabaseConfigured) {
          const data = (await crosswordService.getForPlay(id)) as Record<string, unknown> | null;
          if (cancelled) return;
          if (!data) {
            setMissing(true);
          } else {
            setPuzzle({
              id: String(data.id),
              title: String(data.title ?? ''),
              description: String(data.description ?? ''),
              difficulty: (data.difficulty as CrosswordDifficulty) ?? 'medium',
              size: Number(data.size ?? 12),
              status: (data.status as CrosswordPuzzle['status']) ?? 'published',
              publishDate: (data.publish_date as string | null) ?? null,
              createdAt: String(data.created_at ?? '').slice(0, 10),
              updatedAt: String(data.updated_at ?? '').slice(0, 10),
              grid: (data.grid as CrosswordPuzzle['grid']) ?? [],
              clues: (data.clues as CrosswordPuzzle['clues']) ?? [],
            });
          }
        } else {
          const local = crosswordService.getById(id);
          if (!local) setMissing(true);
          else setPuzzle(local);
        }
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PublicPage>
        <p className="text-center py-20 text-proddaily-text-2">Loading puzzle…</p>
      </PublicPage>
    );
  }

  if (missing || !puzzle) {
    return (
      <PublicPage>
        <div className="max-w-2xl mx-auto px-4 py-20">
          <EmptyState
            title="Puzzle not found"
            description="This crossword may have been removed or is no longer available."
            action={<Button onClick={() => navigate({ page: 'crossword' })}><ArrowLeft size={16} /> Back to Puzzles</Button>}
          />
        </div>
      </PublicPage>
    );
  }

  return (
    <PublicPage showFooter={false}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate({ page: 'crossword' })}
          className="flex items-center gap-2 text-sm text-proddaily-text-2 hover:text-proddaily-text transition-colors mb-4"
        >
          <ArrowLeft size={16} /> All Puzzles
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-serif text-4xl text-proddaily-text">{puzzle.title}</h1>
            <Badge variant={difficultyVariant[puzzle.difficulty]}>{puzzle.difficulty}</Badge>
          </div>
          <p className="text-proddaily-text-2 text-sm">{puzzle.description}</p>
          {puzzle.publishDate && (
            <p className="text-proddaily-text-2 text-xs mt-1 flex items-center gap-1.5">
              <Calendar size={12} /> Published {formatDisplayDate(puzzle.publishDate)}
            </p>
          )}
        </div>

        <CrosswordPlayer puzzle={puzzle} />
      </div>
    </PublicPage>
  );
}
