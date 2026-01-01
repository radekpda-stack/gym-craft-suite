// Exercise metrics utilities - performance display, formatting, and fallback logic

export type ExerciseMetricCategory = 'rower' | 'skierg' | 'treadmill' | 'bike' | 'cardio' | 'strength';

/**
 * Detect the metric category from exercise name or category
 */
export function detectExerciseMetricCategory(
  exerciseName: string,
  exerciseCategory?: string
): ExerciseMetricCategory {
  const nameLower = exerciseName.toLowerCase();
  const categoryLower = (exerciseCategory || '').toLowerCase();
  
  // Rower / Veslo
  if (nameLower.includes('veslo') || nameLower.includes('rower') || nameLower.includes('veslování')) {
    return 'rower';
  }
  
  // SkiErg / SkillUp
  if (nameLower.includes('skierg') || nameLower.includes('ski erg') || 
      nameLower.includes('skillup') || nameLower.includes('skill up') ||
      nameLower.includes('skyark')) {
    return 'skierg';
  }
  
  // Treadmill / Běžecký pás
  if (nameLower.includes('běh') || nameLower.includes('pás') || 
      nameLower.includes('treadmill') || nameLower.includes('běžecký')) {
    return 'treadmill';
  }
  
  // Bike / Kolo
  if (nameLower.includes('kolo') || nameLower.includes('bike') || 
      nameLower.includes('cykl') || nameLower.includes('spinning')) {
    return 'bike';
  }
  
  // Generic cardio
  if (categoryLower.includes('kardio') || categoryLower.includes('cardio') ||
      categoryLower.includes('conditioning')) {
    return 'cardio';
  }
  
  return 'strength';
}

/**
 * Format seconds as m:ss or mm:ss
 */
