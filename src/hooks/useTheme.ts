import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// 'system' is a special meta-theme that maps to light/dark based on OS preference
export type ThemeId = 'nike' | 'nike-volt' | 'arctic-pro' | 'light-minimal' | 'frost-minimal';
export type ThemePreference = ThemeId | 'system';

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
const DEFAULT_LIGHT_THEME: ThemeId = 'frost-minimal';
const DEFAULT_DARK_THEME: ThemeId = 'arctic-pro';
const VALID_THEME_IDS = themes.map(t => t.id);

// Check if a theme preference is 'system'
function isSystemPreference(pref: string | null): boolean {
  return pref === 'system';
}

// Get the resolved theme based on OS preference
function getSystemResolvedTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
}

// Apply theme to DOM - this is the core function
function applyThemeToDOM(themeId: ThemeId) {
  const root = document.documentElement;
  const body = document.body;

  // Remove all theme classes (html + body)
  themes.forEach(t => {
    root.classList.remove('theme-' + t.id);
    body?.classList.remove('theme-' + t.id);
  });

  // Add new theme class
  root.classList.add('theme-' + themeId);
  body?.classList.add('theme-' + themeId);

  // Handle dark/light mode
  const isLight = themeId === 'light-minimal' || themeId === 'frost-minimal';
  root.classList.toggle('dark', !isLight);
  root.classList.toggle('light', isLight);
  body?.classList.toggle('dark', !isLight);
  body?.classList.toggle('light', isLight);

  // Helpful for debugging + CSS targeting if needed
  root.setAttribute('data-theme', themeId);
  root.setAttribute('data-color-mode', isLight ? 'light' : 'dark');

  // Hint to the browser for native controls
  root.style.colorScheme = isLight ? 'light' : 'dark';

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[theme] applied', {
      themeId,
      htmlClass: root.className,
      bodyClass: body?.className,
      background: getComputedStyle(root).getPropertyValue('--background')?.trim(),
    });
  }
}

// Get initial theme preference from localStorage (fast, synchronous)
function getInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'system') return 'system';
    if (stored && VALID_THEME_IDS.includes(stored as ThemeId)) {
      return stored as ThemeId;
    }
  } catch (e) {
    console.warn('Failed to read theme from localStorage:', e);
  }
  
  return DEFAULT_THEME;
}

// Get the actual theme to apply (resolves 'system' to actual theme)
function getResolvedTheme(pref: ThemePreference): ThemeId {
  if (pref === 'system') {
    return getSystemResolvedTheme();
  }
  return pref;
}

// Initialize theme on module load (before React)
const initialPreference = getInitialPreference();
const initialTheme = getResolvedTheme(initialPreference);

// Apply theme immediately to prevent flash of wrong theme
if (typeof document !== 'undefined') {
  applyThemeToDOM(initialTheme);
}

interface ThemeContextType {
  currentTheme: ThemeId;
  themePreference: ThemePreference;
  setTheme: (themeId: ThemePreference, showToast?: boolean) => void;
  resetTheme: () => void;
  themes: Theme[];
  currentThemeData: Theme | undefined;
  isLoading: boolean;
  isSyncing: boolean;
  isSystemMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(initialPreference);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(initialTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (themePreference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
      setCurrentTheme(newTheme);
      applyThemeToDOM(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

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
          
          if (dbTheme === 'system') {
            setThemePreference('system');
            const resolved = getSystemResolvedTheme();
            setCurrentTheme(resolved);
            localStorage.setItem(THEME_STORAGE_KEY, 'system');
            applyThemeToDOM(resolved);
          } else if (VALID_THEME_IDS.includes(dbTheme as ThemeId)) {
            setThemePreference(dbTheme as ThemeId);
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
  const saveToDatabase = useCallback(async (pref: ThemePreference) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setIsSyncing(true);

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          user_id: user.id,
          key: THEME_DB_KEY,
          value: pref,
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

  const setTheme = useCallback((pref: ThemePreference, showToast = true) => {
    // Validate
    if (pref !== 'system' && !VALID_THEME_IDS.includes(pref)) {
      console.warn('Invalid theme preference:', pref);
      return;
    }
    
    setThemePreference(pref);
    
    const resolvedTheme = getResolvedTheme(pref);
    setCurrentTheme(resolvedTheme);
    
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
    
    applyThemeToDOM(resolvedTheme);
    saveToDatabase(pref);

    if (showToast) {
      if (pref === 'system') {
        toast({
          title: 'Vzhled změněn',
          description: 'Automatický režim (podle systému)',
        });
      } else {
        const themeData = themes.find(t => t.id === pref);
        toast({
          title: 'Vzhled změněn',
          description: themeData?.nameCs || themeData?.name,
        });
      }
    }
  }, [saveToDatabase]);

  const resetTheme = useCallback(() => {
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove theme from localStorage:', e);
    }
    setThemePreference(DEFAULT_THEME);
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
    themePreference,
    setTheme,
    resetTheme,
    themes,
    currentThemeData: themes.find(t => t.id === currentTheme),
    isLoading,
    isSyncing,
    isSystemMode: themePreference === 'system',
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
      themePreference: initialPreference,
      setTheme: (pref: ThemePreference) => {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, pref);
        } catch (e) {
          // ignore
        }
        applyThemeToDOM(getResolvedTheme(pref));
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
      isSystemMode: initialPreference === 'system',
    };
  }
  
  return context;
}
