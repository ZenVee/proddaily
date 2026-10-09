import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/state/ToastContext';
import { cn } from '@/utils/helpers';

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 px-4 py-3 rounded-street border bg-proddaily-card shadow-xl animate-slide-up',
            t.type === 'success' && 'border-green-900/50',
            t.type === 'error' && 'border-red-900/50',
            t.type === 'warning' && 'border-yellow-900/50',
            t.type === 'info' && 'border-proddaily-border'
          )}
        >
          {t.type === 'success' && <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />}
          {t.type === 'error' && <XCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />}
          {t.type === 'warning' && <AlertTriangle size={18} className="text-yellow-500 mt-0.5 flex-shrink-0" />}
          {t.type === 'info' && <Info size={18} className="pd-accent-text mt-0.5 flex-shrink-0" />}
          <p className="text-sm text-proddaily-text flex-1">{t.message}</p>
          <button
            onClick={() => dismiss(t.id)}
            className="text-proddaily-text-2 hover:text-proddaily-text flex-shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
