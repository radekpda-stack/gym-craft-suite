import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, subMonths, format, subDays, eachDayOfInterval } from 'date-fns';

interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

interface TopExercise {
  exerciseId: string;
  exerciseName: string;
  usageCount: number;
  percentage: number;
  trend: number[]; // last 30 days daily usage
}

interface MovementPatternStats {
  pattern: string;
  label: string;
  count: number;
  percentage: number;
}

interface ExerciseLibraryStats {
  // Category distribution
  categoryDistribution: CategoryStats[];
  
  // Top exercises
  topExercises: TopExercise[];
  
  // Activity trend
  currentMonthSessions: number;
  lastMonthSessions: number;
  activityTrendPercent: number;
  
  // Movement pattern coverage
  movementPatterns: MovementPatternStats[];
  
  // Total volume
  totalVolume: number;
  volumeTrend: number[]; // last 30 days
  
  // Active vs passive exercises
  activeExercisesCount: number;
  totalExercisesCount: number;
  activePercentage: number;
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

export function useExerciseLibraryStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['exercise-library-stats', user?.id],
    queryFn: async (): Promise<ExerciseLibraryStats> => {
      if (!user?.id) throw new Error('No user');

      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const currentMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = subDays(currentMonthStart, 1);

      // Fetch exercise entries for last 30 days with exercise details
      const { data: entries, error: entriesError } = await supabase
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
        .eq('user_id', user.id)
        .gte('date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (entriesError) throw entriesError;

      // Fetch all exercises count
      const { count: totalExercises } = await supabase
        .from('exercises')
        .select('id', { count: 'exact', head: true })
        .eq('is_archived', false);

      // Process category distribution
      const categoryMap = new Map<string, number>();
      const exerciseUsage = new Map<string, { name: string; count: number; dailyUsage: Map<string, number> }>();
      const patternMap = new Map<string, number>();
      const usedExerciseIds = new Set<string>();
      const dailyVolume = new Map<string, number>();

      let totalVolume = 0;

      entries?.forEach((entry) => {
        const exercise = entry.exercises as any;
        const category = exercise?.category || 'Ostatní';
        const pattern = exercise?.movement_pattern;
        const exerciseId = entry.exercise_id || entry.exercise_name;
        const date = entry.date;

        // Category stats
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);

        // Exercise usage
        if (exerciseId) {
          usedExerciseIds.add(exerciseId);
          const existing = exerciseUsage.get(exerciseId) || { 
            name: entry.exercise_name, 
            count: 0, 
            dailyUsage: new Map() 
          };
          existing.count++;
          existing.dailyUsage.set(date, (existing.dailyUsage.get(date) || 0) + 1);
          exerciseUsage.set(exerciseId, existing);
        }

        // Pattern stats
        if (pattern) {
          patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
        }

        // Volume calculation
        const volume = (entry.sets || 1) * (entry.reps || 1) * (entry.weight_kg || 0);
        totalVolume += volume;
        dailyVolume.set(date, (dailyVolume.get(date) || 0) + volume);
      });

      // Calculate category distribution
      const totalEntries = entries?.length || 1;
      const categoryDistribution: CategoryStats[] = Array.from(categoryMap.entries())
        .map(([category, count]) => ({
          category,
          count,
          percentage: Math.round((count / totalEntries) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Calculate top exercises with 30-day trend
      const last30Days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });
      const topExercises: TopExercise[] = Array.from(exerciseUsage.entries())
        .map(([id, data]) => {
          const trend = last30Days.map(day => {
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

      // Calculate activity trend (current vs last month)
      const currentMonthEntries = entries?.filter(e => e.date >= format(currentMonthStart, 'yyyy-MM-dd')).length || 0;
      const lastMonthEntries = entries?.filter(e => 
        e.date >= format(lastMonthStart, 'yyyy-MM-dd') && 
        e.date <= format(lastMonthEnd, 'yyyy-MM-dd')
      ).length || 0;

      const activityTrendPercent = lastMonthEntries > 0 
        ? Math.round(((currentMonthEntries - lastMonthEntries) / lastMonthEntries) * 100)
        : currentMonthEntries > 0 ? 100 : 0;

      // Calculate movement pattern coverage
      const totalPatternEntries = Array.from(patternMap.values()).reduce((a, b) => a + b, 0) || 1;
      const movementPatterns: MovementPatternStats[] = Array.from(patternMap.entries())
        .map(([pattern, count]) => ({
          pattern,
          label: MOVEMENT_PATTERN_LABELS[pattern] || pattern,
          count,
          percentage: Math.round((count / totalPatternEntries) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Volume trend
      const volumeTrend = last30Days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return dailyVolume.get(dateStr) || 0;
      });

      return {
        categoryDistribution,
        topExercises,
        currentMonthSessions: currentMonthEntries,
        lastMonthSessions: lastMonthEntries,
        activityTrendPercent,
        movementPatterns,
        totalVolume,
        volumeTrend,
        activeExercisesCount: usedExerciseIds.size,
        totalExercisesCount: totalExercises || 0,
        activePercentage: totalExercises ? Math.round((usedExerciseIds.size / totalExercises) * 100) : 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
