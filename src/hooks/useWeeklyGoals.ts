import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { startOfWeek, endOfWeek, format, isWithinInterval, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

export interface WeeklyGoal {
  id: string;
  label: string;
  target: number;
  current: number;
  completed: boolean;
  xpReward: number;
}

export function useWeeklyGoals(clientId?: string) {
  return useQuery({
    queryKey: ['weekly-goals', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      
      // Get workouts this week
      const { data: workouts, error: workoutsError } = await supabase
        .from('client_confirmed_workouts')
        .select('performed_date, workout_type, performed_at')
        .eq('client_id', clientId)
        .gte('performed_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('performed_date', format(weekEnd, 'yyyy-MM-dd'));
      
      if (workoutsError) throw workoutsError;
      
      const workoutCount = workouts?.length || 0;
      
      // Count morning workouts (before 9:00)
      const morningWorkouts = workouts?.filter(w => {
        const hour = parseISO(w.performed_at).getHours();
        return hour < 9;
      }).length || 0;
      
      // Get XP events this week
      const { data: xpEvents, error: xpError } = await supabase
        .from('xp_events')
        .select('xp_amount')
        .eq('client_id', clientId)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());
      
      if (xpError) throw xpError;
      
      const weeklyXP = xpEvents?.reduce((sum, e) => sum + e.xp_amount, 0) || 0;
      
      // Define weekly goals
      const goals: WeeklyGoal[] = [
        {
          id: 'workouts-3',
          label: 'Splň 3 tréninky',
          target: 3,
          current: Math.min(workoutCount, 3),
          completed: workoutCount >= 3,
          xpReward: 10,
        },
        {
          id: 'morning-2',
          label: 'Ranní trénink 2×',
          target: 2,
          current: Math.min(morningWorkouts, 2),
          completed: morningWorkouts >= 2,
          xpReward: 10,
        },
        {
          id: 'xp-50',
          label: 'Získej 50 XP',
          target: 50,
          current: Math.min(weeklyXP, 50),
          completed: weeklyXP >= 50,
          xpReward: 5,
        },
      ];
      
      return goals;
    },
    enabled: !!clientId,
  });
}

export function useMyWeeklyGoals() {
  const { clientId } = useClientPortal();
  return useWeeklyGoals(clientId ?? undefined);
}
