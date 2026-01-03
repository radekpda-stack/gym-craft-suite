import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useClientBadges } from '@/hooks/useClientGamification';
import { useClientXPLevel } from '@/hooks/useClientXPLevel';
import { toast } from 'sonner';

/**
 * Hook that monitors for new badges and level ups, showing toast notifications
 */
export function useBadgeNotifications(clientId?: string) {
  const { data: clientBadges } = useClientBadges(clientId);
  const { data: xpLevel } = useClientXPLevel(clientId);
  
  const prevBadgesRef = useRef<Set<string>>(new Set());
  const prevLevelRef = useRef<number>(1);
  const isInitializedRef = useRef(false);
  
  // Check for new badges
  useEffect(() => {
    if (!clientBadges) return;
    
    const earnedBadgeIds = new Set(
      clientBadges
        .filter(b => b.earned_at)
        .map(b => b.badge_id)
    );
    
    // Skip initial load
    if (!isInitializedRef.current) {
      prevBadgesRef.current = earnedBadgeIds;
      isInitializedRef.current = true;
      return;
    }
    
    // Find new badges
    earnedBadgeIds.forEach(badgeId => {
      if (!prevBadgesRef.current.has(badgeId)) {
        const badge = clientBadges.find(b => b.badge_id === badgeId);
        if (badge?.badge_definitions) {
          toast.success(`🎖️ Nový odznak získán!`, {
            description: badge.badge_definitions.name,
            duration: 5000,
          });
        }
      }
    });
    
    prevBadgesRef.current = earnedBadgeIds;
  }, [clientBadges]);
  
  // Check for level ups
  useEffect(() => {
    if (!xpLevel) return;
    
    const currentLevel = xpLevel.level;
    
    // Skip if not initialized or same level
    if (prevLevelRef.current === 0) {
      prevLevelRef.current = currentLevel;
      return;
    }
    
    if (currentLevel > prevLevelRef.current) {
      toast.success(`🎉 Level Up!`, {
        description: `Dosáhl/a jsi levelu ${currentLevel}!`,
        duration: 5000,
      });
    }
    
    prevLevelRef.current = currentLevel;
  }, [xpLevel?.level]);
}

/**
 * Hook to get badge icon from icon_key
 */
export const BADGE_ICONS: Record<string, string> = {
  dot: '●',
  bars_1: '▮',
  bars_2: '▮▮',
  badge_25: '25',
  badge_50: '50',
  badge_75: '75',
  badge_100: '💯',
  badge_150: '150',
  badge_200: '200',
  crown: '👑',
  link_2: '🔗',
  link_4: '⛓',
  link_8: '⛓️',
  link_12: '🔒',
  link_20: '🏆',
  infinity: '∞',
  type_tag: '🏷️',
  sunrise: '🌅',
  calendar_sun: '📅',
  comeback: '↩️',
  triad: '🔺',
  five: '5️⃣',
  group: '👥',
  spark: '✨',
  leaf: '🌿',
  sun: '☀️',
  reset: '🔄',
  snow: '❄️',
  gift: '🎁',
  fireworks: '🎆',
  champagne: '🍾',
  egg: '🥚',
  hammer: '🔨',
  flag: '🇨🇿',
  shopping_bag: '🛍️',
  droplets: '💧',
  pill: '💊',
  star: '⭐',
};

export function getBadgeIcon(iconKey: string): string {
  return BADGE_ICONS[iconKey] || '🏅';
}
