import type { ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'accent' | 'green' | 'yellow' | 'red' | 'blue';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-proddaily-bg-2 text-proddaily-text-2 border-proddaily-border',
    accent: 'pd-accent-bg text-proddaily-bg border-transparent',
    green: 'bg-green-950/60 text-green-400 border-green-900/50',
    yellow: 'bg-yellow-950/50 text-yellow-300 border-yellow-900/50',
    red: 'bg-red-950/50 text-red-300 border-red-900/50',
    blue: 'bg-blue-950/50 text-blue-300 border-blue-900/50',
  };

  return (
    <span
      className={cn(
        'tag-stamp inline-flex items-center px-2 py-0.5 text-xs border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
