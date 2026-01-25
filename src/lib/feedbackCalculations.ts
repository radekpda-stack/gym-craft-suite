/**
 * Safe calculation utilities for feedback metrics
 * Prevents NaN, >100% rates, and handles missing data gracefully
 */

/**
 * Calculate safe average from array of possibly null/undefined values
 * Returns null if no valid values exist
 */
export function safeAverage(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => 
    v != null && !isNaN(v) && isFinite(v)
  );
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * Calculate safe median from array of possibly null/undefined values
 * Returns null if no valid values exist
 */
export function safeMedian(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => 
    v != null && !isNaN(v) && isFinite(v)
  ).sort((a, b) => a - b);
  
  if (valid.length === 0) return null;
  
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
}

/**
 * Calculate response rate as percentage (never exceeds 100%)
 * @param completed - Number of completed feedbacks
 * @param sent - Total number of sent feedback requests
 * @returns Percentage 0-100, or 0 if no data
 */
export function responseRate(completed: number, sent: number): number {
  if (sent === 0 || !isFinite(sent)) return 0;
  if (!isFinite(completed)) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / sent) * 100)));
}

/**
 * Format a number for display, returning "—" for null/undefined/NaN
 */
export function formatMetric(
  value: number | null | undefined, 
  options?: {
    decimals?: number;
    suffix?: string;
    prefix?: string;
  }
): string {
  if (value == null || isNaN(value) || !isFinite(value)) {
    return "—";
  }
  
  const { decimals = 1, suffix = "", prefix = "" } = options || {};
  const formatted = decimals === 0 ? Math.round(value) : value.toFixed(decimals);
  return `${prefix}${formatted}${suffix}`;
}

/**
 * Calculate session load (sRPE = RPE × duration in minutes)
 */
export function calculateSessionLoad(
  rpe: number | null | undefined, 
  durationMinutes: number | null | undefined
): number | null {
  if (rpe == null || durationMinutes == null) return null;
  if (isNaN(rpe) || isNaN(durationMinutes)) return null;
  if (rpe < 1 || rpe > 10) return null;
  if (durationMinutes <= 0) return null;
  
  return Math.round(rpe * durationMinutes);
}

/**
 * Calculate time difference in hours between two dates
 */
export function hoursBetween(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined
): number | null {
  if (!start || !end) return null;
  
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Get count of valid values in an array
 */
export function validCount(values: (number | null | undefined)[]): number {
  return values.filter((v): v is number => 
    v != null && !isNaN(v) && isFinite(v)
  ).length;
}

/**
 * Calculate percentage change between two values
 */
export function percentageChange(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current == null || previous == null) return null;
  if (isNaN(current) || isNaN(previous)) return null;
  if (previous === 0) return null;
  
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Safe percentage change with limits (±500%)
 * Prevents unrealistic change values like +3100%
 */
export function safePercentageChange(
  current: number | null | undefined,
  previous: number | null | undefined,
  maxChange: number = 500
): { value: number | null; capped: boolean } {
  if (current == null || previous == null) return { value: null, capped: false };
  if (isNaN(current) || isNaN(previous)) return { value: null, capped: false };
  if (!isFinite(current) || !isFinite(previous)) return { value: null, capped: false };
  if (previous === 0) {
    // From 0 to something: show capped value
    if (current > 0) return { value: maxChange, capped: true };
    if (current < 0) return { value: -maxChange, capped: true };
    return { value: 0, capped: false };
  }
  
  const raw = ((current - previous) / previous) * 100;
  const capped = Math.abs(raw) > maxChange;
  const value = Math.max(-maxChange, Math.min(maxChange, Math.round(raw)));
  
  return { value, capped };
}

/**
 * Safe response rate that ensures completed ≤ sent and result ≤ 100%
 */
export function safeResponseRate(completed: number, sent: number): number {
  if (sent <= 0 || !isFinite(sent)) return 0;
  if (!isFinite(completed) || completed < 0) return 0;
  
  // Cap completed to sent (can't have more responses than requests)
  const cappedCompleted = Math.min(completed, sent);
  return Math.min(100, Math.max(0, Math.round((cappedCompleted / sent) * 100)));
}

/**
 * Check if a session load represents a spike (>20% increase vs average)
 */
export function isSessionLoadSpike(
  currentLoad: number | null | undefined,
  historicalLoads: (number | null | undefined)[],
  threshold: number = 20
): boolean {
  if (currentLoad == null) return false;
  
  const avgLoad = safeAverage(historicalLoads);
  if (avgLoad == null || avgLoad === 0) return false;
  
  const change = percentageChange(currentLoad, avgLoad);
  return change != null && change > threshold;
}

/**
 * Aggregate pain locations from feedback array
 */
export function aggregatePainLocations(
  feedbacks: Array<{ pain_areas?: string[] | null }>
): Map<string, number> {
  const counts = new Map<string, number>();
  
  for (const fb of feedbacks) {
    if (fb.pain_areas && Array.isArray(fb.pain_areas)) {
      for (const area of fb.pain_areas) {
        counts.set(area, (counts.get(area) || 0) + 1);
      }
    }
  }
  
  return counts;
}

/**
 * Get top N pain locations sorted by frequency
 */
export function getTopPainLocations(
  feedbacks: Array<{ pain_areas?: string[] | null }>,
  limit: number = 5
): Array<{ area: string; count: number }> {
  const counts = aggregatePainLocations(feedbacks);
  
  return Array.from(counts.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Metric explanation descriptions for tooltips
 */
export const METRIC_EXPLANATIONS: Record<string, { label: string; description: string; scale: string }> = {
  bodyFeel: {
    label: 'Pocit těla',
    description: 'Jak se klient celkově cítil',
    scale: '1 = špatně, 10 = skvěle',
  },
  soreness: {
    label: 'Svalovka',
    description: 'Míra svalové bolesti po tréninku',
    scale: '1 = žádná, 10 = extrémní',
  },
  energy: {
    label: 'Energie',
    description: 'Energetická hladina klienta',
    scale: '1 = vyčerpaný, 10 = plný energie',
  },
  pain: {
    label: 'Bolest',
    description: 'Intenzita bolesti (nesvalové)',
    scale: '1 = žádná, 10 = silná',
  },
  fun: {
    label: 'Zábava',
    description: 'Jak moc klienta trénink bavil',
    scale: '1 = nudný, 10 = super',
  },
  rpe: {
    label: 'RPE',
    description: 'Vnímaná náročnost tréninku',
    scale: '1 = lehký, 10 = maximální',
  },
  responseRate: {
    label: 'Míra odpovědí',
    description: 'Podíl vyplněných feedbacků z odeslaných',
    scale: '0-100%',
  },
};
