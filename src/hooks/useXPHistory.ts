import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface XPEvent {
  id: string;
  client_id: string;
  xp_amount: number;
  source_type: string;
  source_id: string | null;
  description: string | null;
  created_at: string;
}

// Source type labels for display
export const XP_SOURCE_LABELS: Record<string, string> = {
  training_completed: 'Trénink s trenérem',
  workout_confirmed: 'Vlastní trénink',
  challenge_completed: 'Výzva dokončena',
  badge_earned: 'Nový odznak',
  streak_bonus: 'Streak bonus',
  first_workout: 'První trénink',
  daily_bonus: 'Denní bonus',
  manual: 'Bonus od trenéra',
};

// Source type icons
export const XP_SOURCE_ICONS: Record<string, string> = {
  training_completed: '🏋️',
  workout_confirmed: '💪',
  challenge_completed: '🏆',
  badge_earned: '🎖️',
  streak_bonus: '🔥',
  first_workout: '⭐',
  daily_bonus: '📅',
  manual: '🎁',
};

export function getXPSourceLabel(sourceType: string): string {
  return XP_SOURCE_LABELS[sourceType] || sourceType;
}

export function getXPSourceIcon(sourceType: string): string {
  return XP_SOURCE_ICONS[sourceType] || '✨';
}

export function useXPHistory(clientId?: string, limit = 10) {
  return useQuery({
    queryKey: ['xp-history', clientId, limit],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('xp_events')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as XPEvent[];
    },
    enabled: !!clientId,
  });
}

export function useRecentXPGains(clientId?: string) {
  const { data: events, isLoading } = useXPHistory(clientId, 5);
  
  const totalRecent = events?.reduce((sum, e) => sum + e.xp_amount, 0) || 0;
  
  return {
    events: events || [],
    totalRecent,
    isLoading,
  };
}
