import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type ThemeId = 'nike' | 'nike-volt' | 'arctic-pro' | 'light-minimal' | 'frost-minimal';

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
    name: 'Nike Orange',
    nameCs: 'Nike Oranžová',
    description: 'Bold dark theme with warm orange accents',
    descriptionCs: 'Tmavý vzhled s teplými oranžovými akcenty',
    preview: {
      primary: '#f97316',
      background: '#0a0a0a',
      card: '#171717',
    },
  },
  {
    id: 'nike-volt',
    name: 'Nike Volt',
    nameCs: 'Nike Volt',
    description: 'Electric dark theme with neon green accents',
    descriptionCs: 'Elektrický tmavý vzhled s neonově zelenými akcenty',
    preview: {
      primary: '#CCFF00',
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
    id: 'frost-minimal',
    name: 'Frost Minimal',
    nameCs: 'Frost Minimal',
    description: 'Elegant light theme with icy blue accents',
    descriptionCs: 'Elegantní světlý vzhled s ledově modrými akcenty',
    preview: {
      primary: '#0EA5E9',
      background: '#F0F9FF',
      card: '#FFFFFF',
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
const DEFAULT_THEME: ThemeId = 'arctic-pro';
const VALID_THEME_IDS = themes.map(t => t.id);

// Apply theme to DOM - this is the core function
function applyThemeToDOM(themeId: ThemeId) {
  const root = document.documentElement;
  
  // Remove all theme classes
  themes.forEach(t => root.classList.remove('theme-' + t.id));
  
  // Add new theme class
  root.classList.add('theme-' + themeId);
  
  // Handle dark/light mode
  if (themeId === 'light-minimal' || themeId === 'frost-minimal') {
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
  }
  
  console.log('[Theme] Applied theme:', themeId, 'Classes:', root.className);
}

// Get initial theme from localStorage
function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && VALID_THEME_IDS.includes(stored as ThemeId)) {
      return stored as ThemeId;
    }
  } catch (e) {
    console.warn('Failed to read theme from localStorage:', e);
  }
  
  return DEFAULT_THEME;
}

// Initialize theme on module load
const initialTheme = getInitialTheme();
if (typeof window !== 'undefined') {
  applyThemeToDOM(initialTheme);
}

interface ThemeContextType {
  currentTheme: ThemeId;
  setTheme: (themeId: ThemeId) => void;
  resetTheme: () => void;
  themes: Theme[];
  currentThemeData: Theme | undefined;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(initialTheme);

  const setTheme = useCallback((themeId: ThemeId) => {
    if (!VALID_THEME_IDS.includes(themeId)) {
      console.warn('Invalid theme ID:', themeId);
      return;
    }
    
    console.log('[Theme] Setting theme to:', themeId);
    setCurrentTheme(themeId);
    
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
    
    applyThemeToDOM(themeId);
  }, []);

  const resetTheme = useCallback(() => {
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove theme from localStorage:', e);
    }
    setCurrentTheme(DEFAULT_THEME);
    applyThemeToDOM(DEFAULT_THEME);
  }, []);

  // Apply theme on mount
  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, []);

  const value: ThemeContextType = {
    currentTheme,
    setTheme,
    resetTheme,
    themes,
    currentThemeData: themes.find(t => t.id === currentTheme),
  };

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  // Fallback for components outside provider (shouldn't happen but safe)
  if (!context) {
    console.warn('useTheme used outside ThemeProvider, using fallback');
    return {
      currentTheme: initialTheme,
      setTheme: (themeId: ThemeId) => {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, themeId);
        } catch (e) {
          // ignore
        }
        applyThemeToDOM(themeId);
      },
      resetTheme: () => {
        try {
          localStorage.removeItem(THEME_STORAGE_KEY);
        } catch (e) {
          // ignore
        }
        applyThemeToDOM(DEFAULT_THEME);
      },
      themes,
      currentThemeData: themes.find(t => t.id === initialTheme),
    };
  }
  
  return context;
}
