import { cn } from '@/utils/helpers';

interface WordmarkProps {
  size?: 'compact' | 'footer' | 'hero';
  className?: string;
}

const PROD = [
  { ch: 'P', y: 0, r: -1.4 },
  { ch: 'R', y: 1, r: 0.8 },
  { ch: 'O', y: -1, r: -0.4 },
  { ch: 'D', y: 1, r: 1.2, drip: true },
];

const DAILY = [
  { ch: 'D', y: 0, r: 0.7 },
  { ch: 'A', y: -1, r: -1 },
  { ch: 'I', y: 1, r: 0.4 },
  { ch: 'L', y: 0, r: -0.6 },
  { ch: 'Y', y: 1, r: 1.3, drip: true },
];

function Line({
  letters,
  compact,
}: {
  letters: typeof PROD;
  compact?: boolean;
}) {
  return (
    <span className="wordmark-line" aria-hidden="true">
      {letters.map((letter) => (
        <span
          key={letter.ch + letter.r}
          className={cn('wordmark-ch', letter.drip && !compact && 'drip')}
          style={
            compact
              ? undefined
              : { transform: `translateY(${letter.y}px) rotate(${letter.r}deg)` }
          }
        >
          {letter.ch}
        </span>
      ))}
    </span>
  );
}

export function Wordmark({ size = 'compact', className }: WordmarkProps) {
  const compact = size !== 'hero';

  return (
    <span className={cn('wordmark', `wordmark-${size}`, className)} role="img" aria-label="PROD DAILY">
      <Line letters={PROD} compact={compact} />
      <Line letters={DAILY} compact={compact} />
      <span className="wordmark-underline" aria-hidden="true" />
    </span>
  );
}
