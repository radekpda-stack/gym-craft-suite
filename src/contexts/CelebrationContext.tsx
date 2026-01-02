import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CelebrationOverlay } from '@/components/gamification/CelebrationOverlay';

interface CelebrationData {
  level?: number;
  badgeName?: string;
  badgeIcon?: string;
  badgeRarity?: string;
  xpBonus?: number;
  prName?: string;
  prValue?: string;
  streakWeeks?: number;
}

interface CelebrationContextType {
  showLevelUp: (level: number) => void;
  showBadge: (badgeName: string, badgeIcon?: string, badgeRarity?: string, xpBonus?: number) => void;
  showPR: (prName: string, prValue: string, xpBonus?: number) => void;
  showStreak: (streakWeeks: number, xpBonus?: number) => void;
}

const CelebrationContext = createContext<CelebrationContextType | null>(null);

export function useCelebrations() {
  const context = useContext(CelebrationContext);
  if (!context) {
    // Return no-op functions if not in provider (trainer side)
    return {
      showLevelUp: () => {},
      showBadge: () => {},
      showPR: () => {},
      showStreak: () => {},
    };
  }
  return context;
}

interface CelebrationProviderProps {
  children: ReactNode;
}

export function CelebrationProvider({ children }: CelebrationProviderProps) {
  const [celebration, setCelebration] = useState<{
    type: 'level-up' | 'badge' | 'pr' | 'streak';
    data: CelebrationData;
  } | null>(null);

  const showLevelUp = useCallback((level: number) => {
    setCelebration({ type: 'level-up', data: { level } });
  }, []);

  const showBadge = useCallback((badgeName: string, badgeIcon?: string, badgeRarity?: string, xpBonus?: number) => {
    setCelebration({ type: 'badge', data: { badgeName, badgeIcon, badgeRarity, xpBonus } });
  }, []);

  const showPR = useCallback((prName: string, prValue: string, xpBonus?: number) => {
    setCelebration({ type: 'pr', data: { prName, prValue, xpBonus } });
  }, []);

  const showStreak = useCallback((streakWeeks: number, xpBonus?: number) => {
    setCelebration({ type: 'streak', data: { streakWeeks, xpBonus } });
  }, []);

  const closeCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  return (
    <CelebrationContext.Provider value={{ showLevelUp, showBadge, showPR, showStreak }}>
      {children}
      {celebration && (
        <CelebrationOverlay
          type={celebration.type}
          data={celebration.data}
          onClose={closeCelebration}
        />
      )}
    </CelebrationContext.Provider>
  );
}
