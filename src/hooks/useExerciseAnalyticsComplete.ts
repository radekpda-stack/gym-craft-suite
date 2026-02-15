import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, format, eachWeekOfInterval, endOfWeek, startOfWeek, parseISO, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';

export type AnalyticsPeriod = 7 | 30 | 90 | 'custom';

// ============ NEW TYPES FOR TRAINER-FOCUSED ANALYTICS ============

export interface StagnatingClient {
  clientId: string;
  clientName: string;
  exerciseName: string;
  weeksStagnant: number;
  lastValue: number;
}

export interface MovementGap {
  pattern: string;
  label: string;
  usageCount: number;
  isUnderworked: boolean;
  totalCount: number;
}

export interface UnusedExercise {
  id: string;
  name: string;
  lastUsedDate: string | null;
  daysSinceUse: number;
}

export type AttentionReason = 'no_pr' | 'declining_frequency' | 'high_asymmetry' | 'chronic_high_rpe';

export interface ClientNeedingAttention {
  clientId: string;
  clientName: string;
  reasons: AttentionReason[];
  priority: 'high' | 'medium' | 'low';
}

export interface ExerciseRpeRanking {
  name: string;
  avgRpe: number;
  entryCount: number;
}

export interface RpeProgressCorrelation {
  exerciseName: string;
  weightTrend: number; // % change
  rpeTrend: number; // absolute change
  status: 'true_strength_gain' | 'effort_increase' | 'fatigue_signal';
}

export interface AnalyticsKPI {
  tonnage: number;
  tonnageTrend: number;
  eVolume: number;
  eVolumeTrend: number;
  prCount: number;
  prTrend: number;
  frequency: number;
  frequencyTrend: number;
  avgRpe: number | null;
  rpeTrend: number;
  bwReps: number;
  bwRepsTrend: number;
  clientsNeedingAttentionCount: number;
  avgWeightPerEntry: number;
  avgWeightPerEntryTrend: number;
  activeClientCount: number;
}

export interface VolumeTimelinePoint {
  date: string;
  label: string;
  volume: number;
  volumePrevious?: number;
}

export interface PRTimelinePoint {
  week: string;
  label: string;
  count: number;
  cumulative: number;
}

export interface RpeTimelinePoint {
  week: string;
  label: string;
  avgRpe: number;
  entryCount: number;
}

export interface TopExerciseItem {
  id: string;
  name: string;
  category: string;
  usageCount: number;
  prCount: number;
  maxWeight: number | null;
  volumeTrend: number; // % change vs previous period
}

export interface VolumeTimelinePoint {
  date: string;
  label: string;
  volume: number;
  eVolume: number;
  volumePrevious?: number;
}

// ============ GENDER / AGE / PROGRESSION TYPES ============

export interface GenderStats {
  avgWeight: number;
  maxWeight: number;
  tonnage: number;
  prCount: number;
  entryCount: number;
  clientCount: number;
}

export interface GenderComparison {
  male: GenderStats;
  female: GenderStats;
}

export interface AgeGroupStats {
  ageGroup: string;
  avgWeight: number;
  maxWeight: number;
  prCount: number;
  clientCount: number;
  entryCount: number;
}

export interface WeightProgressionWeek {
  label: string;
  avgWeight: number;
}

export interface WeightProgressionExercise {
  exerciseName: string;
  weeks: WeightProgressionWeek[];
}

export interface TopExerciseByGender {
  name: string;
  maxWeight: number;
  entryCount: number;
}

export interface PRDistributionMonth {
  month: string;
  label: string;
  male: number;
  female: number;
  unknown: number;
}

export interface ClientProgressItem {
  clientId: string;
  clientName: string;
  avgWeightFirst: number;
  avgWeightSecond: number;
  improvement: number;
  entryCount: number;
  frequency: number;
}

export interface ClientVolumeItem {
  clientId: string;
  clientName: string;
  totalVolume: number;
}

export interface ExerciseByClientItem {
  exerciseName: string;
  clients: { name: string; count: number; maxWeight: number | null }[];
}

export interface ClientWeeklyWeightItem {
  clientName: string;
  weeks: { label: string; avgWeight: number }[];
}

export interface AnalyticsData {
  kpi: AnalyticsKPI;
  volumeTimeline: VolumeTimelinePoint[];
  prTimeline: PRTimelinePoint[];
  rpeTimeline: RpeTimelinePoint[];
  loadDistribution: { group: string; label: string; value: number }[];
  movementPatterns: { pattern: string; label: string; count: number }[];
  topExercises: TopExerciseItem[];
  insight: string;
  stagnatingClients: StagnatingClient[];
  movementGaps: MovementGap[];
  unusedExercises: UnusedExercise[];
  totalExercisesInLibrary: number;
  clientsNeedingAttention: ClientNeedingAttention[];
  exerciseRpeRanking: ExerciseRpeRanking[];
  rpeProgressCorrelation: RpeProgressCorrelation[];
  genderComparison: GenderComparison;
  ageGroupComparison: AgeGroupStats[];
  weightProgression: WeightProgressionExercise[];
  topExercisesByGender: { male: TopExerciseByGender[]; female: TopExerciseByGender[] };
  prDistribution: PRDistributionMonth[];
  clientProgressRanking: ClientProgressItem[];
  clientVolumeComparison: ClientVolumeItem[];
  exerciseByClient: ExerciseByClientItem[];
  clientWeightProgression: ClientWeeklyWeightItem[];
}

