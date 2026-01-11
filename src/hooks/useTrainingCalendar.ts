import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  parseISO,
  isWithinInterval,
  subMonths,
  addMonths,
  isSameDay
} from 'date-fns';

export interface CalendarWorkout {
  id: string;
  date: string;
  workout_type: string | null;
  xp: number;
  training_session_id: string | null;
}

export interface CalendarDay {
  date: Date;
  dateStr: string;
  hasWorkout: boolean;
  workoutCount: number;
  totalXp: number;
  workouts: CalendarWorkout[];
  isCurrentMonth: boolean;
}

export function useMonthlyWorkouts(clientId?: string, month?: Date) {
  const targetMonth = month ?? new Date();
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);
  
  return useQuery({
    queryKey: ['monthly-workouts', clientId, format(monthStart, 'yyyy-MM')],
    queryFn: async (): Promise<CalendarWorkout[]> => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_confirmed_workouts')
        .select('id, performed_date, workout_type, xp, training_session_id')
        .eq('client_id', clientId)
        .gte('performed_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('performed_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('performed_date', { ascending: true });
      
      if (error) throw error;
      
      return (data ?? []).map(w => ({
        id: w.id,
        date: w.performed_date,
        workout_type: w.workout_type,
        xp: w.xp,
        training_session_id: w.training_session_id,
      }));
    },
    enabled: !!clientId,
  });
}

export function useCalendarDays(clientId?: string, month?: Date): {
  days: CalendarDay[];
  workouts: CalendarWorkout[];
  isLoading: boolean;
  totalWorkouts: number;
  totalXp: number;
} {
  const targetMonth = month ?? new Date();
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);
  
  const { data: workouts, isLoading } = useMonthlyWorkouts(clientId, month);
  
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const days: CalendarDay[] = allDays.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayWorkouts = (workouts ?? []).filter(w => w.date === dateStr);
    
    return {
      date,
      dateStr,
      hasWorkout: dayWorkouts.length > 0,
      workoutCount: dayWorkouts.length,
      totalXp: dayWorkouts.reduce((sum, w) => sum + w.xp, 0),
      workouts: dayWorkouts,
      isCurrentMonth: isWithinInterval(date, { start: monthStart, end: monthEnd }),
    };
  });
  
  return {
    days,
    workouts: workouts ?? [],
    isLoading,
    totalWorkouts: workouts?.length ?? 0,
    totalXp: workouts?.reduce((sum, w) => sum + w.xp, 0) ?? 0,
  };
}

export function useYearlyHeatmap(clientId?: string) {
  const endDate = new Date();
  const startDate = subMonths(endDate, 12);
  
  return useQuery({
    queryKey: ['yearly-heatmap', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_confirmed_workouts')
        .select('performed_date, xp')
        .eq('client_id', clientId)
        .gte('performed_date', format(startDate, 'yyyy-MM-dd'))
        .lte('performed_date', format(endDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Group by date
      const byDate: Record<string, { count: number; xp: number }> = {};
      (data ?? []).forEach(w => {
        if (!byDate[w.performed_date]) {
          byDate[w.performed_date] = { count: 0, xp: 0 };
        }
        byDate[w.performed_date].count++;
        byDate[w.performed_date].xp += w.xp;
      });
      
      return byDate;
    },
    enabled: !!clientId,
  });
}

export function useMyTrainingCalendar(month?: Date) {
  const { clientId } = useClientPortal();
  return useCalendarDays(clientId ?? undefined, month);
}
