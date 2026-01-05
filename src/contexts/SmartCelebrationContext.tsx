import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

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
  celebrate: (type: CelebrationType, data: CelebrationData) => void;
  currentCelebration: CelebrationItem | null;
  dismissCurrent: () => void;
  pendingCount: number;
  mode: CelebrationMode;
  setMode: (mode: CelebrationMode) => void;
  hasNewCelebrations: boolean;
  clearNewFlag: () => void;
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
    };
  }
  return context;
}

interface SmartCelebrationProviderProps {
  children: ReactNode;
}

const CELEBRATION_DISPLAY_TIME = 5000; // 5 seconds

export function SmartCelebrationProvider({ children }: SmartCelebrationProviderProps) {
  const [queue, setQueue] = useState<CelebrationItem[]>([]);
  const [currentCelebration, setCurrentCelebration] = useState<CelebrationItem | null>(null);
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
      }}
    >
      {children}
    </SmartCelebrationContext.Provider>
  );
}
