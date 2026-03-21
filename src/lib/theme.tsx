'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'blue' | 'purple' | 'green' | 'rose' | 'orange' | 'cyan' | 'custom';

interface ThemeContextType {
  mode: ThemeMode;
  accent: AccentColor;
  customColor: string;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setCustomColor: (color: string) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h / 360 + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h / 360) * 255);
  const b = Math.round(hue2rgb(p, q, h / 360 - 1/3) * 255);
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [accent, setAccentState] = useState<AccentColor>('blue');
  const [customColor, setCustomColorState] = useState('#6366f1');
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fin_theme');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mode) setModeState(parsed.mode);
        if (parsed.accent) setAccentState(parsed.accent);
        if (parsed.customColor) setCustomColorState(parsed.customColor);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Apply to DOM
  useEffect(() => {
    if (!loaded) return;
    document.documentElement.setAttribute('data-theme', mode);

    if (accent === 'custom') {
      document.documentElement.setAttribute('data-accent', 'custom');
      // Generate hover and light variants
      const { h, s, l } = hexToHsl(customColor);
      const hover = hslToHex(h, s, Math.max(0, l - 0.08));
      const lightBg = mode === 'dark'
        ? `rgba(${parseInt(customColor.slice(1,3),16)},${parseInt(customColor.slice(3,5),16)},${parseInt(customColor.slice(5,7),16)},0.1)`
        : hslToHex(h, s, 0.96);
      document.documentElement.style.setProperty('--accent', customColor);
      document.documentElement.style.setProperty('--accent-hover', hover);
      document.documentElement.style.setProperty('--accent-light', lightBg);
    } else {
      document.documentElement.setAttribute('data-accent', accent);
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--accent-hover');
      document.documentElement.style.removeProperty('--accent-light');
    }

    localStorage.setItem('fin_theme', JSON.stringify({ mode, accent, customColor }));
  }, [mode, accent, customColor, loaded]);

  function setMode(m: ThemeMode) { setModeState(m); }
  function setAccent(a: AccentColor) { setAccentState(a); }
  function setCustomColor(c: string) { setCustomColorState(c); setAccentState('custom'); }
  function toggleMode() { setModeState(prev => prev === 'light' ? 'dark' : 'light'); }

  return (
    <ThemeContext.Provider value={{ mode, accent, customColor, setMode, setAccent, setCustomColor, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
