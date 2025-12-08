import { useMemo } from 'react';
import { useExerciseEntries, ExerciseEntry } from '@/hooks/useExerciseEntries';
import { useExercises } from '@/hooks/useExercises';
import { differenceInDays, subDays, format } from 'date-fns';

export const MUSCLE_GROUPS = [
  { value: 'chest', label: 'Prsa', bodyPart: 'upper' },
  { value: 'back', label: 'Záda', bodyPart: 'upper' },
  { value: 'shoulders', label: 'Ramena', bodyPart: 'upper' },
  { value: 'biceps', label: 'Biceps', bodyPart: 'upper' },
  { value: 'triceps', label: 'Triceps', bodyPart: 'upper' },
  { value: 'legs', label: 'Nohy', bodyPart: 'lower' },
  { value: 'glutes', label: 'Hýždě', bodyPart: 'lower' },
  { value: 'core', label: 'Core', bodyPart: 'core' },
  { value: 'forearms', label: 'Předloktí', bodyPart: 'upper' },
  { value: 'calves', label: 'Lýtka', bodyPart: 'lower' },
] as const;

export const TRAINING_TYPES = [
  { value: 'strength', label: 'Síla' },
  { value: 'hypertrophy', label: 'Hypertrofie' },
  { value: 'technique', label: 'Technika' },
  { value: 'stability', label: 'Stabilita' },
  { value: 'mobility', label: 'Mobilita' },
  { value: 'conditioning', label: 'Kondice' },
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number]['value'];
export type TrainingType = typeof TRAINING_TYPES[number]['value'];

interface MuscleGroupStats {
  muscleGroup: string;
  label: string;
  lastTrainedDate: Date | null;
  daysSinceLastTrained: number | null;
  totalEntries: number;
  frequency: number; // entries per week in selected period
  heatLevel: 'hot' | 'warm' | 'cold' | 'frozen' | 'never';
}

interface TrainingRecommendation {
  type: 'warning' | 'info' | 'suggestion';
  title: string;
  description: string;
  muscleGroup?: string;
  exercise?: string;
}

interface ExerciseProgress {
  exerciseName: string;
  lastWeight: number | null;
  bestWeight: number | null;
  trendDirection: 'up' | 'down' | 'stagnant';
  entriesCount: number;
  lastDate: Date;
}

