import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { CelebrationOverlay } from '@/components/gamification/CelebrationOverlay';

export type CelebrationType = 'level-up' | 'badge' | 'pr' | 'streak';

export interface CelebrationData {
  level?: number;
  levelName?: string;
  badgeName?: string;
  badgeIcon?: string;
  badgeRarity?: string;
  xpBonus?: number;
  prName?: string;
  prValue?: string;
  streakWeeks?: number;
  description?: string;
}

export interface CelebrationItem {
  id: string;
  type: CelebrationType;
  data: CelebrationData;
  createdAt: number;
}

type CelebrationMode = 'toast' | 'fullscreen' | 'minimal';

interface SmartCelebrationContextType {
  // Smart celebration API (queue-based)
  celebrate: (type: CelebrationType, data: CelebrationData) => void;
  currentCelebration: CelebrationItem | null;
  dismissCurrent: () => void;
  pendingCount: number;
  mode: CelebrationMode;
  setMode: (mode: CelebrationMode) => void;
  hasNewCelebrations: boolean;
  clearNewFlag: () => void;
  // Legacy useCelebrations API (for backwards compatibility)
  showLevelUp: (level: number) => void;
  showBadge: (badgeName: string, badgeIcon?: string, badgeRarity?: string, xpBonus?: number) => void;
  showPR: (prName: string, prValue: string, xpBonus?: number) => void;
  showStreak: (streakWeeks: number, xpBonus?: number) => void;
}

const SmartCelebrationContext = createContext<SmartCelebrationContextType | null>(null);

export function useSmartCelebrations() {
  const context = useContext(SmartCelebrationContext);
  if (!context) {
    return {
      celebrate: () => {},
      currentCelebration: null,
      dismissCurrent: () => {},
      pendingCount: 0,
      mode: 'toast' as CelebrationMode,
      setMode: () => {},
      hasNewCelebrations: false,
      clearNewFlag: () => {},
      showLevelUp: () => {},
      showBadge: () => {},
      showPR: () => {},
      showStreak: () => {},
    };
  }
  return context;
}

// Legacy API - maintains backwards compatibility with CelebrationContext
export function useCelebrations() {
  const context = useContext(SmartCelebrationContext);
  if (!context) {
    // Return no-op functions if not in provider (trainer side)
    return {
      showLevelUp: () => {},
      showBadge: () => {},
      showPR: () => {},
      showStreak: () => {},
    };
  }
  return {
    showLevelUp: context.showLevelUp,
    showBadge: context.showBadge,
    showPR: context.showPR,
    showStreak: context.showStreak,
  };
}

interface SmartCelebrationProviderProps {
  children: ReactNode;
}

const CELEBRATION_DISPLAY_TIME = 5000; // 5 seconds

export function SmartCelebrationProvider({ children }: SmartCelebrationProviderProps) {
  const [queue, setQueue] = useState<CelebrationItem[]>([]);
  const [currentCelebration, setCurrentCelebration] = useState<CelebrationItem | null>(null);
  const [fullscreenCelebration, setFullscreenCelebration] = useState<{
    type: CelebrationType;
    data: CelebrationData;
  } | null>(null);
  const [mode, setModeState] = useState<CelebrationMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('celebration-mode');
      return (saved as CelebrationMode) || 'toast';
    }
    return 'toast';
  });
  const [hasNewCelebrations, setHasNewCelebrations] = useState(false);

  const setMode = useCallback((newMode: CelebrationMode) => {
    setModeState(newMode);
    localStorage.setItem('celebration-mode', newMode);
  }, []);

  const celebrate = useCallback((type: CelebrationType, data: CelebrationData) => {
    const item: CelebrationItem = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      data,
      createdAt: Date.now(),
    };
    
    setQueue(prev => [...prev, item]);
    setHasNewCelebrations(true);
  }, []);

  // Legacy API functions that trigger fullscreen overlay
  const showLevelUp = useCallback((level: number) => {
    setFullscreenCelebration({ type: 'level-up', data: { level } });
  }, []);

  const showBadge = useCallback((badgeName: string, badgeIcon?: string, badgeRarity?: string, xpBonus?: number) => {
    setFullscreenCelebration({ type: 'badge', data: { badgeName, badgeIcon, badgeRarity, xpBonus } });
  }, []);

  const showPR = useCallback((prName: string, prValue: string, xpBonus?: number) => {
    setFullscreenCelebration({ type: 'pr', data: { prName, prValue, xpBonus } });
  }, []);

  const showStreak = useCallback((streakWeeks: number, xpBonus?: number) => {
    setFullscreenCelebration({ type: 'streak', data: { streakWeeks, xpBonus } });
  }, []);

  const closeFullscreenCelebration = useCallback(() => {
    setFullscreenCelebration(null);
  }, []);

  const dismissCurrent = useCallback(() => {
    setCurrentCelebration(null);
  }, []);

  const clearNewFlag = useCallback(() => {
    setHasNewCelebrations(false);
  }, []);

  // Process queue - show next celebration
  useEffect(() => {
    if (currentCelebration || queue.length === 0) return;

    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrentCelebration(next);

    // Auto-dismiss after timeout
    const timer = setTimeout(() => {
      setCurrentCelebration(null);
    }, CELEBRATION_DISPLAY_TIME);

    return () => clearTimeout(timer);
  }, [currentCelebration, queue]);

  return (
    <SmartCelebrationContext.Provider 
      value={{ 
        celebrate, 
        currentCelebration, 
        dismissCurrent,
        pendingCount: queue.length,
        mode,
        setMode,
        hasNewCelebrations,
        clearNewFlag,
        showLevelUp,
        showBadge,
        showPR,
        showStreak,
      }}
    >
      {children}
      {fullscreenCelebration && (
        <CelebrationOverlay
          type={fullscreenCelebration.type}
          data={fullscreenCelebration.data}
          onClose={closeFullscreenCelebration}
        />
      )}
    </SmartCelebrationContext.Provider>
  );
}
