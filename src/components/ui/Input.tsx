import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const field =
  'w-full bg-proddaily-bg border border-proddaily-border rounded-street px-3.5 py-2.5 text-proddaily-text text-sm focus:outline-none focus:pd-accent-border focus-visible:pd-accent-ring placeholder:text-proddaily-text-2/50 transition-colors';

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block font-serif text-sm text-proddaily-text-2 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(field, error && 'border-red-800', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block font-serif text-sm text-proddaily-text-2 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(field, 'resize-none', error && 'border-red-800', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, children, className, id, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block font-serif text-sm text-proddaily-text-2 mb-1.5">
          {label}
        </label>
      )}
      <select id={id} className={cn(field, 'cursor-pointer', className)} {...props}>
        {children}
      </select>
    </div>
  );
}
