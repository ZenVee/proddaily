import { PublicPage } from '@/components/layout/PublicPage';
import { Button } from '@/components/ui/Button';
import { Wordmark } from '@/components/brand/Wordmark';
import { useRouter } from '@/state/RouterContext';

function WordlePreview() {
  const letters = ['S', 'L', 'A', 'T', 'E'];
  return (
    <div className="flex gap-1.5 self-start" aria-hidden="true">
      {letters.map((letter, col) => (
        <div
          key={letter}
          className="w-10 h-10 border-2 flex items-center justify-center text-sm font-bold"
          style={{
            borderColor: col === 0 ? '#15803d' : col === 1 ? '#ca8a04' : '#4a4a4a',
            backgroundColor: col === 0 ? '#15803d' : col === 1 ? '#a16207' : '#2a2a2a',
            color: col < 2 ? '#fff' : '#F5F3EF',
          }}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

function CrosswordPreview() {
  const rows = [
    [1, 1, 1, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 1],
    [1, 1, 1, 1, 1],
  ];
  return (
    <div className="inline-block self-start border border-[#1a1a1a] bg-[#efeae1]" aria-hidden="true">
      {rows.map((row, r) => (
        <div key={r} className="flex">
          {row.map((open, c) => (
            <div
              key={c}
              className={`relative w-7 h-7 border border-[#1a1a1a]/70 ${open ? 'bg-[#f7f3eb]' : 'bg-[#161616]'}`}
            >
              {open && r === 0 && c === 0 ? (
                <span className="absolute top-0 left-0.5 text-[7px] leading-none text-[#333]">1</span>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function HomePage() {
  const { navigate } = useRouter();

  return (
    <PublicPage>
      <section className="hero-wall relative overflow-hidden border-b border-proddaily-border">
        <div className="hero-noise absolute inset-0 pointer-events-none" />
        <div className="hero-spray absolute inset-0 pointer-events-none" />

        <svg
          className="absolute left-[6%] top-[18%] w-16 h-16 text-[var(--pd-accent)] opacity-70 hidden sm:block pointer-events-none"
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden="true"
        >
          <path d="M8 48 C22 18, 40 22, 58 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M48 8 L62 14 L46 22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="absolute top-8 left-6 sm:left-10 hidden sm:block pointer-events-none">
          <span className="stencil">Wall 04</span>
        </div>
        <div className="torn-paper absolute top-10 right-[7%] hidden md:block w-32 rotate-3 px-3 py-3 pointer-events-none">
          <p className="font-serif text-lg leading-none">Fresh drop</p>
          <p className="text-[10px] tracking-widest uppercase mt-1 opacity-70">Daily only</p>
        </div>
        <div className="absolute bottom-8 right-8 hidden lg:block pointer-events-none opacity-60">
          <span className="stencil">No. 001</span>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <Wordmark size="hero" className="mx-auto" />
          <h2 className="heading-mark font-serif text-3xl sm:text-5xl text-proddaily-text mt-8">
            New day. New challenge.
          </h2>
          <p className="text-base sm:text-lg text-proddaily-text-2 max-w-md mx-auto mt-4">
            Daily word puzzles, custom crosswords, and more.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-6">
          <article className="flyer lift-hover relative p-6 sm:p-7 flex flex-col min-h-[320px]">
            <span className="flyer-tape left-[22%]" aria-hidden="true" />
            <span className="stencil mb-4 w-fit">01</span>
            <WordlePreview />
            <h2 className="font-serif text-4xl text-proddaily-text mt-5">Daily Wordle</h2>
            <p className="text-sm text-proddaily-text-2 mt-2 mb-6">One word. Six tries. Every day.</p>
            <Button className="mt-auto w-full" onClick={() => navigate({ page: 'wordle' })}>
              Play Now
            </Button>
          </article>

          <article className="flyer lift-hover relative p-6 sm:p-7 flex flex-col min-h-[320px]">
            <span className="flyer-tape alt left-[48%]" aria-hidden="true" />
            <span className="stencil mb-4 w-fit">02</span>
            <CrosswordPreview />
            <h2 className="font-serif text-4xl text-proddaily-text mt-5">Crosswords</h2>
            <p className="text-sm text-proddaily-text-2 mt-2 mb-6">Fresh puzzles. Your next challenge.</p>
            <Button className="mt-auto w-full" onClick={() => navigate({ page: 'crossword' })}>
              Browse Puzzles
            </Button>
          </article>
        </div>
      </section>
    </PublicPage>
  );
}
