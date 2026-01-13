/**
 * Unified PR (Personal Record) Engine
 * 
 * Single source of truth for PR calculation, evaluation and recomputation.
 * Handles all metric types: weight, time, distance, height, watts, pace, reps.
 */

import { supabase } from '@/integrations/supabase/client';

// Metric definitions with their comparison rules
export type MetricKey = 
  | 'weight_kg' 
  | 'height_cm' 
  | 'distance_meters' 
  | 'time_seconds' 
  | 'avg_watts' 
  | 'pace_sec_per_500m' 
  | 'bw_reps' 
  | 'reps'
  | 'unknown';

export type SideScope = 'left' | 'right' | 'both' | 'none';

// For each metric, is higher or lower better?
export const METRIC_RULES: Record<MetricKey, 'higher' | 'lower' | 'none'> = {
  weight_kg: 'higher',
  height_cm: 'higher',
  distance_meters: 'higher',
  time_seconds: 'lower',
  avg_watts: 'higher',
  pace_sec_per_500m: 'lower',
  bw_reps: 'higher',
  reps: 'higher',
  unknown: 'none',
};

// Map DB column names to metric keys
export const METRIC_COLUMN_MAP: Record<MetricKey, string> = {
  weight_kg: 'weight_kg',
  height_cm: 'height_cm',
  distance_meters: 'distance_meters',
  time_seconds: 'time_seconds',
  avg_watts: 'avg_watts',
  pace_sec_per_500m: 'pace_sec_per_500m',
  bw_reps: 'reps', // bodyweight uses reps column
  reps: 'reps',
  unknown: 'weight_kg',
};

export interface PRScopeKey {
  clientId: string;
  exerciseId: string | null;
  exerciseName: string;
  metricKey: MetricKey;
  sideScope: SideScope;
}

/**
 * Generate a deterministic PR scope key string
 */
export function generatePRScopeKey(scope: PRScopeKey): string {
  const exerciseIdentifier = scope.exerciseId || scope.exerciseName;
  return `${scope.clientId}:${exerciseIdentifier}:${scope.metricKey}:${scope.sideScope}`;
}

/**
 * Determine the metric key from entry data
 */
export function determineMetricKey(entry: {
  weight_kg?: number | null;
  height_cm?: number | null;
  distance_meters?: number | null;
  time_seconds?: number | null;
  avg_watts?: number | null;
  pace_sec_per_500m?: number | null;
  is_bodyweight?: boolean;
  reps?: number | null;
}): MetricKey {
  if (entry.weight_kg && entry.weight_kg > 0) return 'weight_kg';
  if (entry.height_cm && entry.height_cm > 0) return 'height_cm';
  if (entry.distance_meters && entry.distance_meters > 0) return 'distance_meters';
  if (entry.time_seconds && entry.time_seconds > 0) return 'time_seconds';
  if (entry.avg_watts && entry.avg_watts > 0) return 'avg_watts';
  if (entry.pace_sec_per_500m && entry.pace_sec_per_500m > 0) return 'pace_sec_per_500m';
  if (entry.is_bodyweight && entry.reps && entry.reps > 0) return 'bw_reps';
  if (entry.reps && entry.reps > 0) return 'reps';
  return 'unknown';
}

/**
 * Normalize side value to SideScope
 */
export function normalizeSideScope(side?: string | null): SideScope {
  if (!side) return 'none';
  const normalized = side.toLowerCase();
  if (normalized === 'left' || normalized === 'l') return 'left';
  if (normalized === 'right' || normalized === 'r') return 'right';
  if (normalized === 'both' || normalized === 'bilateral') return 'both';
  return 'none';
}

/**
 * Get the value for a specific metric from an entry
 */
export function getMetricValue(entry: Record<string, unknown>, metricKey: MetricKey): number | null {
  const column = METRIC_COLUMN_MAP[metricKey];
  const value = entry[column];
  if (typeof value === 'number' && value > 0) return value;
  return null;
}

/**
 * Compare two values based on metric rules
 * Returns true if newValue is a PR compared to existingBest
 */
export function isPRValue(newValue: number, existingBest: number | null, metricKey: MetricKey): boolean {
  const rule = METRIC_RULES[metricKey];
  if (rule === 'none') return false;
  if (existingBest === null) return true;
  
  if (rule === 'higher') {
    return newValue > existingBest;
  } else {
    return newValue < existingBest;
  }
}

/**
 * Check if an entry is a PR by querying existing records
 */
export async function checkIsPR(entry: {
  client_id: string;
  exercise_id?: string | null;
  exercise_name: string;
  side?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  distance_meters?: number | null;
  time_seconds?: number | null;
  avg_watts?: number | null;
  pace_sec_per_500m?: number | null;
  is_bodyweight?: boolean;
  reps?: number | null;
}, excludeEntryId?: string): Promise<{ isPR: boolean; oldValue: number | null; metricKey: MetricKey }> {
  const metricKey = determineMetricKey(entry);
  const sideScope = normalizeSideScope(entry.side);
  const rule = METRIC_RULES[metricKey];
  
  if (rule === 'none') {
    return { isPR: false, oldValue: null, metricKey };
  }
  
  const column = METRIC_COLUMN_MAP[metricKey];
  const newValue = getMetricValue(entry as Record<string, unknown>, metricKey);
  
  if (newValue === null) {
    return { isPR: false, oldValue: null, metricKey };
  }
  
  // Build query for best existing value
  let query = supabase
    .from('exercise_entries')
    .select(column)
    .eq('client_id', entry.client_id)
    .not(column, 'is', null);
  
  // Match by exercise_id if available, otherwise by name
  if (entry.exercise_id) {
    query = query.eq('exercise_id', entry.exercise_id);
  } else {
    query = query.eq('exercise_name', entry.exercise_name);
  }
  
  // Filter by side for unilateral exercises
  if (sideScope === 'left' || sideScope === 'right') {
    query = query.eq('side_scope', sideScope);
  }
  
  // Exclude current entry if updating
  if (excludeEntryId) {
    query = query.neq('id', excludeEntryId);
  }
  
  // Order by best value
  query = query.order(column, { ascending: rule === 'lower' }).limit(1);
  
  const { data: existingEntries, error } = await query;
  
  if (error) {
    console.error('Error checking PR:', error);
    return { isPR: false, oldValue: null, metricKey };
  }
  
  const existingBest = existingEntries?.[0]?.[column] as number | null ?? null;
  const isPR = isPRValue(newValue, existingBest, metricKey);
  
  return { isPR, oldValue: existingBest, metricKey };
}

