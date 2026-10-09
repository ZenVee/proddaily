import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    'btn-ink inline-flex items-center justify-center font-serif rounded-street transition-colors duration-150 focus:outline-none focus-visible:pd-accent-ring disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'pd-accent-bg text-proddaily-bg hover:brightness-110',
    secondary:
      'bg-proddaily-bg-2 text-proddaily-text border border-proddaily-border hover:pd-accent-border',
    ghost: 'text-proddaily-text-2 hover:text-proddaily-text hover:bg-proddaily-card',
    danger: 'bg-red-950/50 text-red-300 border border-red-900/60 hover:bg-red-950/70',
  };

  const sizes = {
    sm: 'text-sm px-3 py-1.5 gap-1.5',
    md: 'text-base px-4 py-2.5 gap-2',
    lg: 'text-lg px-6 py-3 gap-2',
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
