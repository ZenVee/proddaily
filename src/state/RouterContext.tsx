import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Route } from '@/types';

interface RouterContextValue {
  route: Route;
  navigate: (route: Route, replace?: boolean) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function pathToRoute(pathname: string): Route {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);

  if (parts.length === 0) return { page: 'home' };
  if (parts[0] === 'wordle') return { page: 'wordle' };
  if (parts[0] === 'crossword' && parts[1]) return { page: 'crossword-play', id: parts[1] };
  if (parts[0] === 'crossword') return { page: 'crossword' };
  if (parts[0] === 'login' || (parts[0] === 'admin' && parts[1] === 'login')) return { page: 'login' };
  if (parts[0] === 'auth' && parts[1] === 'callback') return { page: 'auth-callback' };
  if (parts[0] === 'profile' && parts[1] === 'setup') return { page: 'profile-setup' };
  if (parts[0] === 'profile' && parts[1] === 'edit') return { page: 'profile-edit' };
  if (parts[0] === 'profile' && parts[1]) return { page: 'profile', id: parts[1] };
  if (parts[0] === 'profile') return { page: 'profile-edit' };
  if (parts[0] === 'admin') {
    if (!parts[1]) return { page: 'admin-overview' };
    if (parts[1] === 'overview') return { page: 'admin-overview' };
    if (parts[1] === 'wordle') return { page: 'admin-wordle' };
    if (parts[1] === 'crossword' && parts[2] === 'edit') {
      return { page: 'admin-crossword-edit', id: parts[3] ?? null };
    }
    if (parts[1] === 'crossword' && parts[2] === 'new') {
      return { page: 'admin-crossword-edit', id: null };
    }
    if (parts[1] === 'crossword') return { page: 'admin-crossword' };
    if (parts[1] === 'appearance') return { page: 'admin-appearance' };
    if (parts[1] === 'settings') return { page: 'admin-settings' };
    if (parts[1] === 'users' && parts[2]) return { page: 'admin-user', id: parts[2] };
    if (parts[1] === 'users') return { page: 'admin-users' };
    if (parts[1] === 'audit') return { page: 'admin-audit' };
    return { page: 'admin-overview' };
  }
  return { page: 'home' };
}

function routeToPath(route: Route): string {
  switch (route.page) {
    case 'home':
      return '/';
    case 'wordle':
      return '/wordle';
    case 'crossword':
      return '/crossword';
    case 'crossword-play':
      return `/crossword/${route.id}`;
    case 'auth-callback':
      return '/auth/callback';
    case 'profile-setup':
      return '/profile/setup';
    case 'profile-edit':
      return '/profile/edit';
    case 'profile':
      return `/profile/${route.id}`;
    case 'login':
      return '/login';
    case 'admin':
    case 'admin-overview':
      return '/admin/overview';
    case 'admin-wordle':
      return '/admin/wordle';
    case 'admin-crossword':
      return '/admin/crossword';
    case 'admin-crossword-edit':
      return route.id ? `/admin/crossword/edit/${route.id}` : '/admin/crossword/new';
    case 'admin-appearance':
      return '/admin/appearance';
    case 'admin-settings':
      return '/admin/settings';
    case 'admin-users':
      return '/admin/users';
    case 'admin-user':
      return `/admin/users/${route.id}`;
    case 'admin-audit':
      return '/admin/audit';
    default:
      return '/';
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => pathToRoute(window.location.pathname));

  useEffect(() => {
    function onPop() {
      setRoute(pathToRoute(window.location.pathname));
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(r: Route, replace = false) {
    const path = routeToPath(r);
    if (replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    setRoute(r);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <RouterContext.Provider value={{ route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