/**
 * Recompute all PRs for a given scope after an entry is added/updated/deleted
 * This ensures deterministic PR flags across all entries in the scope
 */
export async function recomputePRsForScope(scope: {
  clientId: string;
  exerciseId: string | null;
  exerciseName: string;
  metricKey: MetricKey;
  sideScope: SideScope;
}): Promise<void> {
  const rule = METRIC_RULES[scope.metricKey];
  if (rule === 'none') return;
  
  const column = METRIC_COLUMN_MAP[scope.metricKey];
  
  // Build query to get all entries for this scope
  let query = supabase
    .from('exercise_entries')
    .select('id, weight_kg, height_cm, distance_meters, time_seconds, avg_watts, pace_sec_per_500m, reps, date, created_at')
    .eq('client_id', scope.clientId)
    .not(column, 'is', null);
  
  if (scope.exerciseId) {
    query = query.eq('exercise_id', scope.exerciseId);
  } else {
    query = query.eq('exercise_name', scope.exerciseName);
  }
  
  if (scope.sideScope === 'left' || scope.sideScope === 'right') {
    query = query.eq('side_scope', scope.sideScope);
  }
  
  // Order chronologically
  query = query.order('date', { ascending: true }).order('created_at', { ascending: true });
  
  const { data: entries, error } = await query;
  
  if (error || !entries || entries.length === 0) {
    return;
  }
  
  // Recompute PRs chronologically
  let runningBest: number | null = null;
  const updates: { id: string; is_pr: boolean }[] = [];
  
  for (const entry of entries) {
    const value = (entry as Record<string, unknown>)[column] as number;
    let isPR = false;
    
    if (runningBest === null) {
      isPR = true;
      runningBest = value;
    } else if (rule === 'higher' && value > runningBest) {
      isPR = true;
      runningBest = value;
    } else if (rule === 'lower' && value < runningBest) {
      isPR = true;
      runningBest = value;
    }
    
    updates.push({ id: entry.id, is_pr: isPR });
  }
  
  // Batch update all entries
  for (const update of updates) {
    await supabase
      .from('exercise_entries')
      .update({ is_pr: update.is_pr })
      .eq('id', update.id);
  }
}

/**
 * Full PR recomputation for a client-exercise pair
 * Call this after insert/update/delete operations
 */
export async function recomputePRsAfterChange(entry: {
  client_id: string;
  exercise_id?: string | null;
  exercise_name: string;
  side?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  distance_meters?: number | null;
  time_seconds?: number | null;
  avg_watts?: number | null;
  pace_sec_per_500m?: number | null;
  is_bodyweight?: boolean;
  reps?: number | null;
}): Promise<void> {
  const metricKey = determineMetricKey(entry);
  const sideScope = normalizeSideScope(entry.side);
  
  await recomputePRsForScope({
    clientId: entry.client_id,
    exerciseId: entry.exercise_id || null,
    exerciseName: entry.exercise_name,
    metricKey,
    sideScope,
  });
}

/**
 * Get best attempt value from an array of attempts (for plyometrics)
 */
export function getBestAttempt(attempts: number[], metricKey: MetricKey): number | null {
  if (!attempts || attempts.length === 0) return null;
  
  const rule = METRIC_RULES[metricKey];
  if (rule === 'higher') {
    return Math.max(...attempts);
  } else if (rule === 'lower') {
    return Math.min(...attempts);
  }
  return attempts[0];
}

/**
 * Calculate attempt statistics
 */
export function calculateAttemptStats(attempts: number[]): {
  best: number;
  average: number;
  stdDev: number | null;
  count: number;
} | null {
  if (!attempts || attempts.length === 0) return null;
  
  const count = attempts.length;
  const best = Math.max(...attempts);
  const average = attempts.reduce((a, b) => a + b, 0) / count;
  
  let stdDev: number | null = null;
  if (count >= 3) {
    const squaredDiffs = attempts.map(v => Math.pow(v - average, 2));
    stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / count);
  }
  
  return { best, average, stdDev, count };
}

/**
 * Calculate asymmetry percentage between left and right sides
 */
export function calculateAsymmetry(leftValue: number | null, rightValue: number | null): number | null {
  if (leftValue === null || rightValue === null) return null;
  if (leftValue === 0 && rightValue === 0) return 0;
  
  const maxVal = Math.max(leftValue, rightValue);
  if (maxVal === 0) return 0;
  
  return Math.abs(leftValue - rightValue) / maxVal * 100;
}
