import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export interface ClientXPLevel {
  client_id: string;
  total_xp: number;
  level: number;
  level_xp: number;
  xp_to_next: number;
  last_xp_date: string | null;
  updated_at: string;
}

// Level names for display (extended to level 20)
export const LEVEL_NAMES: Record<number, string> = {
  1: 'Nováček',
  2: 'Začátečník',
  3: 'Adept',
  4: 'Cvičenec',
  5: 'Bojovník',
  6: 'Veterán',
  7: 'Šampion',
  8: 'Mistr',
  9: 'Legenda',
  10: 'Hrdina',
  11: 'Titán',
  12: 'Gladiátor',
  13: 'Válečník',
  14: 'Elita',
  15: 'Fénix',
  16: 'Nesmrtelný',
  17: 'Démon',
  18: 'Bůh Fitness',
  19: 'Olympionik',
  20: 'Absolutní Šampion',
};

export function getLevelName(level: number): string {
  return LEVEL_NAMES[level] || `Level ${level}`;
}

export function useClientXPLevel(clientId?: string) {
  return useQuery({
    queryKey: ['client-xp-level', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('client_xp')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      
      if (error) throw error;
      
      // Return default values if no record exists
      if (!data) {
        return {
          client_id: clientId,
          total_xp: 0,
          level: 1,
          level_xp: 0,
          xp_to_next: 100,
          last_xp_date: null,
          updated_at: new Date().toISOString(),
        } as ClientXPLevel;
      }
      
      return data as ClientXPLevel;
    },
    enabled: !!clientId,
  });
}

// Hook for current streak calculation
export function useClientStreak(clientId?: string) {
  return useQuery({
    queryKey: ['client-streak', clientId],
    queryFn: async () => {
      if (!clientId) return { currentStreak: 0, longestStreak: 0 };
      
      // Get confirmed workouts to calculate streak
      const { data: workouts, error } = await supabase
        .from('client_confirmed_workouts')
        .select('performed_date')
        .eq('client_id', clientId)
        .order('performed_date', { ascending: false });
      
      if (error) throw error;
      if (!workouts || workouts.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
      }
      
      // Calculate weekly streak
      const weekSet = new Set<string>();
      workouts.forEach(w => {
        const date = new Date(w.performed_date);
        const weekKey = getWeekKey(date);
        weekSet.add(weekKey);
      });
      
      const weeks = Array.from(weekSet).sort().reverse();
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      
      const today = new Date();
      const currentWeek = getWeekKey(today);
      const lastWeek = getWeekKey(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
      
      // Check if current or last week has workout
      if (weeks[0] === currentWeek || weeks[0] === lastWeek) {
        for (let i = 0; i < weeks.length; i++) {
          const expectedWeek = getWeekKey(new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000));
          if (weeks.includes(expectedWeek)) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
      
      // Calculate longest streak
      for (let i = 0; i < weeks.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prevWeekDate = parseWeekKey(weeks[i - 1]);
          const currWeekDate = parseWeekKey(weeks[i]);
          const diffDays = (prevWeekDate.getTime() - currWeekDate.getTime()) / (24 * 60 * 60 * 1000);
          
          if (diffDays <= 7) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }
      
      return { currentStreak, longestStreak };
    },
    enabled: !!clientId,
  });
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function parseWeekKey(weekKey: string): Date {
  return new Date(weekKey);
}

// Combined hook for portal usage
export function useMyXPLevel() {
  const { clientId } = useClientPortal();
  const xpLevel = useClientXPLevel(clientId ?? undefined);
  const streak = useClientStreak(clientId ?? undefined);
  
  return {
    xpLevel: xpLevel.data,
    streak: streak.data,
    isLoading: xpLevel.isLoading || streak.isLoading,
    error: xpLevel.error || streak.error,
  };
}
