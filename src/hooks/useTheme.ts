import { useState, useEffect, useCallback } from 'react';

export type ThemeId = 'nike' | 'arctic-pro' | 'light-minimal';

export interface Theme {
  id: ThemeId;
  name: string;
  nameCs: string;
  description: string;
  descriptionCs: string;
  preview: {
    primary: string;
    background: string;
    card: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'nike',
    name: 'Nike',
    nameCs: 'Nike',
    description: 'Bold dark theme with warm orange accents',
    descriptionCs: 'Tmavý vzhled s teplými oranžovými akcenty',
    preview: {
      primary: '#f97316',
      background: '#0a0a0a',
      card: '#171717',
    },
  },
  {
    id: 'arctic-pro',
    name: 'Arctic Pro',
    nameCs: 'Arctic Pro',
    description: 'Cool dark theme with cyan accents',
    descriptionCs: 'Chladný tmavý vzhled s cyan akcenty',
    preview: {
      primary: '#00D4FF',
      background: '#0A0F14',
      card: '#0D1419',
    },
  },
  {
    id: 'light-minimal',
    name: 'Light Minimal',
    nameCs: 'Světlý minimální',
    description: 'Clean light theme with blue accents',
    descriptionCs: 'Čistý světlý vzhled s modrými akcenty',
    preview: {
      primary: '#3B82F6',
      background: '#F8FAFC',
      card: '#FFFFFF',
    },
  },
];

const THEME_STORAGE_KEY = 'app-theme';

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && themes.find(t => t.id === stored)) {
        return stored as ThemeId;
      }
    }
    return 'arctic-pro';
  });

  const applyTheme = useCallback((themeId: ThemeId) => {
    const root = document.documentElement;
    
    // Remove all theme classes
    themes.forEach(t => root.classList.remove(`theme-${t.id}`));
    
    // Add new theme class
    root.classList.add(`theme-${themeId}`);
    
    // Handle dark/light mode
    if (themeId === 'light-minimal') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, []);

  const setTheme = useCallback((themeId: ThemeId) => {
    setCurrentTheme(themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    applyTheme(themeId);
  }, [applyTheme]);

  // Apply theme on mount and changes
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme, applyTheme]);

  return {
    currentTheme,
    setTheme,
    themes,
    currentThemeData: themes.find(t => t.id === currentTheme),
  };
}
