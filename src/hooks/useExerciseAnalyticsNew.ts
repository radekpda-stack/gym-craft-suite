import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, format, eachWeekOfInterval, endOfWeek } from 'date-fns';
import { cs } from 'date-fns/locale';

export type AnalyticsPeriod = 7 | 30 | 90 | 'custom';
export type ComparisonMode = 'client' | 'all';
export type LoadDistributionMode = 'high-level' | 'detail';

interface VolumeDataPoint {
  date: string;
  label: string;
  volume: number;
  volumeComparison?: number;
}

export interface LoadDistributionItem {
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

interface TopExercise {
  id: string;
  name: string;
  category: string;
  usageCount: number;
  totalVolume: number;
}

export interface ExerciseAnalyticsNewData {
  volumeTimeline: VolumeDataPoint[];
  totalVolume: number;
  loadDistribution: LoadDistributionItem[];
  loadDistributionDetail: LoadDistributionItem[];
  movementPatterns: MovementPatternItem[];
  movementPatternsCoverage: number;
  movementPatternsTotalEntries: number;
  topExercises: TopExercise[];
}

// High-level body part labels
const BODY_PART_LABELS: Record<string, string> = {
  upper: 'Horní část',
  lower: 'Dolní část',
  core: 'Core',
  other: 'Ostatní',
};

// Detailed muscle group labels (Czech)
const MUSCLE_GROUP_LABELS: Record<string, string> = {
  quadriceps: 'Quadriceps',
  hamstrings: 'Hamstringy',
  gluteus_maximus: 'Gluteus max.',
  gluteus_medius: 'Gluteus med.',
  calves: 'Lýtka',
  adductors: 'Adduktory',
  abductors: 'Abduktory',
  back_vertical_pull: 'Záda vert.',
  back_horizontal_pull: 'Záda horiz.',
  shoulders_front: 'Ramena přední',
  shoulders_middle: 'Ramena střed',
  shoulders_rear: 'Ramena zadní',
  triceps: 'Triceps',
  biceps: 'Biceps',
  serratus_anterior: 'Serratus',
  core_anti_extension: 'Core anti-ext',
  core_anti_rotation: 'Core anti-rot',
  core_rotation: 'Core rotace',
  core_lateral: 'Core lat. stab.',
  erector_spinae: 'Erector spinae',
};

const MOVEMENT_PATTERN_LABELS: Record<string, string> = {
  squat: 'Dřep',
  hinge: 'Hip hinge',
  lunge: 'Výpad',
  push_horizontal: 'Tlak horiz.',
  push_vertical: 'Tlak vert.',
  pull_horizontal: 'Tah horiz.',
  pull_vertical: 'Tah vert.',
  carry: 'Přenášení',
  rotation: 'Rotace',
  core_anti_extension: 'Core anti-ext.',
  core_anti_rotation: 'Core anti-rot.',
  core_anti_lateral_flexion: 'Core lat. flex.',
  locomotion: 'Lokomoce',
  conditioning: 'Kondice',
  mobility: 'Mobilita',
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

      // Fetch body part categories for exercise_ids from entries
      const exerciseIds = [...new Set((entries || []).map(e => e.exercise_id).filter(Boolean) as string[])];
      const allExerciseIds = [...new Set((allEntries || []).map(e => e.exercise_id).filter(Boolean) as string[])];
      
      // Fetch exercise -> body part mapping from view
      const { data: exerciseBodyParts } = await supabase
        .from('exercise_body_part_categories')
        .select('*')
        .in('exercise_id', [...new Set([...exerciseIds, ...allExerciseIds])]);

      // Fetch detailed muscle groups for exercises
      const { data: exerciseMuscleGroups } = await supabase
        .from('exercise_muscle_groups')
        .select('exercise_id, role, muscle_group:muscle_groups(id, name, name_cz)')
        .in('exercise_id', [...new Set([...exerciseIds, ...allExerciseIds])]);

      // Create maps
      const exerciseToBodyParts = new Map<string, Set<string>>();
      exerciseBodyParts?.forEach(ebp => {
        if (!exerciseToBodyParts.has(ebp.exercise_id)) {
          exerciseToBodyParts.set(ebp.exercise_id, new Set());
        }
        exerciseToBodyParts.get(ebp.exercise_id)!.add(ebp.body_part_key);
      });

      const exerciseToMuscleGroups = new Map<string, string[]>();
      exerciseMuscleGroups?.forEach((emg: any) => {
        if (!exerciseToMuscleGroups.has(emg.exercise_id)) {
          exerciseToMuscleGroups.set(emg.exercise_id, []);
        }
        if (emg.muscle_group?.name) {
          exerciseToMuscleGroups.get(emg.exercise_id)!.push(emg.muscle_group.name);
        }
      });

      // High-level load distribution (upper/lower/core)
      const bodyPartVolumes: Record<string, number> = { upper: 0, lower: 0, core: 0, other: 0 };
      const bodyPartVolumesAll: Record<string, number> = { upper: 0, lower: 0, core: 0, other: 0 };

      entries?.forEach(e => {
        const volume = (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 1);
        const bodyParts = exerciseToBodyParts.get(e.exercise_id || '') || new Set(['other']);
        const partCount = bodyParts.size || 1;
        bodyParts.forEach(bp => {
          bodyPartVolumes[bp] = (bodyPartVolumes[bp] || 0) + volume / partCount;
        });
      });

      allEntries?.forEach(e => {
        const volume = (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 1);
        const bodyParts = exerciseToBodyParts.get(e.exercise_id || '') || new Set(['other']);
        const partCount = bodyParts.size || 1;
        bodyParts.forEach(bp => {
          bodyPartVolumesAll[bp] = (bodyPartVolumesAll[bp] || 0) + volume / partCount;
        });
      });

      const totalBodyPartVolume = Object.values(bodyPartVolumes).reduce((sum, v) => sum + v, 0) || 1;
      const totalBodyPartVolumeAll = Object.values(bodyPartVolumesAll).reduce((sum, v) => sum + v, 0) || 1;

      const loadDistribution: LoadDistributionItem[] = ['lower', 'upper', 'core'].map(group => ({
        group,
        label: BODY_PART_LABELS[group],
        value: Math.round((bodyPartVolumes[group] / totalBodyPartVolume) * 100),
        comparisonValue: Math.round((bodyPartVolumesAll[group] / totalBodyPartVolumeAll) * 100),
      }));

      // Detail load distribution (by muscle group)
      const muscleGroupVolumes: Record<string, number> = {};
      const muscleGroupVolumesAll: Record<string, number> = {};

      entries?.forEach(e => {
        const volume = (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 1);
        const muscles = exerciseToMuscleGroups.get(e.exercise_id || '') || [];
        const muscleCount = muscles.length || 1;
        muscles.forEach(mg => {
          muscleGroupVolumes[mg] = (muscleGroupVolumes[mg] || 0) + volume / muscleCount;
        });
      });

      allEntries?.forEach(e => {
        const volume = (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 1);
        const muscles = exerciseToMuscleGroups.get(e.exercise_id || '') || [];
        const muscleCount = muscles.length || 1;
        muscles.forEach(mg => {
          muscleGroupVolumesAll[mg] = (muscleGroupVolumesAll[mg] || 0) + volume / muscleCount;
        });
      });

      const totalMuscleVolume = Object.values(muscleGroupVolumes).reduce((sum, v) => sum + v, 0) || 1;
      const totalMuscleVolumeAll = Object.values(muscleGroupVolumesAll).reduce((sum, v) => sum + v, 0) || 1;

      const loadDistributionDetail: LoadDistributionItem[] = Object.entries(muscleGroupVolumes)
        .map(([group, volume]) => ({
          group,
          label: MUSCLE_GROUP_LABELS[group] || group,
          value: Math.round((volume / totalMuscleVolume) * 100),
          comparisonValue: Math.round(((muscleGroupVolumesAll[group] || 0) / totalMuscleVolumeAll) * 100),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

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

      // Top exercises - aggregate by exercise
      const exerciseStats = new Map<string, { id: string; name: string; category: string; count: number; volume: number }>();
      
      entries?.forEach(e => {
        const exerciseId = e.exercise_id;
        if (!exerciseId) return;
        
        const exercise = e.exercises as any;
        const existing = exerciseStats.get(exerciseId);
        const volume = (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 0);
        
        if (existing) {
          existing.count += 1;
          existing.volume += volume;
        } else {
          exerciseStats.set(exerciseId, {
            id: exerciseId,
            name: e.exercise_name,
            category: exercise?.category || 'Ostatní',
            count: 1,
            volume,
          });
        }
      });

      const topExercises: TopExercise[] = Array.from(exerciseStats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(ex => ({
          id: ex.id,
          name: ex.name,
          category: ex.category,
          usageCount: ex.count,
          totalVolume: ex.volume,
        }));

      return {
        volumeTimeline,
        totalVolume,
        loadDistribution,
        loadDistributionDetail,
        movementPatterns,
        movementPatternsCoverage: coverage,
        movementPatternsTotalEntries: totalEntries,
        topExercises,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
