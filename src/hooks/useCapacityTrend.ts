import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import { useCapacitySettings } from './useCapacitySettings';
import { eachWeekOfInterval, startOfWeek, endOfWeek, format, getDay, eachDayOfInterval, min, max } from 'date-fns';
import { cs } from 'date-fns/locale';

export interface CapacityTrendPoint {
  label: string;
  weekStart: Date;
  utilizationPercent: number;
  occupiedSlots: number;
  availableSlots: number;
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
  const dayIndex = getDay(date);
  const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  return workingDays[adjustedIndex];
}

export function useCapacityTrend() {
  const { filters } = useDashboardFilters();
  const { settings, isConfigured, isLoading: settingsLoading } = useCapacitySettings();
  
  const { dateRange } = filters;

  return useQuery({
    queryKey: ['capacity-trend', dateRange.from.toISOString(), dateRange.to.toISOString(), settings],
    queryFn: async (): Promise<CapacityTrendPoint[]> => {
      if (!isConfigured || settingsLoading) {
        return [];
      }

      const slotsPerDay = calculateSlotsPerDay(
        settings.workingHoursStart,
        settings.workingHoursEnd,
        settings.slotDurationMinutes
      );

      // Get all weeks in the range
      const weeks = eachWeekOfInterval(
        { start: dateRange.from, end: dateRange.to },
        { weekStartsOn: 1 }
      );

      // Fetch all trainings in the period
      const { data: trainings, error } = await supabase
        .from('training_sessions')
        .select('id, date, duration')
        .in('status', ['completed', 'scheduled'])
        .gte('date', dateRange.from.toISOString())
        .lte('date', dateRange.to.toISOString());

      if (error) throw error;

      // Calculate utilization for each week
      const trendData: CapacityTrendPoint[] = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        
        // Clamp to date range
        const effectiveStart = max([weekStart, dateRange.from]);
        const effectiveEnd = min([weekEnd, dateRange.to]);
        
        const daysInWeek = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });
        const workingDaysCount = daysInWeek.filter(d => isWorkingDay(d, settings.workingDays)).length;
        const availableSlots = workingDaysCount * slotsPerDay;

        // Filter trainings for this week
        const weekTrainings = trainings?.filter(t => {
          const trainingDate = new Date(t.date);
          return trainingDate >= effectiveStart && trainingDate <= effectiveEnd;
        }) || [];

        const occupiedSlots = weekTrainings.reduce((sum, t) => {
          const duration = t.duration || settings.slotDurationMinutes;
          return sum + Math.ceil(duration / settings.slotDurationMinutes);
        }, 0);

        const utilizationPercent = availableSlots > 0
          ? Math.round((occupiedSlots / availableSlots) * 100)
          : 0;

        return {
          label: format(weekStart, 'd. MMM', { locale: cs }),
          weekStart,
          utilizationPercent,
          occupiedSlots,
          availableSlots,
        };
      });

      return trendData;
    },
    enabled: isConfigured && !settingsLoading,
  });
}
