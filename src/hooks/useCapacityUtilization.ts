import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import { useCapacitySettings } from './useCapacitySettings';
import { eachDayOfInterval, getDay, subDays, subMonths, differenceInMinutes, parseISO, isWithinInterval } from 'date-fns';

interface CapacityUtilizationData {
  utilizationPercent: number;
  occupiedSlots: number;
  availableSlots: number;
  trend: number | null; // % change vs previous period
  previousOccupied: number | null;
  previousAvailable: number | null;
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function calculateSlotsPerDay(startTime: string, endTime: string, slotMinutes: number): number {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  
  const totalMinutes = endMinutes - startMinutes;
  return Math.floor(totalMinutes / slotMinutes);
}

function isWorkingDay(date: Date, workingDays: boolean[]): boolean {
  // getDay returns 0 for Sunday, 1 for Monday, etc.
  // workingDays array is [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  const dayIndex = getDay(date);
  const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert to Mon=0, Sun=6
  return workingDays[adjustedIndex];
}

export function useCapacityUtilization() {
  const { filters } = useDashboardFilters();
  const { settings, isConfigured, isLoading: settingsLoading } = useCapacitySettings();
  
  const { dateRange, globalPeriod } = filters;

  return useQuery({
    queryKey: ['capacity-utilization', dateRange.from.toISOString(), dateRange.to.toISOString(), settings],
    queryFn: async (): Promise<CapacityUtilizationData | null> => {
      if (!isConfigured || settingsLoading) {
        return null;
      }

      const slotsPerDay = calculateSlotsPerDay(
        settings.workingHoursStart,
        settings.workingHoursEnd,
        settings.slotDurationMinutes
      );

      // Current period
      const currentDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const workingDaysCount = currentDays.filter(d => isWorkingDay(d, settings.workingDays)).length;
      const availableSlots = workingDaysCount * slotsPerDay;

      // Fetch completed trainings in current period
      const { data: currentTrainings, error } = await supabase
        .from('training_sessions')
        .select('id, date, duration')
        .in('status', ['completed', 'scheduled'])
        .gte('date', dateRange.from.toISOString())
        .lte('date', dateRange.to.toISOString());

      if (error) throw error;

      // Calculate occupied slots (each training = duration / slotDuration)
      const occupiedSlots = currentTrainings?.reduce((sum, t) => {
        const duration = t.duration || settings.slotDurationMinutes;
        return sum + Math.ceil(duration / settings.slotDurationMinutes);
      }, 0) || 0;

      const utilizationPercent = availableSlots > 0 
        ? Math.round((occupiedSlots / availableSlots) * 100) 
        : 0;

      // Calculate previous period for trend
      let previousOccupied: number | null = null;
      let previousAvailable: number | null = null;
      let trend: number | null = null;

      const periodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      const prevStart = subDays(dateRange.from, periodDays);
      const prevEnd = subDays(dateRange.from, 1);

      const prevDays = eachDayOfInterval({ start: prevStart, end: prevEnd });
      const prevWorkingDaysCount = prevDays.filter(d => isWorkingDay(d, settings.workingDays)).length;
      previousAvailable = prevWorkingDaysCount * slotsPerDay;

      if (previousAvailable > 0) {
        const { data: prevTrainings } = await supabase
          .from('training_sessions')
          .select('id, date, duration')
          .in('status', ['completed', 'scheduled'])
          .gte('date', prevStart.toISOString())
          .lte('date', prevEnd.toISOString());

        previousOccupied = prevTrainings?.reduce((sum, t) => {
          const duration = t.duration || settings.slotDurationMinutes;
          return sum + Math.ceil(duration / settings.slotDurationMinutes);
        }, 0) || 0;

        const prevUtilization = (previousOccupied / previousAvailable) * 100;
        trend = prevUtilization > 0 
          ? Math.round(((utilizationPercent - prevUtilization) / prevUtilization) * 100)
          : null;
      }

      return {
        utilizationPercent,
        occupiedSlots,
        availableSlots,
        trend,
        previousOccupied,
        previousAvailable,
      };
    },
    enabled: isConfigured && !settingsLoading,
  });
}
