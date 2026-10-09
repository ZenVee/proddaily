import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Type,
  Grid3x3,
  Palette,
  Settings,
  Menu,
  X,
  ArrowLeft,
  ChevronLeft,
  Users,
  ScrollText,
  LogOut,
} from 'lucide-react';
import { useRouter } from '@/state/RouterContext';
import { useAuth } from '@/state/AuthContext';
import { cn } from '@/utils/helpers';
import { Wordmark } from '@/components/brand/Wordmark';
import type { Route } from '@/types';

interface AdminLayoutProps {
  children: ReactNode;
  current: string;
}

interface NavItem {
  label: string;
  route: Route;
  icon: typeof LayoutDashboard;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', route: { page: 'admin-overview' }, icon: LayoutDashboard },
  { label: 'Users', route: { page: 'admin-users' }, icon: Users, permission: 'users.view' },
  { label: 'Wordle Manager', route: { page: 'admin-wordle' }, icon: Type, permission: 'wordle.view' },
  { label: 'Crossword Maker', route: { page: 'admin-crossword' }, icon: Grid3x3, permission: 'crosswords.view' },
  { label: 'Audit', route: { page: 'admin-audit' }, icon: ScrollText, permission: 'audit.view' },
  { label: 'Appearance', route: { page: 'admin-appearance' }, icon: Palette, permission: 'appearance.manage' },
  { label: 'Settings', route: { page: 'admin-settings' }, icon: Settings, permission: 'settings.manage' },
];

export function AdminLayout({ children, current }: AdminLayoutProps) {
  const { navigate } = useRouter();
  const { hasPermission, signOut, role } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const visible = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));

  function handleNav(r: Route) {
    navigate(r);
    setMobileOpen(false);
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className={cn('flex items-center px-4 h-16 border-b border-proddaily-border', collapsed && 'justify-center px-2')}>
        {collapsed ? (
          <span className="font-display text-xl pd-accent-text tracking-wide">PD</span>
        ) : (
          <Wordmark size="compact" />
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center py-2 text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft size={18} className={cn('transition-transform', collapsed && 'rotate-180')} />
      </button>
      <hr className="divider-rough" />

      <nav className="flex-1 py-4 px-2 overflow-y-auto scrollbar-thin">
        {visible.map((item) => {
          const active = current === item.label;
          return (
            <button
              key={item.label}
              onClick={() => handleNav(item.route)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm font-serif tracking-wide transition-colors mb-1 border-l-2',
                collapsed && 'justify-center px-2',
                active
                  ? 'pd-accent-text bg-proddaily-card pd-accent-border'
                  : 'text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card border-transparent'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={16} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <hr className="divider-rough" />
      <div className="p-2 space-y-1">
        {!collapsed && (
          <p className="px-3 text-xs text-proddaily-text-2 capitalize mb-1">{role ?? 'staff'}</p>
        )}
        <button
          onClick={() => navigate({ page: 'home' })}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-serif tracking-wide text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Back to Site' : undefined}
        >
          <ArrowLeft size={16} className="flex-shrink-0" />
          {!collapsed && <span>Back to Site</span>}
        </button>
        <button
          onClick={() => signOut().then(() => navigate({ page: 'home' }))}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-serif tracking-wide text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex admin-shell">
      <aside
        className={cn(
          'hidden lg:flex flex-col sidebar-industrial border-r border-proddaily-border fixed inset-y-0 left-0 z-30',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 sidebar-industrial border-r border-proddaily-border animate-slide-up">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 text-proddaily-text-2 hover:text-proddaily-text"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className={cn('flex-1 flex flex-col min-w-0', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        <div className="lg:hidden flex items-center justify-between h-16 px-4 border-b border-proddaily-border bg-proddaily-bg-2 sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-proddaily-text-2 hover:text-proddaily-text"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <Wordmark size="footer" />
        </div>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
