import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import { Camera, ExternalLink, Pencil, RotateCcw, X } from 'lucide-react';
import { PublicPage } from '@/components/layout/PublicPage';
import { Button } from '@/components/ui/Button';
import { AvatarCropModal } from '@/components/AvatarCropModal';
import { useAuth } from '@/state/AuthContext';
import { useRouter } from '@/state/RouterContext';
import { useToast } from '@/state/ToastContext';
import { supabase } from '@/lib/supabase';
import {
  avatarPublicUrl,
  removeCustomAvatar,
  updateOwnProfile,
  uploadCustomAvatar,
} from '@/services/profileService';
import type { CrosswordStatsRow, WordleStatsRow } from '@/types/database';
import { cn, formatElapsed, localDateKey } from '@/utils/helpers';
import { buildProfileSlug } from '@/utils/profileSlug';

function displayName(profile: {
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  discord_username: string | null;
}): string {
  if (profile.nickname?.trim()) return profile.nickname.trim();
  const full = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  return profile.discord_username ?? 'Player';
}

export function ProfileEditPage() {
  const { user, profile, role, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [stateId, setStateId] = useState(profile?.state_id ?? '');
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [loading, setLoading] = useState(false);
  const [wordle, setWordle] = useState<WordleStatsRow | null>(null);
  const [crossword, setCrossword] = useState<CrosswordStatsRow | null>(null);
  const [calendar, setCalendar] = useState<string[]>([]);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('wordle_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setWordle(data as WordleStatsRow | null));
    supabase
      .from('crossword_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setCrossword(data as CrosswordStatsRow | null));
    supabase
      .from('gameplay_activity')
      .select('created_at')
      .eq('user_id', user.id)
      .in('event_type', ['wordle.completed', 'crossword.completed'])
      .order('created_at', { ascending: false })
      .limit(180)
      .then(({ data: rows }) => {
        setCalendar([...new Set((rows ?? []).map((r) => localDateKey(String(r.created_at))))]);
      });
  }, [user?.id]);

  function syncFormFromProfile() {
    if (!profile) return;
    setFirstName(profile.first_name ?? '');
    setLastName(profile.last_name ?? '');
    setStateId(profile.state_id ?? '');
    setNickname(profile.nickname ?? '');
  }

  useEffect(() => {
    syncFormFromProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.first_name, profile?.last_name, profile?.state_id, profile?.nickname]);

  const avatar = avatarPublicUrl(profile?.custom_avatar_path, profile?.discord_avatar_url);

  function startEditing() {
    syncFormFromProfile();
    setEditing(true);
  }

  function cancelEditing() {
    syncFormFromProfile();
    setEditing(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateOwnProfile({ firstName, lastName, stateId, nickname });
      await refreshProfile();
      setEditing(false);
      toast('Profile updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  function onAvatarPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast('Only JPEG, PNG, WebP, and GIF images are allowed', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast('Image must be 8MB or smaller before cropping', 'error');
      return;
    }
    setCropFile(file);
  }

  async function onCropConfirm(blob: Blob) {
    if (!user) return;
    try {
      await uploadCustomAvatar(user.id, blob);
      await refreshProfile();
      setCropFile(null);
      toast('Avatar updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    }
  }

  async function clearAvatar() {
    if (!user) return;
    try {
      await removeCustomAvatar(user.id, profile?.custom_avatar_path ?? null);
      await refreshProfile();
      toast('Using Discord avatar', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not remove avatar', 'error');
    }
  }

  if (!user || !profile) {
    return (
      <PublicPage>
        <div className="max-w-md mx-auto py-24 text-center px-4">
          <span className="stencil mb-4 inline-block">Account</span>
          <h1 className="heading-mark font-serif text-4xl text-proddaily-text mb-3">Sign in required</h1>
          <p className="text-proddaily-text-2 mb-6">Your profile lives behind Discord sign-in.</p>
          <Button onClick={() => navigate({ page: 'login' })}>Sign in</Button>
        </div>
      </PublicPage>
    );
  }

  const name = displayName(profile);
  const legalName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || '—';
  const winPct =
    wordle && wordle.games_played > 0
      ? Math.round((wordle.games_won / wordle.games_played) * 100)
      : 0;
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';

  return (
    <PublicPage>
      <section className="hero-wall relative overflow-hidden border-b border-proddaily-border">
        <div className="hero-noise absolute inset-0 pointer-events-none" />
        <div className="hero-spray absolute inset-0 pointer-events-none" />

        <div className="absolute top-8 right-6 sm:right-12 hidden sm:block pointer-events-none rotate-6 opacity-80">
          <span className="stencil text-[0.65rem]">{editing ? 'Draft' : 'Filed'}</span>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-14 pb-8">
          <div className="grid lg:grid-cols-[auto_1fr] gap-8 lg:gap-10 items-start">
            {/* Mugshot */}
            <div className={`relative justify-self-start ${editing ? 'group' : ''}`}>
              <div className="w-36 h-44 sm:w-44 sm:h-52 border-2 border-[#2a2a2a] bg-proddaily-card overflow-hidden shadow-[8px_8px_0_rgba(0,0,0,0.5)] relative">
                <div className="absolute inset-x-0 top-0 h-1 pd-accent-bg z-10" />
                {avatar ? (
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-proddaily-bg-2 flex items-center justify-center">
                    <span className="font-display text-4xl text-proddaily-text-2/40">{name.slice(0, 1)}</span>
                  </div>
                )}
                {editing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-end pb-3 cursor-pointer bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs font-serif tracking-widest text-proddaily-text uppercase">
                      <Camera size={14} /> Photo
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={onAvatarPick}
                />
              </div>
              {role && (
                <div className="absolute -bottom-2 -right-3 rotate-[-8deg] border-2 border-red-800/70 text-red-400/90 px-2 py-1 bg-proddaily-bg/90">
                  <p className="font-serif text-[10px] tracking-[0.25em] uppercase leading-none">{roleLabel}</p>
                </div>
              )}
            </div>

            {/* Identity + dossier */}
            <div className="min-w-0 flex flex-col gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="stencil">Your wall</span>
                  {profile.discord_username && (
                    <span className="text-xs text-proddaily-text-2 tracking-wide">@{profile.discord_username}</span>
                  )}
                </div>
                <h1 className="font-display text-[clamp(2.75rem,8vw,4.75rem)] text-proddaily-text leading-[0.9] tracking-wide break-words">
                  {editing && nickname.trim() ? nickname.trim() : name}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!editing ? (
                    <Button size="sm" onClick={startEditing}>
                      <Pencil size={14} /> Edit
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                  onClick={() => {
                    const slug = buildProfileSlug(profile);
                    if (!slug) {
                      toast('Complete your profile details first', 'warning');
                      return;
                    }
                    navigate({ page: 'profile', id: slug });
                  }}
                >
                  <ExternalLink size={14} /> Public
                </Button>
                </div>
              </div>

              {/* Dossier plate — view or edit */}
              {editing ? (
                <form
                  onSubmit={handleSubmit}
                  className="relative torn-paper !bg-[#d8d0c2] p-5 sm:p-6 -rotate-1 shadow-[6px_8px_0_rgba(0,0,0,0.45)]"
                >
                  <p className="font-serif text-sm tracking-[0.2em] text-[#1a1814]/70 mb-4">AMEND RECORD</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-[10px] uppercase tracking-[0.18em] text-[#1a1814]/55 mb-1">First</span>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="w-full bg-[#efeae1] border border-[#1a1814]/25 px-3 py-2 text-[#1a1814] text-sm font-serif tracking-wide focus:outline-none focus:border-[#1a1814]"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[10px] uppercase tracking-[0.18em] text-[#1a1814]/55 mb-1">Last</span>
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="w-full bg-[#efeae1] border border-[#1a1814]/25 px-3 py-2 text-[#1a1814] text-sm font-serif tracking-wide focus:outline-none focus:border-[#1a1814]"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="block text-[10px] uppercase tracking-[0.18em] text-[#1a1814]/55 mb-1">Alias / nickname</span>
                      <input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Public display name"
                        className="w-full bg-[#efeae1] border border-[#1a1814]/25 px-3 py-2 text-[#1a1814] text-sm font-serif tracking-wide focus:outline-none focus:border-[#1a1814] placeholder:text-[#1a1814]/35"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="block text-[10px] uppercase tracking-[0.18em] text-[#1a1814]/55 mb-1">State ID</span>
                      <input
                        value={stateId}
                        onChange={(e) => setStateId(e.target.value)}
                        required
                        className="w-full bg-[#efeae1] border border-[#1a1814]/25 px-3 py-2 text-[#1a1814] text-sm font-serif tracking-wide focus:outline-none focus:border-[#1a1814]"
                      />
                    </label>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-ink px-4 py-2 text-sm font-serif tracking-widest bg-[#1a1814] text-[#d8d0c2] disabled:opacity-50"
                    >
                      {loading ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={loading}
                      className="btn-ink px-4 py-2 text-sm font-serif tracking-widest border border-[#1a1814]/40 text-[#1a1814]"
                    >
                      <span className="inline-flex items-center gap-1"><X size={14} /> Cancel</span>
                    </button>
                    {profile.custom_avatar_path && (
                      <button
                        type="button"
                        onClick={() => void clearAvatar()}
                        className="btn-ink px-3 py-2 text-xs font-serif tracking-widest text-[#1a1814]/70 inline-flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Discord photo
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div
                  className={cn(
                    'relative grid sm:grid-cols-2 gap-px bg-[#383838] border border-proddaily-border',
                    'shadow-[8px_8px_0_rgba(0,0,0,0.35)]'
                  )}
                >
                  <DossierCell label="Legal name" value={legalName} />
                  <DossierCell label="Alias" value={profile.nickname?.trim() || 'None filed'} />
                  <DossierCell label="State ID" value={profile.state_id || '—'} accent />
                  <DossierCell
                    label="Discord"
                    value={profile.discord_username ? `@${profile.discord_username}` : '—'}
                  />
                  <div className="sm:col-span-2 bg-proddaily-bg-2/90 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-proddaily-text-2">
                      Clearance · <span className="pd-accent-text">{roleLabel}</span>
                      <span className="text-proddaily-text-2/50"> · staff-assigned</span>
                    </p>
                    <button
                      type="button"
                      onClick={startEditing}
                      className="text-xs font-serif tracking-widest pd-accent-text hover:underline inline-flex items-center gap-1"
                    >
                      <Pencil size={12} /> Amend
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <h2 className="heading-mark font-serif text-3xl text-proddaily-text">Record</h2>
          <p className="text-sm text-proddaily-text-2 mt-2">Verified puzzle stats only.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mb-12">
          <div className="flyer relative p-6">
            <span className="flyer-tape left-[20%]" aria-hidden="true" />
            <p className="font-serif text-xl tracking-widest text-proddaily-text mb-4">Wordle</p>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Played" value={String(wordle?.games_played ?? 0)} />
              <Stat label="Win %" value={`${winPct}`} />
              <Stat label="Streak" value={String(wordle?.current_streak ?? 0)} />
            </div>
            <p className="mt-4 text-xs text-proddaily-text-2">
              Best streak {wordle?.longest_streak ?? 0}
              {wordle?.guess_distribution?.length
                ? ` · Dist ${wordle.guess_distribution.join('-')}`
                : ''}
            </p>
          </div>

          <div className="flyer relative p-6">
            <span className="flyer-tape alt left-[48%]" aria-hidden="true" />
            <p className="font-serif text-xl tracking-widest text-proddaily-text mb-4">Crossword</p>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Started" value={String(crossword?.started ?? 0)} />
              <Stat label="Solved" value={String(crossword?.completed ?? 0)} />
              <Stat
                label="Fastest"
                value={
                  crossword?.fastest_seconds != null
                    ? formatElapsed(crossword.fastest_seconds)
                    : '—'
                }
              />
            </div>
            <p className="mt-4 text-xs text-proddaily-text-2">
              Clean {crossword?.clean_completions ?? 0} · Assisted {crossword?.assisted_completions ?? 0}
            </p>
          </div>
        </div>

        {calendar.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl text-proddaily-text mb-2">Activity</h2>
            <p className="text-sm text-proddaily-text-2 mb-4">Days you finished a puzzle.</p>
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

      <AvatarCropModal
        open={!!cropFile}
        file={cropFile}
        onClose={() => setCropFile(null)}
        onConfirm={onCropConfirm}
      />
    </PublicPage>
  );
}

function DossierCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-proddaily-bg-2/95 px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-proddaily-text-2 mb-1.5">{label}</p>
      <p className={cn('font-serif text-lg tracking-wide text-proddaily-text', accent && 'pd-accent-text')}>
        {value}
      </p>
    </div>
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
