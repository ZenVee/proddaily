import { useEffect, useRef, useState } from 'react';
import { Lock, LogOut, User } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { useRouter } from '@/state/RouterContext';
import { avatarPublicUrl } from '@/services/profileService';
import { cn } from '@/utils/helpers';

export function UserMenu() {
  const { profile, isStaff, signOut } = useAuth();
  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const avatar = avatarPublicUrl(profile?.custom_avatar_path, profile?.discord_avatar_url);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function go(page: 'profile-edit' | 'admin-overview') {
    setOpen(false);
    navigate({ page });
  }

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate({ page: 'home' });
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-street border border-proddaily-border overflow-hidden hover:pd-accent-border transition-colors focus:outline-none focus-visible:pd-accent-ring"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {avatar ? (
          <img src={avatar} alt="" className="w-8 h-8 object-cover" />
        ) : (
          <span className="w-8 h-8 flex items-center justify-center bg-proddaily-card text-proddaily-text-2">
            <User size={16} />
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 panel-concrete border border-proddaily-border rounded-street shadow-lg py-1 z-50 animate-fade-in"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => go('profile-edit')}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-serif tracking-wide',
              'text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card transition-colors'
            )}
          >
            <User size={14} />
            Profile
          </button>
          {isStaff && (
            <button
              type="button"
              role="menuitem"
              onClick={() => go('admin-overview')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-serif tracking-wide',
                'text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card transition-colors'
              )}
            >
              <Lock size={14} />
              Admin
            </button>
          )}
          <hr className="divider-rough my-1" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleSignOut()}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-serif tracking-wide',
              'text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card transition-colors'
            )}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
