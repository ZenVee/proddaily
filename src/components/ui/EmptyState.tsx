import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon ?? <AlertCircle size={32} className="text-proddaily-text-2 mb-3" />}
      <h3 className="font-serif text-xl text-proddaily-text mb-1">{title}</h3>
      {description && <p className="text-sm text-proddaily-text-2 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-proddaily-border border-t-proddaily-accent rounded-full animate-spin mb-3" />
      <p className="text-sm text-proddaily-text-2">{label}</p>
    </div>
  );
}
