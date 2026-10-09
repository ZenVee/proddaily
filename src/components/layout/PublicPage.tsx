import type { ReactNode } from 'react';
import { PublicHeader, PublicFooter } from './PublicLayout';

interface PublicPageProps {
  children: ReactNode;
  showFooter?: boolean;
}

export function PublicPage({ children, showFooter = true }: PublicPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-transparent overflow-x-hidden">
      <PublicHeader />
      <main className="flex-1 pt-16 animate-fade-in">{children}</main>
      {showFooter && <PublicFooter />}
    </div>
  );
}
