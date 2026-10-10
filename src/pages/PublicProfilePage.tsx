import { useEffect, useState } from 'react';
import { PublicPage } from '@/components/layout/PublicPage';
import { avatarPublicUrl, getPublicProfile } from '@/services/profileService';
import { useAuth } from '@/state/AuthContext';
import { useRouter } from '@/state/RouterContext';
import { supabase } from '@/lib/supabase';
import { formatElapsed, localDateKey } from '@/utils/helpers';

interface Props {
  id: string;
}

export function PublicProfilePage({ id }: Props) {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<string[]>([]);

  const profileId = data?.id ? String(data.id) : null;
  const isOwn = Boolean(user?.id && profileId && user.id === profileId);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    setCalendar([]);

    getPublicProfile(id)
      .then((payload) => {
        if (cancelled) return;
        if (!payload) {
          setError('Profile not found');
          return;
        }
        const slug = payload.slug ? String(payload.slug) : null;
        if (slug && slug !== id.toLowerCase()) {
          navigate({ page: 'profile', id: slug }, true);
          return;
        }
        setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => {
    if (!isOwn || !profileId) return;
    supabase
      .from('gameplay_activity')
      .select('created_at')
      .eq('user_id', profileId)
      .in('event_type', ['wordle.completed', 'crossword.completed'])
      .order('created_at', { ascending: false })
      .limit(180)
      .then(({ data: rows }) => {
        setCalendar([...new Set((rows ?? []).map((r) => localDateKey(String(r.created_at))))]);
      });
  }, [isOwn, profileId]);

  if (error) {
    return (
      <PublicPage>
        <div className="max-w-md mx-auto py-24 text-center px-4">
          <span className="stencil mb-4 inline-block">404</span>
          <h1 className="heading-mark font-serif text-4xl text-proddaily-text mb-3">Not found</h1>
          <p className="text-proddaily-text-2">{error}</p>
        </div>
      </PublicPage>
    );
  }

  if (!data) {
    return (
      <PublicPage>
        <p className="text-center py-24 text-proddaily-text-2 tracking-widest font-serif">Loading…</p>
      </PublicPage>
    );
  }

  const wordle = (data.wordle ?? {}) as Record<string, number>;
  const crossword = (data.crossword ?? {}) as Record<string, number | null>;
  const avatar = avatarPublicUrl(
    data.custom_avatar_path as string | null,
    data.avatar_url as string | null
  );

  return (
    <PublicPage>
      <section className="hero-wall relative overflow-hidden border-b border-proddaily-border">
        <div className="hero-noise absolute inset-0 pointer-events-none" />
        <div className="hero-spray absolute inset-0 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-8">
            <div className="w-28 h-28 sm:w-36 sm:h-36 border-2 pd-accent-border bg-proddaily-card overflow-hidden shadow-[6px_6px_0_rgba(0,0,0,0.45)] shrink-0">
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-proddaily-bg-2" />
              )}
            </div>
            <div>
              <span className="stencil mb-3 inline-block">Player</span>
              <h1 className="font-display text-5xl sm:text-6xl text-proddaily-text leading-none tracking-wide break-words">
                {String(data.display_name)}
              </h1>
              <p className="mt-3 text-sm text-proddaily-text-2">Public record · no private IDs</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 gap-5 mb-12">
          <div className="flyer relative p-6">
            <span className="flyer-tape left-[18%]" aria-hidden="true" />
            <p className="font-serif text-xl tracking-widest mb-4">Wordle</p>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Played" value={String(wordle.games_played ?? 0)} />
              <Stat label="Win %" value={String(wordle.win_percentage ?? 0)} />
              <Stat label="Streak" value={String(wordle.current_streak ?? 0)} />
            </div>
            <p className="mt-4 text-xs text-proddaily-text-2">Best streak {wordle.longest_streak ?? 0}</p>
          </div>

          <div className="flyer relative p-6">
            <span className="flyer-tape alt left-[46%]" aria-hidden="true" />
            <p className="font-serif text-xl tracking-widest mb-4">Crossword</p>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Started" value={String(crossword.started ?? 0)} />
              <Stat label="Solved" value={String(crossword.completed ?? 0)} />
              <Stat
                label="Fastest"
                value={
                  crossword.fastest_seconds != null
                    ? formatElapsed(Number(crossword.fastest_seconds))
                    : '—'
                }
              />
            </div>
          </div>
        </div>

        {isOwn && calendar.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl text-proddaily-text mb-2">Activity</h2>
            <p className="text-sm text-proddaily-text-2 mb-4">Visible on your own public view.</p>
            <div className="flex flex-wrap gap-1.5 max-w-2xl">
              {calendar.map((d) => (
                <span
                  key={d}
                  title={d}
                  className="w-3.5 h-3.5 pd-accent-bg"
                  style={{ clipPath: 'polygon(10% 0, 100% 15%, 90% 100%, 0 85%)' }}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </PublicPage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-proddaily-text-2 mb-1">{label}</p>
      <p className="font-display text-3xl text-proddaily-text leading-none">{value}</p>
    </div>
  );
}
