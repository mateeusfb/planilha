'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'blue' | 'purple' | 'green' | 'rose' | 'orange' | 'cyan';

interface ThemeContextType {
  mode: ThemeMode;
  accent: AccentColor;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [accent, setAccentState] = useState<AccentColor>('blue');
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fin_theme');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mode) setModeState(parsed.mode);
        if (parsed.accent) setAccentState(parsed.accent);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Apply to DOM
  useEffect(() => {
    if (!loaded) return;
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('fin_theme', JSON.stringify({ mode, accent }));
  }, [mode, accent, loaded]);

  function setMode(m: ThemeMode) { setModeState(m); }
  function setAccent(a: AccentColor) { setAccentState(a); }
  function toggleMode() { setModeState(prev => prev === 'light' ? 'dark' : 'light'); }

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
