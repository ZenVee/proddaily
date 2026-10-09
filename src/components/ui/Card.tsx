import type { ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-proddaily-card border border-proddaily-border rounded-street shadow-[0_10px_28px_rgba(0,0,0,0.28)]',
        hover && 'lift-hover cursor-pointer hover:pd-accent-border',
        className
      )}
    >
      {children}
    </div>
  );
}
