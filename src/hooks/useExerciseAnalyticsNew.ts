import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, format, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { cs } from 'date-fns/locale';

export type AnalyticsPeriod = 7 | 30 | 90 | 'custom';
export type ComparisonMode = 'client' | 'all';

interface VolumeDataPoint {
  date: string;
  label: string;
  volume: number;
  volumeComparison?: number;
}

interface LoadDistributionItem {
  group: string;
  label: string;
  value: number;
  comparisonValue: number;
}

interface MovementPatternItem {
  pattern: string;
  label: string;
  count: number;
  totalEntries?: number;
  coverage?: number;
}

interface UnusedExercise {
  id: string;
  name: string;
  category: string;
  lastUsed: string | null;
}

export interface ExerciseAnalyticsNewData {
  volumeTimeline: VolumeDataPoint[];
  totalVolume: number;
  loadDistribution: LoadDistributionItem[];
  movementPatterns: MovementPatternItem[];
  movementPatternsCoverage: number;
  movementPatternsTotalEntries: number;
  unusedExercises: UnusedExercise[];
}

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  upper: 'Horní tělo',
  lower: 'Dolní tělo',
  core: 'Core',
  other: 'Ostatní',
};

const MOVEMENT_PATTERN_LABELS: Record<string, string> = {
  squat: 'Squat',
  hinge: 'Hinge',
  lunge: 'Lunge',
  push_horizontal: 'Push',
  push_vertical: 'Push',
  pull_horizontal: 'Pull',
  pull_vertical: 'Pull',
  carry: 'Carry',
  rotation: 'Rotation',
  core_anti_extension: 'Core',
  core_anti_rotation: 'Core',
  core_anti_lateral_flexion: 'Core',
  locomotion: 'Locomotion',
  conditioning: 'Conditioning',
  mobility: 'Mobility',
};

// Fallback mapping: category → movement pattern
const CATEGORY_TO_MOVEMENT_PATTERN: Record<string, string> = {
  'Kardio': 'conditioning',
  'Cardio': 'conditioning',
  'Horní tělo': 'push_horizontal',
  'Upper Body': 'push_horizontal',
  'Dolní tělo': 'squat',
  'Lower Body': 'squat',
  'Core': 'core_anti_extension',
  'Břicho': 'core_anti_extension',
  'Abs': 'core_anti_extension',
  'Nohy': 'squat',
  'Legs': 'squat',
  'Záda': 'pull_horizontal',
  'Back': 'pull_horizontal',
  'Hrudník': 'push_horizontal',
  'Chest': 'push_horizontal',
  'Ramena': 'push_vertical',
  'Shoulders': 'push_vertical',
  'Biceps': 'pull_horizontal',
  'Triceps': 'push_horizontal',
  'Paže': 'push_horizontal',
  'Arms': 'push_horizontal',
  'Hýždě': 'hinge',
  'Glutes': 'hinge',
  'Stehna': 'squat',
  'Quadriceps': 'squat',
  'Hamstrings': 'hinge',
  'Lýtka': 'locomotion',
  'Calves': 'locomotion',
  'Mobilita': 'mobility',
  'Mobility': 'mobility',
  'Síla': 'squat',
  'Strength': 'squat',
};

// Get movement pattern with fallback to category-based mapping
function getMovementPatternWithFallback(pattern: string | null | undefined, category: string | null | undefined): string | null {
  if (pattern) return pattern;
  if (!category) return null;
  return CATEGORY_TO_MOVEMENT_PATTERN[category] || null;
}

// Map categories to muscle groups
function getCategoryMuscleGroup(category: string): string {
  const upper = ['Hrudník', 'Záda', 'Ramena', 'Biceps', 'Triceps', 'Chest', 'Back', 'Shoulders'];
  const lower = ['Nohy', 'Stehna', 'Lýtka', 'Hýždě', 'Legs', 'Glutes', 'Quadriceps', 'Hamstrings'];
  const core = ['Břicho', 'Core', 'Abs'];
  
  if (upper.some(u => category.toLowerCase().includes(u.toLowerCase()))) return 'upper';
  if (lower.some(l => category.toLowerCase().includes(l.toLowerCase()))) return 'lower';
  if (core.some(c => category.toLowerCase().includes(c.toLowerCase()))) return 'core';
  return 'other';
}

