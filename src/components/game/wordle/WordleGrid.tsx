import { cn } from '@/utils/helpers';
import type { LetterFeedback } from '@/types';
import { evaluateGuess, WORDLE_WORD_LENGTH, WORDLE_MAX_GUESSES } from '@/utils/wordleLogic';

interface TileProps {
  letter: string;
  feedback?: LetterFeedback | null;
  index: number;
  isRevealing?: boolean;
  isCurrentRow?: boolean;
}

export function Tile({ letter, feedback, index, isRevealing, isCurrentRow }: TileProps) {
  const feedbackClasses: Record<LetterFeedback, string> = {
    correct: 'bg-green-700 text-white border-green-700',
    present: 'bg-yellow-600 text-white border-yellow-600',
    absent: 'bg-[#3a3a3a] text-white border-[#3a3a3a]',
  };

  const isEmpty = !letter;

  return (
    <div
      className={cn(
        'w-14 h-14 sm:w-16 sm:h-16 border-2 rounded-street flex items-center justify-center font-bold text-2xl uppercase select-none transition-colors duration-150',
        isEmpty
          ? 'border-[#5a5a5a] bg-[#2a2a2a] text-proddaily-text'
          : feedback
            ? feedbackClasses[feedback]
            : 'border-[#5a5a5a] bg-proddaily-card text-proddaily-text',
        letter && !feedback && 'animate-tile-pop',
        isRevealing && 'animate-tile-flip',
        isCurrentRow && isEmpty && 'border-proddaily-text-2'
      )}
      style={isRevealing ? { animationDelay: `${index * 150}ms` } : undefined}
    >
      {letter}
    </div>
  );
}

interface GridProps {
  guesses: string[];
  currentGuess: string;
  answer?: string | null;
  feedbackRows?: LetterFeedback[][];
  revealingRow: number | null;
  isCurrentRow: boolean;
}

export function WordleGrid({
  guesses,
  currentGuess,
  answer,
  feedbackRows,
  revealingRow,
  isCurrentRow,
}: GridProps) {
  const rows = Array.from({ length: WORDLE_MAX_GUESSES }, (_, i) => {
    if (i < guesses.length) {
      const guess = guesses[i];
      const feedback =
        feedbackRows?.[i] ??
        (answer ? evaluateGuess(guess, answer) : undefined);
      return (
        <div key={i} className="flex gap-1.5">
          {Array.from({ length: WORDLE_WORD_LENGTH }, (_, j) => (
            <Tile
              key={j}
              letter={guess[j] ?? ''}
              feedback={feedback?.[j]}
              index={j}
              isRevealing={revealingRow === i}
            />
          ))}
        </div>
      );
    }

    if (i === guesses.length) {
      return (
        <div key={i} className="flex gap-1.5">
          {Array.from({ length: WORDLE_WORD_LENGTH }, (_, j) => (
            <Tile
              key={j}
              letter={currentGuess[j] ?? ''}
              index={j}
              isCurrentRow={isCurrentRow}
            />
          ))}
        </div>
      );
    }

    return (
      <div key={i} className="flex gap-1.5">
        {Array.from({ length: WORDLE_WORD_LENGTH }, (_, j) => (
          <Tile key={j} letter="" index={j} />
        ))}
      </div>
    );
  });

  return <div className="flex flex-col gap-1.5">{rows}</div>;
}
