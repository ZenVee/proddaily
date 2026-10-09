import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ToastMessage } from '@/types';
import { uid } from '@/utils/helpers';

interface ToastContextValue {
  toasts: ToastMessage[];
  toast: (message: string, type?: ToastMessage['type']) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = uid();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
