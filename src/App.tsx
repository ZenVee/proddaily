import { ThemeProvider } from '@/state/ThemeContext';
import { RouterProvider, useRouter } from '@/state/RouterContext';
import { ToastProvider } from '@/state/ToastContext';
import { AuthProvider, useAuth } from '@/state/AuthContext';
import { ToastContainer } from '@/components/ui/Toast';
import { RequireStaff } from '@/components/auth/RequireStaff';
import { HomePage } from '@/pages/HomePage';
import { WordlePage } from '@/pages/WordlePage';
import { CrosswordPage } from '@/pages/CrosswordPage';
import { CrosswordPlayPage } from '@/pages/CrosswordPlayPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { ProfileSetupPage } from '@/pages/ProfileSetupPage';
import { ProfileEditPage } from '@/pages/ProfileEditPage';
import { PublicProfilePage } from '@/pages/PublicProfilePage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage';
import { AdminWordlePage } from '@/pages/admin/AdminWordlePage';
import { AdminCrosswordPage } from '@/pages/admin/AdminCrosswordPage';
import { AdminCrosswordEditPage } from '@/pages/admin/AdminCrosswordEditPage';
import { AdminAppearancePage } from '@/pages/admin/AdminAppearancePage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from '@/pages/admin/AdminUserDetailPage';
import { AdminAuditPage } from '@/pages/admin/AdminAuditPage';
import { useEffect, type ReactNode } from 'react';

function ProfileGate({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const { route, navigate } = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) return;
    if (profile.profile_setup_complete) return;
    if (route.page === 'profile-setup' || route.page === 'auth-callback' || route.page === 'login') return;
    navigate({ page: 'profile-setup' }, true);
  }, [user, profile, loading, route.page, navigate]);

  return <>{children}</>;
}

function RouteRenderer() {
  const { route } = useRouter();

  switch (route.page) {
    case 'home':
      return <HomePage />;
    case 'wordle':
      return <WordlePage />;
    case 'crossword':
      return <CrosswordPage />;
    case 'crossword-play':
      return <CrosswordPlayPage id={route.id} />;
    case 'auth-callback':
      return <AuthCallbackPage />;
    case 'profile-setup':
      return <ProfileSetupPage />;
    case 'profile-edit':
      return <ProfileEditPage />;
    case 'profile':
      return <PublicProfilePage id={route.id} />;
    case 'login':
      return <AdminLoginPage />;
    case 'admin-overview':
      return (
        <RequireStaff>
          <AdminOverviewPage />
        </RequireStaff>
      );
    case 'admin-wordle':
      return (
        <RequireStaff>
          <AdminWordlePage />
        </RequireStaff>
      );
    case 'admin-crossword':
      return (
        <RequireStaff>
          <AdminCrosswordPage />
        </RequireStaff>
      );
    case 'admin-crossword-edit':
      return (
        <RequireStaff>
          <AdminCrosswordEditPage id={route.id} />
        </RequireStaff>
      );
    case 'admin-appearance':
      return (
        <RequireStaff>
          <AdminAppearancePage />
        </RequireStaff>
      );
    case 'admin-settings':
      return (
        <RequireStaff>
          <AdminSettingsPage />
        </RequireStaff>
      );
    case 'admin-users':
      return (
        <RequireStaff>
          <AdminUsersPage />
        </RequireStaff>
      );
    case 'admin-user':
      return (
        <RequireStaff>
          <AdminUserDetailPage id={route.id} />
        </RequireStaff>
      );
    case 'admin-audit':
      return (
        <RequireStaff>
          <AdminAuditPage />
        </RequireStaff>
      );
    default:
      return <HomePage />;
  }
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider>
            <ProfileGate>
              <RouteRenderer />
              <ToastContainer />
            </ProfileGate>
          </RouterProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
