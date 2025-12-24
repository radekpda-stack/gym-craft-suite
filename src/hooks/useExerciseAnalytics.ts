import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  startOfMonth, 
  subMonths, 
  format, 
  subDays, 
  eachDayOfInterval,
  startOfYear,
  subYears,
  parseISO
} from 'date-fns';

// Types
export type PeriodType = 'month' | 'year' | '30days' | '90days' | 'custom';
export type ComparisonMode = 'clients' | 'average' | 'history';

export interface AnalyticsFilters {
  clientIds?: string[];
  periodType: PeriodType;
  periodValue?: { start: string; end: string };
  trainingTypes?: string[];
  muscleGroups?: string[];
  comparisonMode?: ComparisonMode;
}

export interface SavedView {
  id: string;
  name: string;
  description?: string;
  filters: AnalyticsFilters;
  isDefault: boolean;
  createdAt: string;
}

export interface VolumeDataPoint {
  date: string;
  volume: number;
  label?: string;
}

export interface CategoryData {
  category: string;
  count: number;
  percentage: number;
  volume: number;
}

export interface MovementPatternData {
  pattern: string;
  label: string;
  count: number;
  percentage: number;
}

export interface TopExerciseData {
  exerciseId: string;
  exerciseName: string;
  usageCount: number;
  percentage: number;
  trend: number[];
}

export interface ClientComparisonData {
  clientId: string;
  clientName: string;
  totalVolume: number;
  sessionCount: number;
  avgVolumePerSession: number;
  topCategory: string;
  volumeTrend: VolumeDataPoint[];
  categoryDistribution: CategoryData[];
  movementPatterns: MovementPatternData[];
}

export interface AverageComparisonData {
  clientData: ClientComparisonData;
  averageData: {
    avgVolume: number;
    avgSessions: number;
    avgVolumePerSession: number;
    volumeTrend: VolumeDataPoint[];
  };
  percentDiff: {
    volume: number;
    sessions: number;
    volumePerSession: number;
  };
}

export interface HistoryComparisonData {
  currentPeriod: ClientComparisonData;
  previousPeriod: ClientComparisonData;
  percentChange: {
    volume: number;
    sessions: number;
    volumePerSession: number;
  };
}

export interface ExerciseAnalyticsData {
  // Summary stats
  totalVolume: number;
  totalSessions: number;
  avgVolumePerSession: number;
  
  // Volume trend
  volumeTrend: VolumeDataPoint[];
  
  // Category distribution (donut)
  categoryDistribution: CategoryData[];
  
  // Movement pattern coverage (bar)
  movementPatterns: MovementPatternData[];
  
  // Top exercises
  topExercises: TopExerciseData[];
  
  // Comparison data (depends on mode)
  clientComparisons?: ClientComparisonData[];
  averageComparison?: AverageComparisonData;
  historyComparison?: HistoryComparisonData;
}

const MOVEMENT_PATTERN_LABELS: Record<string, string> = {
  squat: 'Dřep',
  hinge: 'Hip hinge',
  lunge: 'Výpad',
  push_horizontal: 'Tlak H',
  push_vertical: 'Tlak V',
  pull_horizontal: 'Tah H',
  pull_vertical: 'Tah V',
  carry: 'Přenášení',
  core_anti_extension: 'Core ext',
  core_anti_rotation: 'Core rot',
  core_anti_lateral_flexion: 'Core lat',
  rotation: 'Rotace',
  locomotion: 'Lokomoce',
  conditioning: 'Kondice',
  mobility: 'Mobilita',
};

function getDateRange(periodType: PeriodType, customRange?: { start: string; end: string }) {
  const now = new Date();
  
  switch (periodType) {
    case 'month':
      return {
        start: startOfMonth(now),
        end: now,
      };
    case 'year':
      return {
        start: startOfYear(now),
        end: now,
      };
    case '30days':
      return {
        start: subDays(now, 30),
        end: now,
      };
    case '90days':
      return {
        start: subDays(now, 90),
        end: now,
      };
    case 'custom':
      if (customRange) {
        return {
          start: parseISO(customRange.start),
          end: parseISO(customRange.end),
        };
      }
      return {
        start: subDays(now, 30),
        end: now,
      };
    default:
      return {
        start: subDays(now, 30),
        end: now,
      };
  }
}

