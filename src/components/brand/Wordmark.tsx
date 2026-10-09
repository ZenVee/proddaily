import { useEffect, useState } from 'react';
import { cn } from '@/utils/helpers';
import { useTheme } from '@/state/ThemeContext';
import { loadImage, tintLogoTan } from '@/utils/tintLogo';

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

const LOGO_SRC = '/prod-daily-logo-big.png';
const DEFAULT_ACCENT = '#D4B896';

const LOGO_HEIGHT: Record<'compact' | 'footer', string> = {
  compact: 'h-10 sm:h-11',
  footer: 'h-9',
};

function AccentLogo({
  size,
  className,
}: {
  size: 'compact' | 'footer';
  className?: string;
}) {
  const { theme } = useTheme();
  const accent = theme.primary;
  const [src, setSrc] = useState(LOGO_SRC);

  useEffect(() => {
    let cancelled = false;

    if (accent.toLowerCase() === DEFAULT_ACCENT.toLowerCase()) {
      setSrc(LOGO_SRC);
      return;
    }

    loadImage(LOGO_SRC)
      .then((img) => {
        if (cancelled) return;
        const tinted = tintLogoTan(img, accent);
        if (tinted) setSrc(tinted);
      })
      .catch(() => {
        if (!cancelled) setSrc(LOGO_SRC);
      });

    return () => {
      cancelled = true;
    };
  }, [accent]);

  return (
    <img
      src={src}
      alt="PROD DAILY"
      className={cn(LOGO_HEIGHT[size], 'w-auto max-w-[min(100%,14rem)] object-contain object-left', className)}
    />
  );
}

export function Wordmark({ size = 'compact', className }: WordmarkProps) {
  if (size === 'compact' || size === 'footer') {
    return <AccentLogo size={size} className={className} />;
  }

  return (
    <span className={cn('wordmark', 'wordmark-hero', className)} role="img" aria-label="PROD DAILY">
      <Line letters={PROD} />
      <Line letters={DAILY} />
      <span className="wordmark-underline" aria-hidden="true" />
    </span>
  );
}