export function useTrainingAnalytics(clientId?: string, periodDays: number = 90) {
  const { entries } = useExerciseEntries(clientId);
  const { exercises } = useExercises();

  // Map exercises to their muscle groups
  const exerciseMuscleMap = useMemo(() => {
    const map = new Map<string, { primary: string[]; secondary: string[]; trainingTypes: string[] }>();
    exercises.forEach((ex) => {
      map.set(ex.name.toLowerCase(), {
        primary: ex.muscle_groups || [],
        secondary: (ex as any).secondary_muscle_groups || [],
        trainingTypes: (ex as any).training_type || [],
      });
    });
    return map;
  }, [exercises]);

  // Filter entries by period
  const periodEntries = useMemo(() => {
    const cutoff = subDays(new Date(), periodDays);
    return entries.filter((e) => new Date(e.date) >= cutoff);
  }, [entries, periodDays]);

  // Calculate muscle group statistics
  const muscleGroupStats = useMemo((): MuscleGroupStats[] => {
    const stats: Record<string, { lastDate: Date | null; count: number }> = {};

    // Initialize all muscle groups
    MUSCLE_GROUPS.forEach((mg) => {
      stats[mg.value] = { lastDate: null, count: 0 };
    });

    // Process entries
    periodEntries.forEach((entry) => {
      const exerciseData = exerciseMuscleMap.get(entry.exercise_name.toLowerCase());
      const muscleGroups = exerciseData?.primary || [];
      const entryDate = new Date(entry.date);

      muscleGroups.forEach((mg) => {
        if (stats[mg]) {
          stats[mg].count++;
          if (!stats[mg].lastDate || entryDate > stats[mg].lastDate) {
            stats[mg].lastDate = entryDate;
          }
        }
      });
    });

    const now = new Date();
    const weeksInPeriod = periodDays / 7;

    return MUSCLE_GROUPS.map((mg) => {
      const stat = stats[mg.value];
      const daysSince = stat.lastDate ? differenceInDays(now, stat.lastDate) : null;
      
      let heatLevel: MuscleGroupStats['heatLevel'] = 'never';
      if (daysSince !== null) {
        if (daysSince <= 3) heatLevel = 'hot';
        else if (daysSince <= 7) heatLevel = 'warm';
        else if (daysSince <= 14) heatLevel = 'cold';
        else heatLevel = 'frozen';
      }

      return {
        muscleGroup: mg.value,
        label: mg.label,
        lastTrainedDate: stat.lastDate,
        daysSinceLastTrained: daysSince,
        totalEntries: stat.count,
        frequency: stat.count / weeksInPeriod,
        heatLevel,
      };
    });
  }, [periodEntries, exerciseMuscleMap]);

  // Calculate heatmap data for visualization
  const heatmapData = useMemo(() => {
    return muscleGroupStats.map((stat) => ({
      name: stat.label,
      value: stat.daysSinceLastTrained ?? 999,
      heatLevel: stat.heatLevel,
      entries: stat.totalEntries,
    }));
  }, [muscleGroupStats]);

  // Frequency by muscle group for bar chart
  const frequencyData = useMemo(() => {
    return muscleGroupStats
      .filter((s) => s.totalEntries > 0)
      .sort((a, b) => b.frequency - a.frequency)
      .map((s) => ({
        name: s.label,
        frequency: Math.round(s.frequency * 10) / 10,
        entries: s.totalEntries,
      }));
  }, [muscleGroupStats]);

  // Generate training recommendations
  const recommendations = useMemo((): TrainingRecommendation[] => {
    const recs: TrainingRecommendation[] = [];

    // Check for neglected muscle groups
    muscleGroupStats.forEach((stat) => {
      if (stat.heatLevel === 'frozen' && stat.daysSinceLastTrained) {
        recs.push({
          type: 'warning',
          title: `${stat.label} nebyly trénovány ${stat.daysSinceLastTrained} dní`,
          description: `Zvažte zařazení tréninku na ${stat.label.toLowerCase()}.`,
          muscleGroup: stat.muscleGroup,
        });
      } else if (stat.heatLevel === 'never' && stat.totalEntries === 0) {
        recs.push({
          type: 'info',
          title: `${stat.label} chybí v tréninkovém plánu`,
          description: `Tato svalová skupina nebyla v období trénována.`,
          muscleGroup: stat.muscleGroup,
        });
      }
    });

    // Check for imbalance (upper vs lower)
    const upperCount = muscleGroupStats
      .filter((s) => MUSCLE_GROUPS.find((mg) => mg.value === s.muscleGroup)?.bodyPart === 'upper')
      .reduce((sum, s) => sum + s.totalEntries, 0);
    
    const lowerCount = muscleGroupStats
      .filter((s) => MUSCLE_GROUPS.find((mg) => mg.value === s.muscleGroup)?.bodyPart === 'lower')
      .reduce((sum, s) => sum + s.totalEntries, 0);

    if (upperCount > lowerCount * 2 && lowerCount > 0) {
      recs.push({
        type: 'suggestion',
        title: 'Nerovnováha horní/dolní část těla',
        description: `Horní část těla je trénována ${Math.round(upperCount / lowerCount)}× častěji než dolní. Zvažte vyrovnání.`,
      });
    } else if (lowerCount > upperCount * 2 && upperCount > 0) {
      recs.push({
        type: 'suggestion',
        title: 'Nerovnováha horní/dolní část těla',
        description: `Dolní část těla je trénována ${Math.round(lowerCount / upperCount)}× častěji než horní. Zvažte vyrovnání.`,
      });
    }

    return recs;
  }, [muscleGroupStats]);

  // Exercise progress tracking
  const exerciseProgress = useMemo((): ExerciseProgress[] => {
    const progressMap = new Map<string, ExerciseEntry[]>();

    entries.forEach((entry) => {
      const existing = progressMap.get(entry.exercise_name) || [];
      existing.push(entry);
      progressMap.set(entry.exercise_name, existing);
    });

    return Array.from(progressMap.entries()).map(([name, exerciseEntries]) => {
      const sorted = exerciseEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const weights = sorted.filter((e) => e.weight_kg).map((e) => e.weight_kg!);
      
      let trendDirection: 'up' | 'down' | 'stagnant' = 'stagnant';
      if (weights.length >= 3) {
        const recent = weights.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const older = weights.slice(-3).reduce((a, b) => a + b, 0) / 3;
        if (recent > older * 1.05) trendDirection = 'up';
        else if (recent < older * 0.95) trendDirection = 'down';
      }

      return {
        exerciseName: name,
        lastWeight: weights[0] ?? null,
        bestWeight: weights.length > 0 ? Math.max(...weights) : null,
        trendDirection,
        entriesCount: exerciseEntries.length,
        lastDate: new Date(sorted[0].date),
      };
    });
  }, [entries]);

  // Recent exercises (for quick reference when planning)
  const recentExercises = useMemo(() => {
    const last14Days = subDays(new Date(), 14);
    return entries
      .filter((e) => new Date(e.date) >= last14Days)
      .reduce<Map<string, { date: Date; weight: number | null; reps: number | null }>>((acc, e) => {
        if (!acc.has(e.exercise_name)) {
          acc.set(e.exercise_name, {
            date: new Date(e.date),
            weight: e.weight_kg,
            reps: e.reps,
          });
        }
        return acc;
      }, new Map());
  }, [entries]);

  return {
    muscleGroupStats,
    heatmapData,
    frequencyData,
    recommendations,
    exerciseProgress,
    recentExercises,
    periodEntries,
    totalEntries: entries.length,
  };
}
