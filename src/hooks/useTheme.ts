import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
const THEME_DB_KEY = 'user_theme';
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
}

// Get initial theme from localStorage (fast, synchronous)
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

// Initialize theme on module load (before React)
const initialTheme = getInitialTheme();
// Apply theme immediately to prevent flash of wrong theme
if (typeof document !== 'undefined') {
  applyThemeToDOM(initialTheme);
}

interface ThemeContextType {
  currentTheme: ThemeId;
  setTheme: (themeId: ThemeId, showToast?: boolean) => void;
  resetTheme: () => void;
  themes: Theme[];
  currentThemeData: Theme | undefined;
  isLoading: boolean;
  isSyncing: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(initialTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync theme from database on mount (for logged-in users)
  useEffect(() => {
    const syncFromDatabase = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', THEME_DB_KEY)
          .maybeSingle();

        if (!error && data?.value) {
          const dbTheme = data.value as string;
          if (VALID_THEME_IDS.includes(dbTheme as ThemeId)) {
            setCurrentTheme(dbTheme as ThemeId);
            localStorage.setItem(THEME_STORAGE_KEY, dbTheme);
            applyThemeToDOM(dbTheme as ThemeId);
          }
        }
      } catch (e) {
        console.warn('Failed to sync theme from database:', e);
      } finally {
        setIsLoading(false);
      }
    };

    syncFromDatabase();
  }, []);

  // Save theme to database
  const saveToDatabase = useCallback(async (themeId: ThemeId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setIsSyncing(true);

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          user_id: user.id,
          key: THEME_DB_KEY,
          value: themeId,
          description: 'User preferred theme',
        }, {
          onConflict: 'user_id,key',
        });

      if (error) {
        console.warn('Failed to save theme to database:', error);
      }
    } catch (e) {
      console.warn('Failed to save theme to database:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const setTheme = useCallback((themeId: ThemeId, showToast = true) => {
    if (!VALID_THEME_IDS.includes(themeId)) {
      console.warn('Invalid theme ID:', themeId);
      return;
    }
    
    setCurrentTheme(themeId);
    
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
    
    applyThemeToDOM(themeId);
    saveToDatabase(themeId);

    if (showToast) {
      const themeData = themes.find(t => t.id === themeId);
      toast({
        title: 'Vzhled změněn',
        description: themeData?.nameCs || themeData?.name,
      });
    }
  }, [saveToDatabase]);

  const resetTheme = useCallback(() => {
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove theme from localStorage:', e);
    }
    setCurrentTheme(DEFAULT_THEME);
    applyThemeToDOM(DEFAULT_THEME);
    saveToDatabase(DEFAULT_THEME);

    toast({
      title: 'Vzhled resetován',
      description: 'Výchozí téma bylo obnoveno',
    });
  }, [saveToDatabase]);

  const value: ThemeContextType = {
    currentTheme,
    setTheme,
    resetTheme,
    themes,
    currentThemeData: themes.find(t => t.id === currentTheme),
    isLoading,
    isSyncing,
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
      isLoading: false,
      isSyncing: false,
    };
  }
  
  return context;
}