export function formatTimeSeconds(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace in seconds per 500m to m:ss.d /500m
 */
export function formatPace500m(paceSeconds: number | null | undefined): string {
  if (!paceSeconds || paceSeconds <= 0) return '-';
  const mins = Math.floor(paceSeconds / 60);
  const secs = paceSeconds % 60;
  const wholeSeconds = Math.floor(secs);
  const tenths = Math.round((secs - wholeSeconds) * 10);
  return `${mins}:${wholeSeconds.toString().padStart(2, '0')}.${tenths} /500m`;
}

/**
 * Format pace in seconds per km to m:ss /km
 */
export function formatPaceKm(paceSeconds: number | null | undefined): string {
  if (!paceSeconds || paceSeconds <= 0) return '-';
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

/**
 * Format watts display
 */
export function formatWatts(watts: number | null | undefined): string {
  if (!watts || watts <= 0) return '-';
  return `${Math.round(watts)} W`;
}

/**
 * Format speed display
 */
export function formatSpeed(speedKmh: number | null | undefined): string {
  if (!speedKmh || speedKmh <= 0) return '-';
  return `${speedKmh.toFixed(1)} km/h`;
}

/**
 * Format cadence display
 */
export function formatCadence(spm: number | null | undefined): string {
  if (!spm || spm <= 0) return '-';
  return `${Math.round(spm)} spm`;
}

export interface ExerciseEntryMetrics {
  avg_watts?: number | null;
  max_watts?: number | null;
  pace_sec_per_500m?: number | null;
  pace_sec_per_km?: number | null;
  avg_speed_kmh?: number | null;
  time_seconds?: number | null;
  cadence_spm?: number | null;
  rpe?: number | null;
  distance_meters?: number | null;
}

export interface PerformanceDisplay {
  value: string;
  label: string;
  unit: string;
  raw: number | null;
}

/**
 * Get the primary performance display for an entry using fallback logic
 * 
 * Rower / SkiErg:
 *   1. avg_watts -> "XXX W"
 *   2. pace_sec_per_500m -> "m:ss /500m"
 *   3. time_seconds -> "m:ss" (if distance 500m)
 *   4. "-"
 * 
 * Treadmill:
 *   1. pace_sec_per_km -> "m:ss /km"
 *   2. avg_speed_kmh -> "X.X km/h"
 *   3. time_seconds -> "m:ss"
 *   4. "-"
 */
export function getPerformanceDisplay(
  entry: ExerciseEntryMetrics,
  category: ExerciseMetricCategory
): PerformanceDisplay {
  if (category === 'rower' || category === 'skierg') {
    // Priority 1: Watts
    if (entry.avg_watts && entry.avg_watts > 0) {
      return {
        value: `${Math.round(entry.avg_watts)}`,
        label: 'Výkon',
        unit: 'W',
        raw: entry.avg_watts,
      };
    }
    
    // Priority 2: Pace /500m
    if (entry.pace_sec_per_500m && entry.pace_sec_per_500m > 0) {
      const mins = Math.floor(entry.pace_sec_per_500m / 60);
      const secs = (entry.pace_sec_per_500m % 60).toFixed(1);
      return {
        value: `${mins}:${parseFloat(secs).toFixed(1).padStart(4, '0')}`,
        label: 'Tempo',
        unit: '/500m',
        raw: entry.pace_sec_per_500m,
      };
    }
    
    // Priority 3: Calculate pace from time if distance is 500m
    if (entry.time_seconds && entry.time_seconds > 0 && entry.distance_meters === 500) {
      return {
        value: formatTimeSeconds(entry.time_seconds),
        label: 'Čas',
        unit: '',
        raw: entry.time_seconds,
      };
    }
    
    return { value: '-', label: '', unit: '', raw: null };
  }
  
  if (category === 'treadmill') {
    // Priority 1: Pace /km
    if (entry.pace_sec_per_km && entry.pace_sec_per_km > 0) {
      const mins = Math.floor(entry.pace_sec_per_km / 60);
      const secs = Math.round(entry.pace_sec_per_km % 60);
      return {
        value: `${mins}:${secs.toString().padStart(2, '0')}`,
        label: 'Tempo',
        unit: '/km',
        raw: entry.pace_sec_per_km,
      };
    }
    
    // Priority 2: Speed
    if (entry.avg_speed_kmh && entry.avg_speed_kmh > 0) {
      return {
        value: entry.avg_speed_kmh.toFixed(1),
        label: 'Rychlost',
        unit: 'km/h',
        raw: entry.avg_speed_kmh,
      };
    }
    
    // Priority 3: Time
    if (entry.time_seconds && entry.time_seconds > 0) {
      return {
        value: formatTimeSeconds(entry.time_seconds),
        label: 'Čas',
        unit: '',
        raw: entry.time_seconds,
      };
    }
    
    return { value: '-', label: '', unit: '', raw: null };
  }
  
  // Generic cardio - show watts or time
  if (category === 'cardio' || category === 'bike') {
    if (entry.avg_watts && entry.avg_watts > 0) {
      return {
        value: `${Math.round(entry.avg_watts)}`,
        label: 'Výkon',
        unit: 'W',
        raw: entry.avg_watts,
      };
    }
    
    if (entry.time_seconds && entry.time_seconds > 0) {
      return {
        value: formatTimeSeconds(entry.time_seconds),
        label: 'Čas',
        unit: '',
        raw: entry.time_seconds,
      };
    }
    
    return { value: '-', label: '', unit: '', raw: null };
  }
  
  // Strength - no performance display
  return { value: '-', label: '', unit: '', raw: null };
}

/**
 * Get RPE color based on value
 */
export function getRpeColor(rpe: number): string {
  if (rpe <= 4) return 'text-green-500';
  if (rpe <= 6) return 'text-yellow-500';
  if (rpe <= 8) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get RPE background color for badges
 */
export function getRpeBgColor(rpe: number): string {
  if (rpe <= 4) return 'bg-green-500/10 text-green-600 border-green-500/20';
  if (rpe <= 6) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
  if (rpe <= 8) return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
  return 'bg-red-500/10 text-red-600 border-red-500/20';
}

/**
 * Calculate pace from time and distance
 */
export function calculatePace(timeSeconds: number, distanceMeters: number, paceDistance: number = 500): number {
  if (!timeSeconds || !distanceMeters || distanceMeters <= 0) return 0;
  return (timeSeconds / distanceMeters) * paceDistance;
}

/**
 * Default metric definitions for common cardio exercises
 */
export const DEFAULT_CARDIO_METRICS = {
  rower: {
    distance: { default: 500, unit: 'm', label: 'Vzdálenost' },
    time: { label: 'Čas', unit: '' },
    avgWatts: { label: 'Prům. výkon', unit: 'W' },
    maxWatts: { label: 'Max. výkon', unit: 'W' },
    pace: { label: 'Tempo', unit: '/500m' },
    cadence: { label: 'Kadence', unit: 'spm' },
    strokes: { label: 'Záběry', unit: '' },
    calories: { label: 'Kalorie', unit: 'kcal' },
    rpe: { label: 'RPE', unit: '', min: 1, max: 10 },
  },
  skierg: {
    distance: { default: 500, unit: 'm', label: 'Vzdálenost' },
    time: { label: 'Čas', unit: '' },
    avgWatts: { label: 'Prům. výkon', unit: 'W' },
    maxWatts: { label: 'Max. výkon', unit: 'W' },
    pace: { label: 'Tempo', unit: '/500m' },
    cadence: { label: 'Kadence', unit: 'spm' },
    level: { label: 'Úroveň', unit: '', min: 1, max: 10 },
    resistance: { label: 'Odpor', unit: '', min: 1, max: 3 },
    calories: { label: 'Kalorie', unit: 'kcal' },
    rpe: { label: 'RPE', unit: '', min: 1, max: 10 },
  },
  treadmill: {
    distance: { default: 1000, unit: 'm', label: 'Vzdálenost' },
    time: { label: 'Čas', unit: '' },
    pace: { label: 'Tempo', unit: '/km' },
    speed: { label: 'Rychlost', unit: 'km/h' },
    incline: { label: 'Sklon', unit: '%' },
    avgHr: { label: 'Prům. TF', unit: 'bpm' },
    maxHr: { label: 'Max. TF', unit: 'bpm' },
    calories: { label: 'Kalorie', unit: 'kcal' },
    rpe: { label: 'RPE', unit: '', min: 1, max: 10 },
  },
};
