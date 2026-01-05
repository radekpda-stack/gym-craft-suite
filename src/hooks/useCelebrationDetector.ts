import { useEffect, useRef } from 'react';
import { useClientBadges } from '@/hooks/useClientGamification';
import { useClientXPLevel } from '@/hooks/useClientXPLevel';
import { useSmartCelebrations } from '@/contexts/SmartCelebrationContext';
import { getBadgeIcon } from '@/hooks/useBadgeNotifications';

/**
 * Hook that detects new achievements and triggers celebrations
 * Replaces useBadgeNotifications with the new smart celebration system
 */
export function useCelebrationDetector(clientId?: string) {
  const { data: clientBadges } = useClientBadges(clientId);
  const { data: xpLevel } = useClientXPLevel(clientId);
  const { celebrate } = useSmartCelebrations();
  
  const prevBadgesRef = useRef<Set<string>>(new Set());
  const prevLevelRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  
  // Detect new badges
  useEffect(() => {
    if (!clientBadges) return;
    
    const earnedBadgeIds = new Set(
      clientBadges
        .filter(b => b.earned_at)
        .map(b => b.badge_id)
    );
    
    // Skip initial load - just capture current state
    if (!isInitializedRef.current) {
      prevBadgesRef.current = earnedBadgeIds;
      if (xpLevel) {
        prevLevelRef.current = xpLevel.level;
      }
      isInitializedRef.current = true;
      return;
    }
    
    // Find new badges
    earnedBadgeIds.forEach(badgeId => {
      if (!prevBadgesRef.current.has(badgeId)) {
        const badge = clientBadges.find(b => b.badge_id === badgeId);
        if (badge?.badge_definitions) {
          celebrate('badge', {
            badgeName: badge.badge_definitions.name,
            badgeIcon: badge.badge_definitions.icon_key,
            badgeRarity: badge.badge_definitions.rarity,
          });
        }
      }
    });
    
    prevBadgesRef.current = earnedBadgeIds;
  }, [clientBadges, celebrate]);
  
  // Detect level ups
  useEffect(() => {
    if (!xpLevel || !isInitializedRef.current) return;
    
    const currentLevel = xpLevel.level;
    
    // Check for level up
    if (prevLevelRef.current > 0 && currentLevel > prevLevelRef.current) {
      celebrate('level-up', {
        level: currentLevel,
        levelName: getLevelName(currentLevel),
        xpBonus: 0, // Level up bonus is already included in XP
      });
    }
    
    prevLevelRef.current = currentLevel;
  }, [xpLevel?.level, celebrate]);
}

// Level name mapping
function getLevelName(level: number): string {
  const levelNames: Record<number, string> = {
    1: 'Nováček',
    2: 'Adept',
    3: 'Nadšenec',
    4: 'Sportovec',
    5: 'Atlet',
    6: 'Šampion',
    7: 'Veterán',
    8: 'Elita',
    9: 'Legenda',
    10: 'Mistr',
  };
  return levelNames[level] || `Level ${level}`;
}