function getPreviousPeriodRange(periodType: PeriodType, customRange?: { start: string; end: string }) {
  const now = new Date();
  
  switch (periodType) {
    case 'month':
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: subDays(startOfMonth(now), 1),
      };
    case 'year':
      const lastYear = subYears(now, 1);
      return {
        start: startOfYear(lastYear),
        end: subDays(startOfYear(now), 1),
      };
    case '30days':
      return {
        start: subDays(now, 60),
        end: subDays(now, 31),
      };
    case '90days':
      return {
        start: subDays(now, 180),
        end: subDays(now, 91),
      };
    case 'custom':
      if (customRange) {
        const start = parseISO(customRange.start);
        const end = parseISO(customRange.end);
        const diff = end.getTime() - start.getTime();
        return {
          start: new Date(start.getTime() - diff),
          end: new Date(start.getTime() - 1),
        };
      }
      return {
        start: subDays(now, 60),
        end: subDays(now, 31),
      };
    default:
      return {
        start: subDays(now, 60),
        end: subDays(now, 31),
      };
  }
}

async function fetchClientAnalytics(
  userId: string,
  clientId: string,
  startDate: Date,
  endDate: Date,
  clientName: string
): Promise<ClientComparisonData> {
  const { data: entries, error } = await supabase
    .from('exercise_entries')
    .select(`
      id,
      exercise_id,
      exercise_name,
      date,
      sets,
      reps,
      weight_kg,
      exercises!exercise_entries_exercise_id_fkey (
        id,
        category,
        movement_pattern
      )
    `)
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'))
    .order('date', { ascending: true });

  if (error) throw error;

  const categoryMap = new Map<string, { count: number; volume: number }>();
  const patternMap = new Map<string, number>();
  const dailyVolume = new Map<string, number>();
  const sessionDates = new Set<string>();
  let totalVolume = 0;

  entries?.forEach((entry) => {
    const exercise = entry.exercises as any;
    const category = exercise?.category || 'Ostatní';
    const pattern = exercise?.movement_pattern;
    const volume = (entry.sets || 1) * (entry.reps || 1) * (entry.weight_kg || 0);

    totalVolume += volume;
    sessionDates.add(entry.date);
    dailyVolume.set(entry.date, (dailyVolume.get(entry.date) || 0) + volume);

    const catData = categoryMap.get(category) || { count: 0, volume: 0 };
    catData.count++;
    catData.volume += volume;
    categoryMap.set(category, catData);

    if (pattern) {
      patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
    }
  });

  const totalEntries = entries?.length || 1;
  const sessionCount = sessionDates.size;

  const categoryDistribution: CategoryData[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      percentage: Math.round((data.count / totalEntries) * 100),
      volume: data.volume,
    }))
    .sort((a, b) => b.volume - a.volume);

  const totalPatternEntries = Array.from(patternMap.values()).reduce((a, b) => a + b, 0) || 1;
  const movementPatterns: MovementPatternData[] = Array.from(patternMap.entries())
    .map(([pattern, count]) => ({
      pattern,
      label: MOVEMENT_PATTERN_LABELS[pattern] || pattern,
      count,
      percentage: Math.round((count / totalPatternEntries) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const volumeTrend: VolumeDataPoint[] = days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return {
      date: dateStr,
      volume: dailyVolume.get(dateStr) || 0,
      label: format(day, 'd.M.'),
    };
  });

  return {
    clientId,
    clientName,
    totalVolume,
    sessionCount,
    avgVolumePerSession: sessionCount > 0 ? Math.round(totalVolume / sessionCount) : 0,
    topCategory: categoryDistribution[0]?.category || '',
    volumeTrend,
    categoryDistribution,
    movementPatterns,
  };
}

export function useExerciseAnalytics(filters: AnalyticsFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => 
    ['exercise-analytics', user?.id, JSON.stringify(filters)],
    [user?.id, filters]
  );

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ExerciseAnalyticsData> => {
      if (!user?.id) throw new Error('No user');

      const { start, end } = getDateRange(filters.periodType, filters.periodValue);
      
      // Fetch all exercise entries for the period
      let queryBuilder = supabase
        .from('exercise_entries')
        .select(`
          id,
          client_id,
          exercise_id,
          exercise_name,
          date,
          sets,
          reps,
          weight_kg,
          exercises!exercise_entries_exercise_id_fkey (
            id,
            category,
            movement_pattern
          )
        `)
        .eq('user_id', user.id)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      // Filter by clients if specified
      if (filters.clientIds && filters.clientIds.length > 0) {
        queryBuilder = queryBuilder.in('client_id', filters.clientIds);
      }

      const { data: entries, error: entriesError } = await queryBuilder;
      if (entriesError) throw entriesError;

      // Fetch client names
      const clientIds = [...new Set(entries?.map(e => e.client_id) || [])];
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);

      // Calculate summary stats
      const categoryMap = new Map<string, { count: number; volume: number }>();
      const patternMap = new Map<string, number>();
      const exerciseUsage = new Map<string, { name: string; count: number; dailyUsage: Map<string, number> }>();
      const dailyVolume = new Map<string, number>();
      const sessionDates = new Set<string>();
      let totalVolume = 0;

      entries?.forEach((entry) => {
        const exercise = entry.exercises as any;
        const category = exercise?.category || 'Ostatní';
        const pattern = exercise?.movement_pattern;
        const exerciseId = entry.exercise_id || entry.exercise_name;
        const volume = (entry.sets || 1) * (entry.reps || 1) * (entry.weight_kg || 0);

        totalVolume += volume;
        sessionDates.add(entry.date);
        dailyVolume.set(entry.date, (dailyVolume.get(entry.date) || 0) + volume);

        const catData = categoryMap.get(category) || { count: 0, volume: 0 };
        catData.count++;
        catData.volume += volume;
        categoryMap.set(category, catData);

        if (pattern) {
          patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
        }

        if (exerciseId) {
          const existing = exerciseUsage.get(exerciseId) || { 
            name: entry.exercise_name, 
            count: 0, 
            dailyUsage: new Map() 
          };
          existing.count++;
          existing.dailyUsage.set(entry.date, (existing.dailyUsage.get(entry.date) || 0) + 1);
          exerciseUsage.set(exerciseId, existing);
        }
      });

      const totalEntries = entries?.length || 1;
      const sessionCount = sessionDates.size;

      // Category distribution
      const categoryDistribution: CategoryData[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          count: data.count,
          percentage: Math.round((data.count / totalEntries) * 100),
          volume: data.volume,
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 8);

      // Movement patterns
      const totalPatternEntries = Array.from(patternMap.values()).reduce((a, b) => a + b, 0) || 1;
      const movementPatterns: MovementPatternData[] = Array.from(patternMap.entries())
        .map(([pattern, count]) => ({
          pattern,
          label: MOVEMENT_PATTERN_LABELS[pattern] || pattern,
          count,
          percentage: Math.round((count / totalPatternEntries) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Volume trend
      const days = eachDayOfInterval({ start, end });
      const volumeTrend: VolumeDataPoint[] = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return {
          date: dateStr,
          volume: dailyVolume.get(dateStr) || 0,
          label: format(day, 'd.M.'),
        };
      });

      // Top exercises
      const topExercises: TopExerciseData[] = Array.from(exerciseUsage.entries())
        .map(([id, data]) => {
          const trend = days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            return data.dailyUsage.get(dateStr) || 0;
          });
          return {
            exerciseId: id,
            exerciseName: data.name,
            usageCount: data.count,
            percentage: Math.round((data.count / totalEntries) * 100),
            trend,
          };
        })
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5);

      // Build result
      const result: ExerciseAnalyticsData = {
        totalVolume,
        totalSessions: sessionCount,
        avgVolumePerSession: sessionCount > 0 ? Math.round(totalVolume / sessionCount) : 0,
        volumeTrend,
        categoryDistribution,
        movementPatterns,
        topExercises,
      };

      // Handle comparison modes
      if (filters.comparisonMode === 'clients' && filters.clientIds && filters.clientIds.length > 1) {
        const clientComparisons = await Promise.all(
          filters.clientIds.map(clientId => 
            fetchClientAnalytics(user.id, clientId, start, end, clientMap.get(clientId) || 'Klient')
          )
        );
        result.clientComparisons = clientComparisons;
      }

      if (filters.comparisonMode === 'average' && filters.clientIds && filters.clientIds.length === 1) {
        const clientData = await fetchClientAnalytics(
          user.id, 
          filters.clientIds[0], 
          start, 
          end, 
          clientMap.get(filters.clientIds[0]) || 'Klient'
        );

        // Calculate average across all clients
        const allClientIds = [...clientIds];
        const allClientData = await Promise.all(
          allClientIds.map(id => fetchClientAnalytics(user.id, id, start, end, ''))
        );

        const avgVolume = allClientData.reduce((sum, c) => sum + c.totalVolume, 0) / allClientData.length;
        const avgSessions = allClientData.reduce((sum, c) => sum + c.sessionCount, 0) / allClientData.length;
        const avgVolumePerSession = avgSessions > 0 ? avgVolume / avgSessions : 0;

        // Aggregate volume trend
        const avgVolumeTrend: VolumeDataPoint[] = days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const avgDayVolume = allClientData.reduce((sum, c) => sum + (c.volumeTrend[i]?.volume || 0), 0) / allClientData.length;
          return {
            date: dateStr,
            volume: Math.round(avgDayVolume),
            label: format(day, 'd.M.'),
          };
        });

        result.averageComparison = {
          clientData,
          averageData: {
            avgVolume,
            avgSessions,
            avgVolumePerSession: Math.round(avgVolumePerSession),
            volumeTrend: avgVolumeTrend,
          },
          percentDiff: {
            volume: avgVolume > 0 ? Math.round(((clientData.totalVolume - avgVolume) / avgVolume) * 100) : 0,
            sessions: avgSessions > 0 ? Math.round(((clientData.sessionCount - avgSessions) / avgSessions) * 100) : 0,
            volumePerSession: avgVolumePerSession > 0 ? Math.round(((clientData.avgVolumePerSession - avgVolumePerSession) / avgVolumePerSession) * 100) : 0,
          },
        };
      }

      if (filters.comparisonMode === 'history' && filters.clientIds && filters.clientIds.length === 1) {
        const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(filters.periodType, filters.periodValue);
        
        const currentData = await fetchClientAnalytics(
          user.id, 
          filters.clientIds[0], 
          start, 
          end, 
          clientMap.get(filters.clientIds[0]) || 'Klient'
        );

        const previousData = await fetchClientAnalytics(
          user.id, 
          filters.clientIds[0], 
          prevStart, 
          prevEnd, 
          clientMap.get(filters.clientIds[0]) || 'Klient'
        );

        result.historyComparison = {
          currentPeriod: currentData,
          previousPeriod: previousData,
          percentChange: {
            volume: previousData.totalVolume > 0 
              ? Math.round(((currentData.totalVolume - previousData.totalVolume) / previousData.totalVolume) * 100) 
              : currentData.totalVolume > 0 ? 100 : 0,
            sessions: previousData.sessionCount > 0 
              ? Math.round(((currentData.sessionCount - previousData.sessionCount) / previousData.sessionCount) * 100) 
              : currentData.sessionCount > 0 ? 100 : 0,
            volumePerSession: previousData.avgVolumePerSession > 0 
              ? Math.round(((currentData.avgVolumePerSession - previousData.avgVolumePerSession) / previousData.avgVolumePerSession) * 100) 
              : currentData.avgVolumePerSession > 0 ? 100 : 0,
          },
        };
      }

      return result;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return query;
}