export function useExerciseAnalyticsNew(
  period: AnalyticsPeriod = 90,
  comparisonMode: ComparisonMode = 'all',
  selectedClientId?: string | null
) {
  const { user } = useAuth();
  const days = period === 'custom' ? 90 : period;

  return useQuery({
    queryKey: ['exercise-analytics-new', user?.id, days, comparisonMode, selectedClientId],
    queryFn: async (): Promise<ExerciseAnalyticsNewData> => {
      if (!user?.id) throw new Error('No user');

      const now = new Date();
      const startDate = subDays(now, days);
      const dateStr = format(startDate, 'yyyy-MM-dd');

      // Fetch entries based on comparison mode
      let entriesQuery = supabase
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
        .gte('date', dateStr)
        .order('date', { ascending: true });

      if (comparisonMode === 'client' && selectedClientId) {
        entriesQuery = entriesQuery.eq('client_id', selectedClientId);
      }

      const { data: entries, error } = await entriesQuery;
      if (error) throw error;

      // Fetch all entries for comparison (trainer baseline)
      const { data: allEntries } = await supabase
        .from('exercise_entries')
        .select(`
          id,
          client_id,
          exercise_id,
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
        .gte('date', dateStr);

      // Fetch all exercises for "unused" calculation
      const { data: allExercises } = await supabase
        .from('exercises')
        .select('id, name, name_cs, category')
        .eq('is_archived', false)
        .or(`user_id.eq.${user.id},source.eq.system`);

      // Build volume timeline (weekly buckets for better readability)
      const weeks = eachWeekOfInterval(
        { start: startDate, end: now },
        { locale: cs, weekStartsOn: 1 }
      );

      const volumeTimeline: VolumeDataPoint[] = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekEntries = entries?.filter(e => {
          const d = new Date(e.date);
          return d >= weekStart && d <= weekEnd;
        }) || [];

        const allWeekEntries = allEntries?.filter(e => {
          const d = new Date(e.date);
          return d >= weekStart && d <= weekEnd;
        }) || [];

        const volume = weekEntries.reduce((sum, e) => {
          return sum + (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 0);
        }, 0);

        const comparisonVolume = allWeekEntries.reduce((sum, e) => {
          return sum + (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 0);
        }, 0);

        return {
          date: format(weekStart, 'yyyy-MM-dd'),
          label: format(weekStart, 'd.M', { locale: cs }),
          volume,
          volumeComparison: comparisonMode === 'all' ? comparisonVolume : undefined,
        };
      });

      const totalVolume = entries?.reduce((sum, e) => {
        return sum + (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 0);
      }, 0) || 0;

      // Load distribution by muscle group
      const muscleGroups = { upper: 0, lower: 0, core: 0, other: 0 };
      const muscleGroupsAll = { upper: 0, lower: 0, core: 0, other: 0 };

      entries?.forEach(e => {
        const exercise = e.exercises as any;
        const category = exercise?.category || 'Ostatní';
        const group = getCategoryMuscleGroup(category);
        const volume = (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 1);
        muscleGroups[group as keyof typeof muscleGroups] += volume;
      });

      allEntries?.forEach(e => {
        const exercise = e.exercises as any;
        const category = exercise?.category || 'Ostatní';
        const group = getCategoryMuscleGroup(category);
        const volume = (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 1);
        muscleGroupsAll[group as keyof typeof muscleGroupsAll] += volume;
      });

      const maxValue = Math.max(...Object.values(muscleGroups), 1);
      const maxValueAll = Math.max(...Object.values(muscleGroupsAll), 1);

      const loadDistribution: LoadDistributionItem[] = ['lower', 'upper', 'core', 'other'].map(group => ({
        group,
        label: MUSCLE_GROUP_LABELS[group],
        value: Math.round((muscleGroups[group as keyof typeof muscleGroups] / maxValue) * 100),
        comparisonValue: Math.round((muscleGroupsAll[group as keyof typeof muscleGroupsAll] / maxValueAll) * 100),
      }));

      // Movement patterns (consolidated) with fallback mapping
      const patternCounts = new Map<string, number>();
      const totalEntries = entries?.length || 0;
      let entriesWithPattern = 0;

      entries?.forEach(e => {
        const exercise = e.exercises as any;
        const rawPattern = exercise?.movement_pattern;
        const category = exercise?.category;
        const pattern = getMovementPatternWithFallback(rawPattern, category);
        
        if (pattern) {
          entriesWithPattern++;
          // Consolidate similar patterns
          const consolidated = MOVEMENT_PATTERN_LABELS[pattern] || pattern;
          patternCounts.set(consolidated, (patternCounts.get(consolidated) || 0) + 1);
        }
      });

      const coverage = totalEntries > 0 ? Math.round((entriesWithPattern / totalEntries) * 100) : 0;

      const movementPatterns: MovementPatternItem[] = Array.from(patternCounts.entries())
        .map(([label, count]) => ({
          pattern: label.toLowerCase().replace(/\s/g, '_'),
          label,
          count,
          totalEntries,
          coverage,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Unused exercises
      const usedExerciseIds = new Set(entries?.map(e => e.exercise_id).filter(Boolean));
      const unusedExercises: UnusedExercise[] = (allExercises || [])
        .filter(ex => !usedExerciseIds.has(ex.id))
        .slice(0, 20)
        .map(ex => ({
          id: ex.id,
          name: ex.name_cs || ex.name,
          category: ex.category,
          lastUsed: null,
        }));

      return {
        volumeTimeline,
        totalVolume,
        loadDistribution,
        movementPatterns,
        movementPatternsCoverage: coverage,
        movementPatternsTotalEntries: totalEntries,
        unusedExercises,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
