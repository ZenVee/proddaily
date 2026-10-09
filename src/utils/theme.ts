import type { AccentOption, AccentPreset } from '@/types';

export const ACCENT_PRESETS: Record<AccentPreset, AccentOption> = {
  tan: { id: 'tan', label: 'Tan', primary: '#D4B896', secondary: '#BFA582' },
  gold: { id: 'gold', label: 'Gold', primary: '#C9A84C', secondary: '#B8923A' },
  sage: { id: 'sage', label: 'Sage', primary: '#8BA888', secondary: '#7A9678' },
  'muted-blue': { id: 'muted-blue', label: 'Muted Blue', primary: '#7B9EC9', secondary: '#6A8CB8' },
  'steel-blue': { id: 'steel-blue', label: 'Steel Blue', primary: '#5B8DBE', secondary: '#4A7CAD' },
  purple: { id: 'purple', label: 'Purple', primary: '#A88BC9', secondary: '#9678B8' },
  rose: { id: 'rose', label: 'Rose', primary: '#C97B9E', secondary: '#B86A8D' },
  'burnt-orange': { id: 'burnt-orange', label: 'Burnt Orange', primary: '#C97B3C', secondary: '#B86A2A' },
  custom: { id: 'custom', label: 'Custom', primary: '#D4B896', secondary: '#BFA582' },
};

export const ACCENT_ORDER: AccentPreset[] = [
  'tan', 'gold', 'sage', 'muted-blue', 'steel-blue', 'purple', 'rose', 'burnt-orange', 'custom',
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

export function lightenHex(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 + percent / 100;
  const nr = Math.min(255, Math.round(r * factor));
  const ng = Math.min(255, Math.round(g * factor));
  const nb = Math.min(255, Math.round(b * factor));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}
