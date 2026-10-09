import { useState, useMemo, useEffect } from 'react';
import { PublicPage } from '@/components/layout/PublicPage';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { crosswordService } from '@/services/crosswordService';
import { useRouter } from '@/state/RouterContext';
import { formatDisplayDate, cn } from '@/utils/helpers';
import { Search, Calendar } from 'lucide-react';
import type { CrosswordDifficulty, CrosswordPuzzle } from '@/types';

const difficultyVariant: Record<CrosswordDifficulty, 'green' | 'yellow' | 'red'> = {
  easy: 'green',
  medium: 'yellow',
  hard: 'red',
};

type Filter = 'all' | CrosswordDifficulty;

export function CrosswordPage() {
  const { navigate } = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [puzzles, setPuzzles] = useState<Partial<CrosswordPuzzle>[]>([]);

  useEffect(() => {
    crosswordService
      .listPublishedRemote()
      .then((rows) => setPuzzles(rows))
      .catch(() => setPuzzles(crosswordService.getPublished()));
  }, []);

  const filtered = useMemo(() => {
    return puzzles
      .filter((p) => filter === 'all' || p.difficulty === filter)
      .filter((p) =>
        search.trim() === '' ||
        (p.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const bd = (b.publishDate ?? (b as { publish_date?: string }).publish_date ?? '') as string;
        const ad = (a.publishDate ?? (a as { publish_date?: string }).publish_date ?? '') as string;
        return bd.localeCompare(ad);
      });
  }, [puzzles, search, filter]);

  const filters: { label: string; value: Filter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Easy', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Hard', value: 'hard' },
  ];

  // Mini grid thumbnail
  function MiniGrid({ grid, size }: { grid: import('@/types').CrosswordCell[][]; size: number }) {
    const cellSize = size <= 10 ? 18 : size <= 12 ? 15 : 12;
    return (
      <div className="inline-block border border-[#1a1a1a] bg-[#efeae1]">
        {grid.slice(0, 8).map((row, r) => (
          <div key={r} className="flex">
            {row.slice(0, 8).map((cell, c) => (
              <div
                key={c}
                style={{ width: cellSize, height: cellSize }}
                className={cell.isBlocked ? 'bg-[#1a1a1a]' : 'bg-[#f4f0e8] border border-[#1a1a1a]/30'}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <PublicPage>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-mark font-serif text-5xl sm:text-6xl text-proddaily-text">Crosswords</h1>
          <p className="text-proddaily-text-2 mt-3">Pick a puzzle. Put your mind to work.</p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'tag-stamp px-4 py-2 text-sm border transition-colors',
                  filter === f.value
                    ? 'pd-accent-bg text-proddaily-bg border-transparent'
                    : 'text-proddaily-text-2 border-proddaily-border bg-proddaily-bg-2 hover:text-proddaily-text hover:pd-accent-border'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={32} className="text-proddaily-text-2 mb-3" />}
            title="No puzzles found"
            description="Try adjusting your search or filters."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {filtered.map((puzzle, index) => {
              const id = String(puzzle.id);
              const difficulty = (puzzle.difficulty ?? 'medium') as CrosswordDifficulty;
              const publishDate =
                puzzle.publishDate ?? (puzzle as { publish_date?: string | null }).publish_date ?? null;
              return (
              <article
                key={id}
                className="flyer lift-hover relative p-5 flex flex-col min-h-[340px] cursor-pointer"
                onClick={() => navigate({ page: 'crossword-play', id })}
              >
                <span
                  className={cn('flyer-tape', index % 2 === 0 ? 'left-[18%]' : 'alt left-[46%]')}
                  aria-hidden="true"
                />
                <div className="mb-4 flex justify-center py-3">
                  {puzzle.grid && puzzle.size ? (
                    <MiniGrid grid={puzzle.grid} size={puzzle.size} />
                  ) : (
                    <div className="w-24 h-24 border border-proddaily-border bg-proddaily-bg-2" />
                  )}
                </div>

                <h3 className="font-serif text-2xl text-proddaily-text mb-2">{puzzle.title}</h3>

                <div className="flex items-center gap-3 mb-4 text-xs text-proddaily-text-2">
                  <Badge variant={difficultyVariant[difficulty]}>
                    {difficulty}
                  </Badge>
                  {publishDate && (
                    <span className="flex items-center gap-1 uppercase tracking-wide">
                      <Calendar size={12} /> {formatDisplayDate(publishDate)}
                    </span>
                  )}
                </div>

                <Button
                  size="sm"
                  className="mt-auto w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ page: 'crossword-play', id });
                  }}
                >
                  Play
                </Button>
              </article>
              );
            })}
          </div>
        )}
      </div>
    </PublicPage>
  );
}
