import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  showClose?: boolean;
}

export function Modal({ open, onClose, title, children, className, showClose = true }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={cn(
          'street-modal relative border border-proddaily-border rounded-street shadow-2xl w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-proddaily-border">
            {title && <h2 className="font-serif text-2xl text-proddaily-text">{title}</h2>}
            {showClose && (
              <button
                onClick={onClose}
                className="text-proddaily-text-2 hover:text-proddaily-text transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
