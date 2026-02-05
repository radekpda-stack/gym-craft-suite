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

export type AttentionReason = 'no_pr' | 'declining_frequency' | 'high_asymmetry';

export interface ClientNeedingAttention {
  clientId: string;
  clientName: string;
  reasons: AttentionReason[];
  priority: 'high' | 'medium' | 'low';
}

export interface AnalyticsKPI {
  tonnage: number;
  tonnageTrend: number;
  prCount: number;
  prTrend: number;
  frequency: number; // training days per week average
  frequencyTrend: number;
  avgRpe: number | null;
  rpeTrend: number;
  bwReps: number; // bodyweight reps (sets * reps for is_bodyweight=true)
  bwRepsTrend: number;
  clientsNeedingAttentionCount: number;
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

export interface AnalyticsData {
  kpi: AnalyticsKPI;
  volumeTimeline: VolumeTimelinePoint[];
  prTimeline: PRTimelinePoint[];
  rpeTimeline: RpeTimelinePoint[];
  loadDistribution: { group: string; label: string; value: number }[];
  movementPatterns: { pattern: string; label: string; count: number }[];
  topExercises: TopExerciseItem[];
  insight: string;
  // New trainer-focused data
  stagnatingClients: StagnatingClient[];
  movementGaps: MovementGap[];
  unusedExercises: UnusedExercise[];
  totalExercisesInLibrary: number;
  clientsNeedingAttention: ClientNeedingAttention[];
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
      
      // Fetch all clients for this trainer
      const { data: clients } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('user_id', user.id);

      const clientMap = new Map<string, string>();
      clients?.forEach(c => {
        clientMap.set(c.id, `${c.first_name} ${c.last_name}`);
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

        return {
          date: format(weekStart, 'yyyy-MM-dd'),
          label: format(weekStart, 'd.M', { locale: cs }),
          volume,
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

      return {
        kpi: {
          tonnage,
          tonnageTrend,
          prCount,
          prTrend,
          frequency: Math.round(frequency * 10) / 10,
          frequencyTrend,
          avgRpe,
          rpeTrend,
          bwReps,
          bwRepsTrend,
          clientsNeedingAttentionCount: clientsNeedingAttention.length,
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
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