// Saved Views Hook
export function useSavedViews() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['analytics-saved-views', user?.id],
    queryFn: async (): Promise<SavedView[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('analytics_saved_views')
        .select('*')
        .eq('user_id', user.id)
        .eq('view_type', 'exercises')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        filters: (row.filters as unknown) as AnalyticsFilters,
        isDefault: row.is_default || false,
        createdAt: row.created_at,
      }));
    },
    enabled: !!user?.id,
  });

  const saveView = useMutation({
    mutationFn: async ({ name, description, filters }: { name: string; description?: string; filters: AnalyticsFilters }) => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('analytics_saved_views')
        .insert({
          user_id: user.id,
          name,
          description,
          view_type: 'exercises',
          filters: filters as any,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-saved-views'] });
    },
  });

  const updateView = useMutation({
    mutationFn: async ({ id, name, description, filters }: { id: string; name?: string; description?: string; filters?: AnalyticsFilters }) => {
      if (!user?.id) throw new Error('No user');

      const updates: any = {};
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (filters) updates.filters = filters;

      const { data, error } = await supabase
        .from('analytics_saved_views')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-saved-views'] });
    },
  });

  const deleteView = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('analytics_saved_views')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-saved-views'] });
    },
  });

  return {
    views: query.data || [],
    isLoading: query.isLoading,
    saveView,
    updateView,
    deleteView,
  };
}
