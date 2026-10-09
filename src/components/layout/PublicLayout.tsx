import { useState } from 'react';
import { Menu, X, Lock } from 'lucide-react';
import { useRouter } from '@/state/RouterContext';
import { useAuth } from '@/state/AuthContext';
import { cn } from '@/utils/helpers';
import { AppearanceControl } from '@/components/AppearanceControl';
import { UserMenu } from '@/components/UserMenu';
import { Wordmark } from '@/components/brand/Wordmark';
import type { Route } from '@/types';

export function PublicHeader() {
  const { route, navigate } = useRouter();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { label: string; route: Route }[] = [
    { label: 'Home', route: { page: 'home' } },
    { label: 'Wordle', route: { page: 'wordle' } },
    { label: 'Crosswords', route: { page: 'crossword' } },
  ];

  function isActive(page: string): boolean {
    return route.page === page || (page === 'crossword' && route.page === 'crossword-play');
  }

  function handleNav(r: Route) {
    navigate(r);
    setMobileOpen(false);
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-proddaily-bg/95 backdrop-blur-sm border-b border-proddaily-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => handleNav({ page: 'home' })} className="py-1" aria-label="PROD DAILY home">
            <Wordmark size="compact" />
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNav(item.route)}
                data-active={isActive(item.route.page)}
                className={cn(
                  'nav-stroke px-4 py-2 text-sm font-serif tracking-widest transition-colors',
                  isActive(item.route.page)
                    ? 'pd-accent-text'
                    : 'text-proddaily-text-2 hover:text-proddaily-text'
                )}
              >
                {item.label}
              </button>
            ))}
            <AppearanceControl />
            <span className="w-px h-5 bg-proddaily-border mx-1" />
            {user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => handleNav({ page: 'login' })}
                className="nav-stroke px-3 py-2 text-sm font-serif tracking-widest text-proddaily-text-2 hover:text-proddaily-text transition-colors flex items-center gap-1.5"
              >
                <Lock size={14} />
                Sign in
              </button>
            )}
          </nav>

          <div className="md:hidden flex items-center gap-2">
            {user && <UserMenu />}
            <button
              className="text-proddaily-text-2 hover:text-proddaily-text p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden bg-proddaily-bg-2 border-t border-proddaily-border animate-fade-in">
          <div className="px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNav(item.route)}
                className={cn(
                  'px-4 py-3 text-left font-serif text-lg tracking-widest transition-colors',
                  isActive(item.route.page)
                    ? 'pd-accent-text bg-proddaily-card'
                    : 'text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card'
                )}
              >
                {item.label}
              </button>
            ))}
            <div className="flex items-center justify-between px-2 py-3 border-t border-proddaily-border mt-2">
              <AppearanceControl />
              {!user && (
                <button
                  onClick={() => handleNav({ page: 'login' })}
                  className="font-serif text-sm tracking-widest text-proddaily-text-2 hover:text-proddaily-text transition-colors flex items-center gap-1.5"
                >
                  <Lock size={16} />
                  Sign in
                </button>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-proddaily-border bg-proddaily-bg-2 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <Wordmark size="footer" />
          <p className="text-xs text-proddaily-text-2 text-center sm:text-right">
            Daily word puzzles, custom crosswords, and more.
          </p>
        </div>
      </div>
    </footer>
  );
}
