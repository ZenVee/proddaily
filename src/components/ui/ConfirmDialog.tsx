import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} showClose={false}>
      <div className="flex gap-4">
        {variant === 'danger' && (
          <div className="flex-shrink-0 w-10 h-10 rounded-street bg-red-950/40 border border-red-900/50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
        )}
        <p className="text-sm text-proddaily-text-2 flex-1">{message}</p>
      </div>
      <div className="flex gap-3 justify-end mt-6">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