const BODY_PART_LABELS: Record<string, string> = {
  upper: 'Horní část',
  lower: 'Dolní část',
  core: 'Core',
  other: 'Ostatní',
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
  conditioning: 'Kondice',
  mobility: 'Mobilita',
};

export function useExerciseAnalyticsComplete(
  period: AnalyticsPeriod = 30,
  clientId?: string | null,
  includeTests: boolean = false
) {
  const { user } = useAuth();
  const days = period === 'custom' ? 90 : period;

  return useQuery({
    queryKey: ['exercise-analytics-complete', user?.id, days, clientId, includeTests],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!user?.id) throw new Error('No user');

      const now = new Date();
      const startDate = subDays(now, days);
      const prevStartDate = subDays(startDate, days);
      const dateStr = format(startDate, 'yyyy-MM-dd');
      const prevDateStr = format(prevStartDate, 'yyyy-MM-dd');

      // Build base query for current period
      let currentQuery = supabase
        .from('exercise_entries')
        .select(`
          id, client_id, exercise_id, exercise_name, date, sets, reps, 
          weight_kg, is_bodyweight, is_pr, is_test, rpe, side,
          exercises!exercise_entries_exercise_id_fkey (
            id, category, movement_pattern
          )
        `)
        .eq('user_id', user.id)
        .gte('date', dateStr)
        .order('date', { ascending: true });

      // Exclude tests unless toggle is on
      if (!includeTests) {
        currentQuery = currentQuery.or('is_test.is.null,is_test.eq.false');
      }

      if (clientId) {
        currentQuery = currentQuery.eq('client_id', clientId);
      }

      // Build query for previous period (for trends)
      let prevQuery = supabase
        .from('exercise_entries')
        .select('id, client_id, sets, reps, weight_kg, is_bodyweight, is_pr, rpe, date')
        .eq('user_id', user.id)
        .gte('date', prevDateStr)
        .lt('date', dateStr);

      if (!includeTests) {
        prevQuery = prevQuery.or('is_test.is.null,is_test.eq.false');
      }

      if (clientId) {
        prevQuery = prevQuery.eq('client_id', clientId);
      }

      const [{ data: entries, error }, { data: prevEntries }] = await Promise.all([
        currentQuery,
        prevQuery,
      ]);

      if (error) throw error;

      // ============ FETCH ADDITIONAL DATA FOR NEW CARDS ============
      
      // Fetch all clients for this trainer (including gender & birth_date)
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, gender, birth_date')
        .eq('user_id', user.id);

      const clientMap = new Map<string, string>();
      const clientGenderMap = new Map<string, string | null>();
      const clientBirthDateMap = new Map<string, string | null>();
      clients?.forEach(c => {
        clientMap.set(c.id, c.name);
        clientGenderMap.set(c.id, c.gender);
        clientBirthDateMap.set(c.id, c.birth_date);
      });

      // Fetch all exercises in trainer's library
      const { data: allExercises } = await supabase
        .from('exercises')
        .select('id, name')
        .or(`user_id.eq.${user.id},source.eq.system`);

      const totalExercisesInLibrary = allExercises?.length || 0;

      // Fetch body part categories for load distribution
      const exerciseIds = [...new Set((entries || []).map(e => e.exercise_id).filter(Boolean) as string[])];
      const { data: exerciseBodyParts } = await supabase
        .from('exercise_body_part_categories')
        .select('*')
        .in('exercise_id', exerciseIds);

      const exerciseToBodyParts = new Map<string, Set<string>>();
      exerciseBodyParts?.forEach(ebp => {
        if (!exerciseToBodyParts.has(ebp.exercise_id)) {
          exerciseToBodyParts.set(ebp.exercise_id, new Set());
        }
        exerciseToBodyParts.get(ebp.exercise_id)!.add(ebp.body_part_key);
      });

      // ============ CALCULATE KPIs ============
      
      // Tonnage: SUM(sets * reps * weight_kg) for non-bodyweight only
      const tonnage = (entries || []).reduce((sum, e) => {
        if (e.is_bodyweight || !e.weight_kg) return sum;
        return sum + (e.sets || 1) * (e.reps || 1) * e.weight_kg;
      }, 0);

      const prevTonnage = (prevEntries || []).reduce((sum, e) => {
        if (e.is_bodyweight || !e.weight_kg) return sum;
        return sum + (e.sets || 1) * (e.reps || 1) * e.weight_kg;
      }, 0);

      const tonnageTrend = prevTonnage > 0 
        ? Math.round(((tonnage - prevTonnage) / prevTonnage) * 100) 
        : 0;

      // eVolume: SUM(sets * reps * weight_kg * (rpe / 10)) for entries with RPE
      const eVolume = (entries || []).reduce((sum, e) => {
        if (e.is_bodyweight || !e.weight_kg || !e.rpe || e.rpe <= 0) return sum;
        return sum + (e.sets || 1) * (e.reps || 1) * e.weight_kg * (e.rpe / 10);
      }, 0);

      const prevEVolume = (prevEntries || []).reduce((sum, e) => {
        if (e.is_bodyweight || !e.weight_kg || !e.rpe || e.rpe <= 0) return sum;
        return sum + (e.sets || 1) * (e.reps || 1) * e.weight_kg * (e.rpe / 10);
      }, 0);

      const eVolumeTrend = prevEVolume > 0 
        ? Math.round(((eVolume - prevEVolume) / prevEVolume) * 100) 
        : 0;

      // PR count
      const prCount = (entries || []).filter(e => e.is_pr).length;
      const prevPrCount = (prevEntries || []).filter(e => e.is_pr).length;
      const prTrend = prevPrCount > 0 
        ? Math.round(((prCount - prevPrCount) / prevPrCount) * 100) 
        : prCount > 0 ? 100 : 0;

      // Frequency: unique training days per week
      const trainingDays = new Set((entries || []).map(e => e.date));
      const weeks = days / 7;
      const frequency = weeks > 0 ? trainingDays.size / weeks : 0;

      const prevTrainingDays = new Set((prevEntries || []).map(e => e.date));
      const prevFrequency = weeks > 0 ? prevTrainingDays.size / weeks : 0;
      const frequencyTrend = prevFrequency > 0 
        ? Math.round(((frequency - prevFrequency) / prevFrequency) * 100) 
        : 0;

      // Avg RPE
      const rpeValues = (entries || []).filter(e => e.rpe != null).map(e => e.rpe!);
      const avgRpe = rpeValues.length > 0 
        ? Math.round((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10) / 10 
        : null;

      const prevRpeValues = (prevEntries || []).filter(e => e.rpe != null).map(e => e.rpe!);
      const prevAvgRpe = prevRpeValues.length > 0 
        ? prevRpeValues.reduce((a, b) => a + b, 0) / prevRpeValues.length 
        : null;
      
      const rpeTrend = prevAvgRpe && avgRpe 
        ? Math.round((avgRpe - prevAvgRpe) * 10) / 10 
        : 0;

      // BW Reps: SUM(sets * reps) for bodyweight exercises
      const bwReps = (entries || []).reduce((sum, e) => {
        if (!e.is_bodyweight) return sum;
        return sum + (e.sets || 1) * (e.reps || 1);
      }, 0);

      const prevBwReps = (prevEntries || []).reduce((sum, e) => {
        if (!e.is_bodyweight) return sum;
        return sum + (e.sets || 1) * (e.reps || 1);
      }, 0);

      const bwRepsTrend = prevBwReps > 0 
        ? Math.round(((bwReps - prevBwReps) / prevBwReps) * 100) 
        : 0;

      // ============ STAGNATING CLIENTS ============
      // Group entries by client + exercise to find stagnation
      const clientExerciseProgress = new Map<string, { 
        clientId: string; 
        clientName: string;
        exerciseName: string;
        weeklyMaxes: Map<string, number>;
      }>();

      (entries || []).forEach(e => {
        if (!e.client_id || e.is_bodyweight) return;
        const key = `${e.client_id}-${e.exercise_id || e.exercise_name}`;
        const weekKey = format(startOfWeek(parseISO(e.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        
        if (!clientExerciseProgress.has(key)) {
          clientExerciseProgress.set(key, {
            clientId: e.client_id,
            clientName: clientMap.get(e.client_id) || 'Neznámý',
            exerciseName: e.exercise_name,
            weeklyMaxes: new Map(),
          });
        }
        
        const progress = clientExerciseProgress.get(key)!;
        const currentMax = progress.weeklyMaxes.get(weekKey) || 0;
        const entryValue = e.weight_kg || 0;
        if (entryValue > currentMax) {
          progress.weeklyMaxes.set(weekKey, entryValue);
        }
      });

      const stagnatingClients: StagnatingClient[] = [];
      clientExerciseProgress.forEach((progress) => {
        const sortedWeeks = Array.from(progress.weeklyMaxes.entries())
          .sort((a, b) => a[0].localeCompare(b[0]));
        
        if (sortedWeeks.length >= 3) {
          const recentWeeks = sortedWeeks.slice(-4);
          const maxValues = recentWeeks.map(w => w[1]);
          const maxVal = Math.max(...maxValues);
          
          // Check if no improvement in last 3+ weeks
          const stagnantWeeks = maxValues.filter(v => v === maxVal).length;
          if (stagnantWeeks >= 3 && maxVal > 0) {
            stagnatingClients.push({
              clientId: progress.clientId,
              clientName: progress.clientName,
              exerciseName: progress.exerciseName,
              weeksStagnant: stagnantWeeks,
              lastValue: maxVal,
            });
          }
        }
      });

      // ============ MOVEMENT GAPS ============
      const patternCounts = new Map<string, number>();
      let totalPatternEntries = 0;
      
      (entries || []).forEach(e => {
        const exercise = e.exercises as any;
        const pattern = exercise?.movement_pattern;
        if (pattern && MOVEMENT_PATTERN_LABELS[pattern]) {
          patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
          totalPatternEntries++;
        }
      });

      const movementGaps: MovementGap[] = Object.keys(MOVEMENT_PATTERN_LABELS)
        .map(pattern => {
          const count = patternCounts.get(pattern) || 0;
          const percentage = totalPatternEntries > 0 ? (count / totalPatternEntries) * 100 : 0;
          return {
            pattern,
            label: MOVEMENT_PATTERN_LABELS[pattern],
            usageCount: count,
            isUnderworked: percentage < 5 && count < 3,
            totalCount: totalPatternEntries,
          };
        })
        .filter(p => p.usageCount > 0 || p.isUnderworked);

      // ============ UNUSED EXERCISES ============
      const usedExerciseIds = new Set((entries || []).map(e => e.exercise_id).filter(Boolean));
      
      const unusedExercises: UnusedExercise[] = (allExercises || [])
        .filter(ex => !usedExerciseIds.has(ex.id))
        .map(ex => ({
          id: ex.id,
          name: ex.name,
          lastUsedDate: null,
          daysSinceUse: days + 1, // More than the period
        }))
        .slice(0, 20);

      // ============ CLIENTS NEEDING ATTENTION ============
      const clientStats = new Map<string, {
        clientId: string;
        clientName: string;
        prCount: number;
        currentFrequency: number;
        prevFrequency: number;
      }>();

      // Current period stats per client
      (entries || []).forEach(e => {
        if (!e.client_id) return;
        if (!clientStats.has(e.client_id)) {
          clientStats.set(e.client_id, {
            clientId: e.client_id,
            clientName: clientMap.get(e.client_id) || 'Neznámý',
            prCount: 0,
            currentFrequency: 0,
            prevFrequency: 0,
          });
        }
        const stats = clientStats.get(e.client_id)!;
        if (e.is_pr) stats.prCount++;
      });

      // Calculate frequency per client
      const clientDays = new Map<string, Set<string>>();
      const clientPrevDays = new Map<string, Set<string>>();

      (entries || []).forEach(e => {
        if (!e.client_id) return;
        if (!clientDays.has(e.client_id)) clientDays.set(e.client_id, new Set());
        clientDays.get(e.client_id)!.add(e.date);
      });

      (prevEntries || []).forEach(e => {
        if (!e.client_id) return;
        if (!clientPrevDays.has(e.client_id)) clientPrevDays.set(e.client_id, new Set());
        clientPrevDays.get(e.client_id)!.add(e.date);
      });

      clientStats.forEach((stats, clientId) => {
        const currDays = clientDays.get(clientId)?.size || 0;
        const prevDaysCount = clientPrevDays.get(clientId)?.size || 0;
        stats.currentFrequency = currDays / weeks;
        stats.prevFrequency = prevDaysCount / weeks;
      });

      const clientsNeedingAttention: ClientNeedingAttention[] = [];

      clientStats.forEach((stats) => {
        const reasons: AttentionReason[] = [];
        
        if (stats.prCount === 0 && stats.currentFrequency > 0) {
          reasons.push('no_pr');
        }
        
        if (stats.prevFrequency > 0 && stats.currentFrequency < stats.prevFrequency * 0.7) {
          reasons.push('declining_frequency');
        }
        
        if (reasons.length > 0) {
          const priority = reasons.length >= 2 ? 'high' : reasons.includes('declining_frequency') ? 'medium' : 'low';
          clientsNeedingAttention.push({
            clientId: stats.clientId,
            clientName: stats.clientName,
            reasons,
            priority,
          });
        }
      });

      // ============ VOLUME TIMELINE (weekly) ============
      const weekIntervals = eachWeekOfInterval(
        { start: startDate, end: now },
        { weekStartsOn: 1 }
      );

      const volumeTimeline: VolumeTimelinePoint[] = weekIntervals.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekEntries = (entries || []).filter(e => {
          const d = parseISO(e.date);
          return d >= weekStart && d <= weekEnd;
        });

        const volume = weekEntries.reduce((sum, e) => {
          if (e.is_bodyweight || !e.weight_kg) return sum;
          return sum + (e.sets || 1) * (e.reps || 1) * e.weight_kg;
        }, 0);

        const weekEVolume = weekEntries.reduce((sum, e) => {
          if (e.is_bodyweight || !e.weight_kg || !e.rpe || e.rpe <= 0) return sum;
          return sum + (e.sets || 1) * (e.reps || 1) * e.weight_kg * (e.rpe / 10);
        }, 0);

        return {
          date: format(weekStart, 'yyyy-MM-dd'),
          label: format(weekStart, 'd.M', { locale: cs }),
          volume,
          eVolume: weekEVolume,
        };
      });

      // ============ PR TIMELINE (weekly with cumulative) ============
      let cumulative = 0;
      const prTimeline: PRTimelinePoint[] = weekIntervals.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekPRs = (entries || []).filter(e => {
          const d = parseISO(e.date);
          return e.is_pr && d >= weekStart && d <= weekEnd;
        });

        cumulative += weekPRs.length;

        return {
          week: format(weekStart, 'yyyy-MM-dd'),
          label: format(weekStart, 'd.M', { locale: cs }),
          count: weekPRs.length,
          cumulative,
        };
      });

      // ============ RPE TIMELINE (weekly average) ============
      const rpeTimeline: RpeTimelinePoint[] = weekIntervals.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekEntries = (entries || []).filter(e => {
          const d = parseISO(e.date);
          return e.rpe != null && d >= weekStart && d <= weekEnd;
        });

        const weekRpes = weekEntries.map(e => e.rpe!);
        const avgWeekRpe = weekRpes.length > 0 
          ? Math.round((weekRpes.reduce((a, b) => a + b, 0) / weekRpes.length) * 10) / 10 
          : 0;

        return {
          week: format(weekStart, 'yyyy-MM-dd'),
          label: format(weekStart, 'd.M', { locale: cs }),
          avgRpe: avgWeekRpe,
          entryCount: weekEntries.length,
        };
      });

      // ============ LOAD DISTRIBUTION ============
      const bodyPartVolumes: Record<string, number> = { upper: 0, lower: 0, core: 0 };

      (entries || []).forEach(e => {
        if (e.is_bodyweight || !e.weight_kg) return;
        const volume = (e.sets || 1) * (e.reps || 1) * e.weight_kg;
        const bodyParts = exerciseToBodyParts.get(e.exercise_id || '') || new Set(['other']);
        const partCount = bodyParts.size || 1;
        bodyParts.forEach(bp => {
          if (bp in bodyPartVolumes) {
            bodyPartVolumes[bp] += volume / partCount;
          }
        });
      });

      const totalBpVolume = Object.values(bodyPartVolumes).reduce((sum, v) => sum + v, 0) || 1;
      const loadDistribution = ['lower', 'upper', 'core'].map(group => ({
        group,
        label: BODY_PART_LABELS[group],
        value: Math.round((bodyPartVolumes[group] / totalBpVolume) * 100),
      }));

      // ============ MOVEMENT PATTERNS ============
      // Reuse patternCounts from MOVEMENT GAPS section
      const movementPatterns = Array.from(patternCounts.entries())
        .map(([pattern, count]) => ({
          pattern: pattern.toLowerCase().replace(/\s/g, '_'),
          label: MOVEMENT_PATTERN_LABELS[pattern] || pattern,
          count: count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // ============ TOP EXERCISES ============
      const exerciseStats = new Map<string, {
        id: string;
        name: string;
        category: string;
        usageCount: number;
        prCount: number;
        maxWeight: number | null;
        currentVolume: number;
      }>();

      (entries || []).forEach(e => {
        const exerciseId = e.exercise_id;
        if (!exerciseId) return;
        
        const exercise = e.exercises as any;
        const existing = exerciseStats.get(exerciseId);
        const volume = e.is_bodyweight ? 0 : (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 0);
        
        if (existing) {
          existing.usageCount += 1;
          if (e.is_pr) existing.prCount += 1;
          if (e.weight_kg && (!existing.maxWeight || e.weight_kg > existing.maxWeight)) {
            existing.maxWeight = e.weight_kg;
          }
          existing.currentVolume += volume;
        } else {
          exerciseStats.set(exerciseId, {
            id: exerciseId,
            name: e.exercise_name,
            category: exercise?.category || 'Ostatní',
            usageCount: 1,
            prCount: e.is_pr ? 1 : 0,
            maxWeight: e.weight_kg || null,
            currentVolume: volume,
          });
        }
      });

      // Calculate previous period volume per exercise for trend
      const prevExerciseVolumes = new Map<string, number>();
      (prevEntries || []).forEach(e => {
        // Note: prevEntries doesn't have exercise_id in select, so we skip trend calculation
        // or we need a separate query - for now, set trend to 0
      });

      const topExercises: TopExerciseItem[] = Array.from(exerciseStats.values())
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10)
        .map(ex => ({
          id: ex.id,
          name: ex.name,
          category: ex.category,
          usageCount: ex.usageCount,
          prCount: ex.prCount,
          maxWeight: ex.maxWeight,
          volumeTrend: 0, // Simplified - would need separate query for accurate trend
        }));

      // ============ GENERATE INSIGHT ============
      let insight = '';
      
      if (tonnageTrend > 10) {
        insight = `Objem vzrostl o ${tonnageTrend}% oproti předchozímu období. `;
      } else if (tonnageTrend < -10) {
        insight = `Objem klesl o ${Math.abs(tonnageTrend)}% oproti předchozímu období. `;
      } else {
        insight = 'Objem zůstává stabilní. ';
      }

      if (prCount > 0) {
        insight += `Dosaženo ${prCount} osobních rekordů. `;
      }

      if (avgRpe !== null) {
        if (avgRpe >= 8) {
          insight += 'Vysoká intenzita – zvažte regeneraci.';
        } else if (avgRpe <= 5) {
          insight += 'Nízká intenzita – prostor pro navýšení zátěže.';
        }
      }

      // ============ RPE BY EXERCISE RANKING ============
      const exerciseRpeMap = new Map<string, { name: string; rpeSum: number; count: number }>();
      (entries || []).forEach(e => {
        if (!e.rpe || e.rpe <= 0) return;
        const key = e.exercise_id || e.exercise_name;
        const existing = exerciseRpeMap.get(key);
        if (existing) {
          existing.rpeSum += e.rpe;
          existing.count++;
        } else {
          exerciseRpeMap.set(key, { name: e.exercise_name, rpeSum: e.rpe, count: 1 });
        }
      });

      const exerciseRpeRanking: ExerciseRpeRanking[] = Array.from(exerciseRpeMap.values())
        .filter(ex => ex.count >= 3)
        .map(ex => ({
          name: ex.name,
          avgRpe: Math.round((ex.rpeSum / ex.count) * 10) / 10,
          entryCount: ex.count,
        }))
        .sort((a, b) => b.avgRpe - a.avgRpe);

      // ============ RPE VS PROGRESS CORRELATION ============
      const rpeProgressCorrelation: RpeProgressCorrelation[] = [];
      const midDate = new Date(startDate.getTime() + (now.getTime() - startDate.getTime()) / 2);

      // Group entries by exercise with RPE
      const exerciseEntriesForCorrelation = new Map<string, { name: string; entries: Array<{ date: Date; weight: number; rpe: number }> }>();
      (entries || []).forEach(e => {
        if (!e.rpe || e.rpe <= 0 || e.is_bodyweight || !e.weight_kg) return;
        const key = e.exercise_id || e.exercise_name;
        if (!exerciseEntriesForCorrelation.has(key)) {
          exerciseEntriesForCorrelation.set(key, { name: e.exercise_name, entries: [] });
        }
        exerciseEntriesForCorrelation.get(key)!.entries.push({
          date: parseISO(e.date),
          weight: e.weight_kg,
          rpe: e.rpe,
        });
      });

      exerciseEntriesForCorrelation.forEach((data) => {
        if (data.entries.length < 6) return;
        const firstHalf = data.entries.filter(e => e.date < midDate);
        const secondHalf = data.entries.filter(e => e.date >= midDate);
        if (firstHalf.length < 2 || secondHalf.length < 2) return;

        const avgWeight1 = firstHalf.reduce((s, e) => s + e.weight, 0) / firstHalf.length;
        const avgWeight2 = secondHalf.reduce((s, e) => s + e.weight, 0) / secondHalf.length;
        const avgRpe1 = firstHalf.reduce((s, e) => s + e.rpe, 0) / firstHalf.length;
        const avgRpe2 = secondHalf.reduce((s, e) => s + e.rpe, 0) / secondHalf.length;

        const weightChange = avgWeight1 > 0 ? ((avgWeight2 - avgWeight1) / avgWeight1) * 100 : 0;
        const rpeChange = avgRpe2 - avgRpe1;

        let status: RpeProgressCorrelation['status'];
        if (weightChange > 2 && rpeChange <= 0.3) {
          status = 'true_strength_gain';
        } else if (weightChange > 2 && rpeChange > 0.3) {
          status = 'effort_increase';
        } else {
          status = 'fatigue_signal';
        }

        rpeProgressCorrelation.push({
          exerciseName: data.name,
          weightTrend: Math.round(weightChange * 10) / 10,
          rpeTrend: Math.round(rpeChange * 10) / 10,
          status,
        });
      });

      // ============ CHRONIC HIGH RPE DETECTION ============
      // Detect clients with avg RPE >= 9 for 3+ consecutive weeks without PR
      if (!clientId) {
        const clientWeeklyRpe = new Map<string, Map<string, { rpeSum: number; count: number; hasPr: boolean }>>();
        (entries || []).forEach(e => {
          if (!e.client_id || !e.rpe) return;
          const weekKey = format(startOfWeek(parseISO(e.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
          if (!clientWeeklyRpe.has(e.client_id)) clientWeeklyRpe.set(e.client_id, new Map());
          const weekMap = clientWeeklyRpe.get(e.client_id)!;
          if (!weekMap.has(weekKey)) weekMap.set(weekKey, { rpeSum: 0, count: 0, hasPr: false });
          const w = weekMap.get(weekKey)!;
          w.rpeSum += e.rpe;
          w.count++;
          if (e.is_pr) w.hasPr = true;
        });

        clientWeeklyRpe.forEach((weekMap, cId) => {
          const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
          let consecutiveHigh = 0;
          for (const [, data] of sortedWeeks) {
            const weekAvg = data.count > 0 ? data.rpeSum / data.count : 0;
            if (weekAvg >= 9 && !data.hasPr) {
              consecutiveHigh++;
            } else {
              consecutiveHigh = 0;
            }
          }
          if (consecutiveHigh >= 3) {
            // Add to existing attention entry or create new
            const existing = clientsNeedingAttention.find(c => c.clientId === cId);
            if (existing) {
              existing.reasons.push('chronic_high_rpe');
              existing.priority = 'high';
            } else {
              clientsNeedingAttention.push({
                clientId: cId,
                clientName: clientMap.get(cId) || 'Neznámý',
                reasons: ['chronic_high_rpe'],
                priority: 'high',
              });
            }
          }
        });
      }

      // ============ GENDER COMPARISON ============
      const genderEntries = { male: [] as any[], female: [] as any[] };
      const genderClients = { male: new Set<string>(), female: new Set<string>() };
      
      (entries || []).forEach(e => {
        if (!e.client_id) return;
        const gender = clientGenderMap.get(e.client_id);
        if (gender === 'male' || gender === 'female') {
          genderEntries[gender].push(e);
          genderClients[gender].add(e.client_id);
        }
      });

      const calcGenderStats = (ents: any[], clientSet: Set<string>): GenderStats => {
        const weighted = ents.filter(e => !e.is_bodyweight && e.weight_kg > 0);
        const weights = weighted.map(e => e.weight_kg as number);
        return {
          avgWeight: weights.length > 0 ? Math.round(weights.reduce((a, b) => a + b, 0) / weights.length * 10) / 10 : 0,
          maxWeight: weights.length > 0 ? Math.max(...weights) : 0,
          tonnage: weighted.reduce((s, e) => s + (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 0), 0),
          prCount: ents.filter(e => e.is_pr).length,
          entryCount: ents.length,
          clientCount: clientSet.size,
        };
      };

      const genderComparison: GenderComparison = {
        male: calcGenderStats(genderEntries.male, genderClients.male),
        female: calcGenderStats(genderEntries.female, genderClients.female),
      };

      // ============ AGE GROUP COMPARISON ============
      const ageGroups: AgeGroupStats[] = [];
      const ageBuckets: Record<string, { entries: any[]; clients: Set<string> }> = {
        'pod 25': { entries: [], clients: new Set() },
        '25–35': { entries: [], clients: new Set() },
        '35–45': { entries: [], clients: new Set() },
        '45+': { entries: [], clients: new Set() },
      };

      const getAgeBucket = (birthDate: string): string | null => {
        const age = Math.floor(differenceInDays(now, parseISO(birthDate)) / 365.25);
        if (age < 25) return 'pod 25';
        if (age < 35) return '25–35';
        if (age < 45) return '35–45';
        return '45+';
      };

      (entries || []).forEach(e => {
        if (!e.client_id) return;
        const bd = clientBirthDateMap.get(e.client_id);
        if (!bd) return;
        const bucket = getAgeBucket(bd);
        if (!bucket) return;
        ageBuckets[bucket].entries.push(e);
        ageBuckets[bucket].clients.add(e.client_id);
      });

      Object.entries(ageBuckets).forEach(([label, { entries: ents, clients: cls }]) => {
        if (cls.size === 0) return;
        const weighted = ents.filter(e => !e.is_bodyweight && e.weight_kg > 0);
        const weights = weighted.map(e => e.weight_kg as number);
        ageGroups.push({
          ageGroup: label,
          avgWeight: weights.length > 0 ? Math.round(weights.reduce((a, b) => a + b, 0) / weights.length * 10) / 10 : 0,
          maxWeight: weights.length > 0 ? Math.max(...weights) : 0,
          prCount: ents.filter(e => e.is_pr).length,
          clientCount: cls.size,
          entryCount: ents.length,
        });
      });

      // ============ WEIGHT PROGRESSION (top 5 exercises, weekly avg) ============
      const exerciseUsage = new Map<string, { name: string; count: number }>();
      (entries || []).forEach(e => {
        if (e.is_bodyweight || !e.weight_kg || !e.exercise_id) return;
        const ex = exerciseUsage.get(e.exercise_id);
        if (ex) ex.count++;
        else exerciseUsage.set(e.exercise_id, { name: e.exercise_name, count: 1 });
      });

      const top5Exercises = Array.from(exerciseUsage.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);

      const weightProgression: WeightProgressionExercise[] = top5Exercises.map(([exId, { name }]) => {
        const exEntries = (entries || []).filter(e => e.exercise_id === exId && e.weight_kg && !e.is_bodyweight);
        const weekData = weekIntervals.map(weekStart => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const weekEntries = exEntries.filter(e => {
            const d = parseISO(e.date);
            return d >= weekStart && d <= weekEnd;
          });
          const weights = weekEntries.map(e => e.weight_kg as number);
          return {
            label: format(weekStart, 'd.M', { locale: cs }),
            avgWeight: weights.length > 0 ? Math.round(weights.reduce((a, b) => a + b, 0) / weights.length * 10) / 10 : 0,
          };
        }).filter(w => w.avgWeight > 0);
        return { exerciseName: name, weeks: weekData };
      }).filter(wp => wp.weeks.length >= 2);

      // ============ TOP EXERCISES BY GENDER ============
      const calcTopByGender = (ents: any[]): TopExerciseByGender[] => {
        const map = new Map<string, { name: string; maxWeight: number; entryCount: number }>();
        ents.forEach(e => {
          if (e.is_bodyweight || !e.weight_kg) return;
          const key = e.exercise_id || e.exercise_name;
          const ex = map.get(key);
          if (ex) {
            ex.entryCount++;
            if (e.weight_kg > ex.maxWeight) ex.maxWeight = e.weight_kg;
          } else {
            map.set(key, { name: e.exercise_name, maxWeight: e.weight_kg, entryCount: 1 });
          }
        });
        return Array.from(map.values()).sort((a, b) => b.maxWeight - a.maxWeight).slice(0, 5);
      };

      const topExercisesByGender = {
        male: calcTopByGender(genderEntries.male),
        female: calcTopByGender(genderEntries.female),
      };

      // ============ PR DISTRIBUTION BY MONTH & GENDER ============
      const prDistMap = new Map<string, { male: number; female: number; unknown: number }>();
      (entries || []).forEach(e => {
        if (!e.is_pr) return;
        const monthKey = format(parseISO(e.date), 'yyyy-MM');
        const monthLabel = format(parseISO(e.date), 'MMM yy', { locale: cs });
        if (!prDistMap.has(monthKey)) {
          prDistMap.set(monthKey, { male: 0, female: 0, unknown: 0 });
        }
        const bucket = prDistMap.get(monthKey)!;
        const gender = e.client_id ? clientGenderMap.get(e.client_id) : null;
        if (gender === 'male') bucket.male++;
        else if (gender === 'female') bucket.female++;
        else bucket.unknown++;
      });

      const prDistribution: PRDistributionMonth[] = Array.from(prDistMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, val]) => ({
          month: key,
          label: format(parseISO(key + '-01'), 'MMM yy', { locale: cs }),
          ...val,
        }));

      // ============ NEW: AVG WEIGHT PER ENTRY ============
      const weightedEntries = (entries || []).filter(e => !e.is_bodyweight && e.weight_kg && e.weight_kg > 0);
      const avgWeightPerEntry = weightedEntries.length > 0
        ? Math.round(weightedEntries.reduce((s, e) => s + (e.weight_kg || 0), 0) / weightedEntries.length * 10) / 10
        : 0;
      const prevWeightedEntries = (prevEntries || []).filter(e => !e.is_bodyweight && e.weight_kg && e.weight_kg > 0);
      const prevAvgWeightPerEntry = prevWeightedEntries.length > 0
        ? prevWeightedEntries.reduce((s, e) => s + (e.weight_kg || 0), 0) / prevWeightedEntries.length
        : 0;
      const avgWeightPerEntryTrend = prevAvgWeightPerEntry > 0
        ? Math.round(((avgWeightPerEntry - prevAvgWeightPerEntry) / prevAvgWeightPerEntry) * 100)
        : 0;

      // Active client count
      const activeClients = new Set((entries || []).map(e => e.client_id).filter(Boolean));
      const activeClientCount = activeClients.size;

      // ============ NEW: CLIENT PROGRESS RANKING ============
      const midDateForProgress = new Date(startDate.getTime() + (now.getTime() - startDate.getTime()) / 2);
      const clientProgressRanking: ClientProgressItem[] = [];
      const clientEntriesMap = new Map<string, { first: number[]; second: number[]; count: number; days: Set<string> }>();

      (entries || []).forEach(e => {
        if (!e.client_id || e.is_bodyweight || !e.weight_kg) return;
        if (!clientEntriesMap.has(e.client_id)) {
          clientEntriesMap.set(e.client_id, { first: [], second: [], count: 0, days: new Set() });
        }
        const c = clientEntriesMap.get(e.client_id)!;
        c.count++;
        c.days.add(e.date);
        if (parseISO(e.date) < midDateForProgress) c.first.push(e.weight_kg);
        else c.second.push(e.weight_kg);
      });

      clientEntriesMap.forEach((data, cId) => {
        if (data.first.length < 2 || data.second.length < 2) return;
        const avg1 = data.first.reduce((a, b) => a + b, 0) / data.first.length;
        const avg2 = data.second.reduce((a, b) => a + b, 0) / data.second.length;
        const improvement = avg1 > 0 ? Math.round(((avg2 - avg1) / avg1) * 1000) / 10 : 0;
        clientProgressRanking.push({
          clientId: cId,
          clientName: clientMap.get(cId) || 'Neznámý',
          avgWeightFirst: Math.round(avg1 * 10) / 10,
          avgWeightSecond: Math.round(avg2 * 10) / 10,
          improvement,
          entryCount: data.count,
          frequency: Math.round(data.days.size / weeks * 10) / 10,
        });
      });
      clientProgressRanking.sort((a, b) => b.improvement - a.improvement);

      // ============ NEW: CLIENT VOLUME COMPARISON ============
      const clientVolumeMap = new Map<string, number>();
      (entries || []).forEach(e => {
        if (!e.client_id || e.is_bodyweight || !e.weight_kg) return;
        const vol = (e.sets || 1) * (e.reps || 1) * e.weight_kg;
        clientVolumeMap.set(e.client_id, (clientVolumeMap.get(e.client_id) || 0) + vol);
      });
      const clientVolumeComparison: ClientVolumeItem[] = Array.from(clientVolumeMap.entries())
        .map(([id, vol]) => ({ clientId: id, clientName: clientMap.get(id) || 'Neznámý', totalVolume: vol }))
        .sort((a, b) => b.totalVolume - a.totalVolume);

      // ============ NEW: EXERCISE BY CLIENT MATRIX ============
      const exerciseClientMap = new Map<string, Map<string, { count: number; maxWeight: number | null }>>();
      (entries || []).forEach(e => {
        if (!e.client_id) return;
        const exName = e.exercise_name;
        if (!exerciseClientMap.has(exName)) exerciseClientMap.set(exName, new Map());
        const cMap = exerciseClientMap.get(exName)!;
        const cName = clientMap.get(e.client_id) || 'Neznámý';
        if (!cMap.has(cName)) cMap.set(cName, { count: 0, maxWeight: null });
        const c = cMap.get(cName)!;
        c.count++;
        if (e.weight_kg && (c.maxWeight === null || e.weight_kg > c.maxWeight)) c.maxWeight = e.weight_kg;
      });
      const exerciseByClient: ExerciseByClientItem[] = Array.from(exerciseClientMap.entries())
        .map(([name, cMap]) => ({
          exerciseName: name,
          clients: Array.from(cMap.entries()).map(([n, d]) => ({ name: n, ...d })).sort((a, b) => b.count - a.count),
        }))
        .sort((a, b) => b.clients.length - a.clients.length);

      // ============ NEW: CLIENT WEIGHT PROGRESSION (top 5 by volume) ============
      const top5Clients = clientVolumeComparison.slice(0, 5);
      const clientWeightProgression: ClientWeeklyWeightItem[] = top5Clients.map(cv => {
        const cEntries = (entries || []).filter(e => e.client_id === cv.clientId && !e.is_bodyweight && e.weight_kg);
        const weekData = weekIntervals.map(weekStart => {
          const weekEnd2 = endOfWeek(weekStart, { weekStartsOn: 1 });
          const wEntries = cEntries.filter(e => {
            const d = parseISO(e.date);
            return d >= weekStart && d <= weekEnd2;
          });
          const weights = wEntries.map(e => e.weight_kg as number);
          return {
            label: format(weekStart, 'd.M', { locale: cs }),
            avgWeight: weights.length > 0 ? Math.round(weights.reduce((a, b) => a + b, 0) / weights.length * 10) / 10 : 0,
          };
        }).filter(w => w.avgWeight > 0);
        return { clientName: cv.clientName, weeks: weekData };
      }).filter(c => c.weeks.length >= 2);

      return {
        kpi: {
          tonnage,
          tonnageTrend,
          eVolume,
          eVolumeTrend,
          prCount,
          prTrend,
          frequency: Math.round(frequency * 10) / 10,
          frequencyTrend,
          avgRpe,
          rpeTrend,
          bwReps,
          bwRepsTrend,
          clientsNeedingAttentionCount: clientsNeedingAttention.length,
          avgWeightPerEntry,
          avgWeightPerEntryTrend,
          activeClientCount,
        },
        volumeTimeline,
        prTimeline,
        rpeTimeline,
        loadDistribution,
        movementPatterns,
        topExercises,
        insight,
        stagnatingClients: stagnatingClients.slice(0, 10),
        movementGaps,
        unusedExercises,
        totalExercisesInLibrary,
        clientsNeedingAttention: clientsNeedingAttention.slice(0, 10),
        exerciseRpeRanking: exerciseRpeRanking.slice(0, 20),
        rpeProgressCorrelation: rpeProgressCorrelation.slice(0, 15),
        genderComparison,
        ageGroupComparison: ageGroups,
        weightProgression,
        topExercisesByGender,
        prDistribution,
        clientProgressRanking: clientProgressRanking.slice(0, 15),
        clientVolumeComparison,
        exerciseByClient: exerciseByClient.slice(0, 20),
        clientWeightProgression,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
