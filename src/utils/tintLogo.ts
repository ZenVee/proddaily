import { hexToRgb } from '@/utils/theme';

/** Default logo tan (#D4B896) — pixels in this warm range get remapped. */
const TAN_R = 212;
const TAN_G = 184;
const TAN_B = 150;

function isTanPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 16) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Skip near-grayscale (white fill, black outline)
  if (max - min < 28) return false;
  // Warm beige/gold: R ≥ G ≥ B, mid lightness
  if (r < g - 8 || g < b - 12) return false;
  if (r < 90 || r > 250) return false;
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  if (lum < 0.22 || lum > 0.92) return false;
  // Prefer hues near the logo tan
  const warm = r - b;
  return warm > 20;
}

/**
 * Recolor tan/gold pixels in a logo image to `accentHex`, preserving white/black.
 * Returns a PNG data URL (scaled to `maxWidth` for performance).
 */
export function tintLogoTan(
  source: CanvasImageSource & { width: number; height: number },
  accentHex: string,
  maxWidth = 800,
): string {
  const { r: ar, g: ag, b: ab } = hexToRgb(accentHex);
  const scale = Math.min(1, maxWidth / source.width);
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(source, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const a = d[i + 3];
    if (!isTanPixel(r, g, b, a)) continue;

    // Preserve texture by scaling accent by pixel / reference tan
    d[i] = Math.min(255, Math.round(ar * (r / TAN_R)));
    d[i + 1] = Math.min(255, Math.round(ag * (g / TAN_G)));
    d[i + 2] = Math.min(255, Math.round(ab * (b / TAN_B)));
  }

  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}
