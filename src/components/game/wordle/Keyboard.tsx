import { cn } from '@/utils/helpers';
import { Delete } from 'lucide-react';
import type { LetterFeedback } from '@/types';
import { WORDLE_WORD_LENGTH } from '@/utils/wordleLogic';

interface KeyboardProps {
  onKey: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  letterStatus: Record<string, LetterFeedback>;
  disabled?: boolean;
}

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

export function Keyboard({ onKey, onEnter, onBackspace, letterStatus, disabled }: KeyboardProps) {
  function handleKey(key: string) {
    if (disabled) return;
    if (key === 'ENTER') return onEnter();
    if (key === 'BACK') return onBackspace();
    onKey(key);
  }

  const feedbackClasses: Record<LetterFeedback, string> = {
    correct: 'bg-green-700 text-white border-green-700 hover:bg-green-700',
    present: 'bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-600',
    absent: 'bg-proddaily-bg-2 text-proddaily-text-2/50 border-proddaily-border hover:bg-proddaily-bg-2',
  };

  return (
    <div className="w-full max-w-lg mx-auto select-none">
      {ROWS.map((row, i) => (
        <div key={i} className="flex gap-1 sm:gap-1.5 justify-center mb-1.5">
          {row.map((key) => {
            const isSpecial = key === 'ENTER' || key === 'BACK';
            const status = letterStatus[key];
            return (
              <button
                key={key}
                onClick={() => handleKey(key)}
                disabled={disabled}
                className={cn(
                  'h-12 sm:h-14 rounded-street font-semibold text-sm transition-colors disabled:opacity-50',
                  isSpecial ? 'px-2 sm:px-4 text-xs' : 'w-8 sm:w-10',
                  status
                    ? feedbackClasses[status]
                    : 'bg-proddaily-card text-proddaily-text border border-proddaily-border hover:bg-proddaily-card-2',
                  'flex items-center justify-center'
                )}
                aria-label={key === 'BACK' ? 'Backspace' : key === 'ENTER' ? 'Enter' : key}
              >
                {key === 'BACK' ? <Delete size={18} /> : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export { WORDLE_WORD_LENGTH };
