import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, subDays, eachWeekOfInterval, endOfWeek } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

export interface PRTrendPoint {
  month: string;
  label: string;
  count: number;
}

interface PRTrendDataPoint {
  week: string;
  label: string;
  count: number;
  cumulative: number;
}

// Original monthly PR trend hook (for backward compatibility)
export function usePRTrend(months: number = 6) {
  return useQuery({
    queryKey: ['pr-trend', months],
    queryFn: async (): Promise<PRTrendPoint[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const endDate = new Date();
      const startDate = subMonths(endDate, months);
      
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const { data: entries, error } = await supabase
        .from('exercise_entries')
        .select('id, date, is_pr')
        .eq('user_id', user.id)
        .eq('is_pr', true)
        .gte('date', startStr)
        .lte('date', endStr);

      if (error || !entries) return [];

      // Group by month
      const monthCounts: Record<string, number> = {};
      
      entries.forEach(entry => {
        const month = format(new Date(entry.date), 'yyyy-MM');
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });

      // Fill in missing months with 0
      const result: PRTrendPoint[] = [];
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(endDate, i);
        const monthKey = format(date, 'yyyy-MM');
        const label = format(date, 'MMM');
        
        result.push({
          month: monthKey,
          label,
          count: monthCounts[monthKey] || 0,
        });
      }

      return result;
    },
  });
}

// Weekly PR trend with cumulative data
export function usePRTrendWeekly(days: number = 90, clientId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pr-trend-weekly', user?.id, days, clientId],
    queryFn: async (): Promise<PRTrendDataPoint[]> => {
      if (!user?.id) return [];

      const now = new Date();
      const startDate = subDays(now, days);
      const dateStr = format(startDate, 'yyyy-MM-dd');

      let query = supabase
        .from('exercise_entries')
        .select('id, date, is_pr')
        .eq('user_id', user.id)
        .eq('is_pr', true)
        .gte('date', dateStr)
        .order('date', { ascending: true });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data: prEntries, error } = await query;
      if (error) throw error;

      // Build weekly buckets
      const weeks = eachWeekOfInterval(
        { start: startDate, end: now },
        { weekStartsOn: 1 }
      );

      let cumulative = 0;
      const trendData: PRTrendDataPoint[] = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        
        const weekPRs = prEntries?.filter(pr => {
          const d = new Date(pr.date);
          return d >= weekStart && d <= weekEnd;
        }) || [];

        cumulative += weekPRs.length;

        return {
          week: format(weekStart, 'yyyy-MM-dd'),
          label: format(weekStart, 'd.M', { locale: cs }),
          count: weekPRs.length,
          cumulative,
        };
      });

      return trendData;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// PR Stats with comparison to previous period
export function usePRStats(days: number = 90, clientId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pr-stats', user?.id, days, clientId],
    queryFn: async () => {
      if (!user?.id) return null;

      const now = new Date();
      const startDate = subDays(now, days);
      const previousStartDate = subDays(startDate, days);
      const dateStr = format(startDate, 'yyyy-MM-dd');
      const previousDateStr = format(previousStartDate, 'yyyy-MM-dd');

      // Current period
      let currentQuery = supabase
        .from('exercise_entries')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_pr', true)
        .gte('date', dateStr);

      if (clientId) {
        currentQuery = currentQuery.eq('client_id', clientId);
      }

      const { count: currentCount } = await currentQuery;

      // Previous period
      let previousQuery = supabase
        .from('exercise_entries')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_pr', true)
        .gte('date', previousDateStr)
        .lt('date', dateStr);

      if (clientId) {
        previousQuery = previousQuery.eq('client_id', clientId);
      }

      const { count: previousCount } = await previousQuery;

      // Top PR exercises
      let topQuery = supabase
        .from('exercise_entries')
        .select('exercise_name, exercise_id')
        .eq('user_id', user.id)
        .eq('is_pr', true)
        .gte('date', dateStr);

      if (clientId) {
        topQuery = topQuery.eq('client_id', clientId);
      }

      const { data: topPRs } = await topQuery;

      // Count by exercise
      const exerciseCounts = new Map<string, { name: string; count: number }>();
      topPRs?.forEach(pr => {
        const existing = exerciseCounts.get(pr.exercise_name);
        if (existing) {
          existing.count++;
        } else {
          exerciseCounts.set(pr.exercise_name, { name: pr.exercise_name, count: 1 });
        }
      });

      const topExercises = Array.from(exerciseCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        currentCount: currentCount || 0,
        previousCount: previousCount || 0,
        change: (currentCount || 0) - (previousCount || 0),
        changePercent: previousCount && previousCount > 0 
          ? Math.round(((currentCount || 0) - previousCount) / previousCount * 100) 
          : 0,
        topExercises,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
