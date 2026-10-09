import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ThemeState, AccentPreset } from '@/types';
import { ACCENT_PRESETS, isValidHex, lightenHex, hexToRgb } from '@/utils/theme';
import { loadJSON, saveJSON } from '@/utils/storage';

interface ThemeContextValue {
  theme: ThemeState;
  setPreset: (preset: AccentPreset) => void;
  setCustomHex: (hex: string) => void;
  restoreDefaults: () => void;
}

const DEFAULT_THEME: ThemeState = {
  preset: 'tan',
  primary: ACCENT_PRESETS.tan.primary,
  secondary: ACCENT_PRESETS.tan.secondary,
  customHex: '#D4B896',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const SITE_KEY = 'site-theme';
const VISITOR_KEY = 'visitor-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeState>(() => {
    return loadJSON<ThemeState>(VISITOR_KEY, DEFAULT_THEME);
  });

  useEffect(() => {
    applyTheme(theme);
    saveJSON(VISITOR_KEY, theme);
  }, [theme]);

  function applyTheme(t: ThemeState) {
    const root = document.documentElement;
    root.style.setProperty('--pd-accent', t.primary);
    root.style.setProperty('--pd-accent-2', t.secondary);
    const { r, g, b } = hexToRgb(t.primary);
    root.style.setProperty('--pd-accent-r', String(r));
    root.style.setProperty('--pd-accent-g', String(g));
    root.style.setProperty('--pd-accent-b', String(b));
  }

  function setPreset(preset: AccentPreset) {
    if (preset === 'custom') {
      setTheme((prev) => ({ ...prev, preset, primary: prev.customHex, secondary: lightenHex(prev.customHex, -10) }));
    } else {
      const opt = ACCENT_PRESETS[preset];
      setTheme({ preset, primary: opt.primary, secondary: opt.secondary, customHex: theme.customHex });
    }
  }

  function setCustomHex(hex: string) {
    if (!isValidHex(hex)) return;
    setTheme({ preset: 'custom', primary: hex, secondary: lightenHex(hex, -10), customHex: hex });
  }

  function restoreDefaults() {
    setTheme(DEFAULT_THEME);
  }

  return (
    <ThemeContext.Provider value={{ theme, setPreset, setCustomHex, restoreDefaults }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// Site default theme (admin-set, separate from visitor preference)
export function getSiteTheme(): ThemeState {
  return loadJSON<ThemeState>(SITE_KEY, DEFAULT_THEME);
}

export function setSiteTheme(t: ThemeState): void {
  saveJSON(SITE_KEY, t);
}
