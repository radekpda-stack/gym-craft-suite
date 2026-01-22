/**
 * Time and pace conversion utilities for cardio exercises
 * 
 * Supports high-precision time with centiseconds:
 * - Input: mm:ss, mm:ss.SS, ss, ss.SS
 * - Storage: milliseconds (integer) for precision
 * - Display: mm:ss.SS when decimals exist
 */

// ============================================================================
// PARSING (Input -> Milliseconds)
// ============================================================================

/**
 * Parse time string to milliseconds
 * Supports: mm:ss, mm:ss.SS, ss, ss.SS, h:mm:ss, h:mm:ss.SS
 * 
 * @example
 * parseTimeToMs("1:41.35") // => 101350
 * parseTimeToMs("101.35")  // => 101350
 * parseTimeToMs("1:41")    // => 101000
 * parseTimeToMs("101")     // => 101000
 */
export function parseTimeToMs(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  
  const trimmed = timeStr.trim();
  if (!trimmed) return null;
  
  // Check if contains colon (mm:ss format)
  if (trimmed.includes(':')) {
    return parseColonFormatToMs(trimmed);
  }
  
  // Plain number format (ss or ss.SS)
  return parseSecondsToMs(trimmed);
}

/**
 * Parse colon format (mm:ss.SS or h:mm:ss.SS)
 */
function parseColonFormatToMs(timeStr: string): number | null {
  const parts = timeStr.split(':');
  
  if (parts.length === 2) {
    // mm:ss or mm:ss.SS
    const minutes = parseInt(parts[0], 10);
    const secondsPart = parseFloat(parts[1]);
    
    if (isNaN(minutes) || isNaN(secondsPart)) return null;
    if (minutes < 0 || secondsPart < 0 || secondsPart >= 60) return null;
    
    return Math.round((minutes * 60 + secondsPart) * 1000);
  }
  
  if (parts.length === 3) {
    // h:mm:ss or h:mm:ss.SS
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const secondsPart = parseFloat(parts[2]);
    
    if (isNaN(hours) || isNaN(minutes) || isNaN(secondsPart)) return null;
    if (hours < 0 || minutes < 0 || minutes >= 60 || secondsPart < 0 || secondsPart >= 60) return null;
    
    return Math.round((hours * 3600 + minutes * 60 + secondsPart) * 1000);
  }
  
  return null;
}

/**
 * Parse seconds format (ss or ss.SS)
 */
function parseSecondsToMs(timeStr: string): number | null {
  const seconds = parseFloat(timeStr);
  if (isNaN(seconds) || seconds < 0) return null;
  return Math.round(seconds * 1000);
}

/**
 * Legacy: Parse time string to seconds (integer)
 * @deprecated Use parseTimeToMs for precision
 */
export function parseTime(timeStr: string): number | null {
  const ms = parseTimeToMs(timeStr);
  return ms !== null ? Math.round(ms / 1000) : null;
}

// ============================================================================
// FORMATTING (Milliseconds -> Display)
// ============================================================================

/**
 * Format milliseconds to time string with optional centiseconds
 * Shows decimals only when they exist (non-zero)
 * 
 * @example
 * formatTimeMs(101350) // => "1:41.35"
 * formatTimeMs(101000) // => "1:41"
 * formatTimeMs(3723450) // => "1:02:03.45"
 */
export function formatTimeMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || ms < 0) return '';
  
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  // Format seconds with centiseconds if present
  const hasDecimals = seconds % 1 !== 0;
  const secondsStr = hasDecimals 
    ? seconds.toFixed(2).replace(/\.?0+$/, '') // Remove trailing zeros
    : Math.floor(seconds).toString();
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secondsStr.padStart(hasDecimals ? 5 : 2, '0')}`;
  }
  
  return `${minutes}:${secondsStr.padStart(hasDecimals ? 5 : 2, '0')}`;
}

/**
 * Format milliseconds to always show centiseconds (for consistency)
 * 
 * @example
 * formatTimeMsFull(101350) // => "1:41.35"
 * formatTimeMsFull(101000) // => "1:41.00"
 */
export function formatTimeMsFull(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || ms < 0) return '';
  
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const secondsStr = seconds.toFixed(2);
  const paddedSeconds = seconds < 10 ? `0${secondsStr}` : secondsStr;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${paddedSeconds}`;
  }
  
  return `${minutes}:${paddedSeconds}`;
}

/**
 * Legacy: Format seconds to time string
 * @deprecated Use formatTimeMs for precision
 */
export function formatTime(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds < 0) return '';
  return formatTimeMs(totalSeconds * 1000);
}

/**
 * Format seconds to mm:ss (simple format, no decimals)
 * For UI elements like voice recorders, media uploads
 */
export function formatTimeSimple(seconds: number): string {
  if (seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to human-readable duration with units
 * For notifications and exports: "1:30 min" or "45 s"
 */
export function formatTimeWithUnit(seconds: number): string {
  if (seconds < 0) return '0 s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')} min`;
  }
  return `${secs} s`;
}

/**
 * Format seconds to duration like "1h 30m" or "45m"
 * For stats cards showing total duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format seconds with always 2 decimal places (for PRs and precise timing)
 * Example: "1:41.35", "0:05.00"
 */
export function formatTimeWithCentiseconds(seconds: number): string {
  if (seconds < 0) return '0:00.00';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const secsFormatted = secs.toFixed(2);
  const paddedSecs = secs < 10 ? `0${secsFormatted}` : secsFormatted;
  return `${minutes}:${paddedSecs}`;
}

// ============================================================================
// PACE UTILITIES
// ============================================================================

/**
 * Parse pace string (mm:ss or mm:ss.SS per distance unit)
 */
export function parsePace(paceStr: string): number | null {
  return parseTime(paceStr);
}

/**
 * Parse pace to milliseconds for precision
 */
export function parsePaceToMs(paceStr: string): number | null {
  return parseTimeToMs(paceStr);
}

/**
 * Format pace from seconds (no unit suffix)
 * For axis labels and compact displays: "5:30"
 */
export function formatPace(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds <= 0) return '';
  return formatTime(totalSeconds);
}

/**
 * Format pace from milliseconds
 */
export function formatPaceMs(ms: number | null | undefined): string {
  return formatTimeMs(ms);
}

/**
 * Format pace with /km suffix
 * For displaying pace: "5:30 /km"
 */
export function formatPaceKmDisplay(paceSeconds: number | null | undefined): string {
  if (!paceSeconds || paceSeconds <= 0) return '-';
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

/**
 * Format pace as simple mm:ss (for charts/axis)
 * "5:30" without any suffix
 */
export function formatPaceSimple(paceSeconds: number | null | undefined): string {
  if (!paceSeconds || paceSeconds <= 0) return '-';
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate and format pace from time and distance
 * @param totalSeconds - Total time in seconds
 * @param distanceKm - Distance in kilometers
 * @returns Formatted pace string like "5:30 /km"
 */
export function formatPaceFromDistance(totalSeconds: number, distanceKm: number): string {
  if (distanceKm === 0 || totalSeconds <= 0) return '—';
  const paceSecondsPerKm = totalSeconds / distanceKm;
  return formatPaceKmDisplay(paceSecondsPerKm);
}

/**
 * Calculate pace per 500m from time and distance
 * @param timeMs - Time in milliseconds
 * @param distanceMeters - Distance in meters
 * @returns Pace in ms per 500m
 */
export function calculatePace500m(timeMs: number, distanceMeters: number): number | null {
  if (!timeMs || !distanceMeters || distanceMeters <= 0) return null;
  return Math.round((timeMs / distanceMeters) * 500);
}

/**
 * Calculate pace per km from time and distance
 * @param timeMs - Time in milliseconds
 * @param distanceMeters - Distance in meters
 * @returns Pace in ms per km
 */
export function calculatePaceKm(timeMs: number, distanceMeters: number): number | null {
  if (!timeMs || !distanceMeters || distanceMeters <= 0) return null;
  return Math.round((timeMs / distanceMeters) * 1000);
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Convert legacy time_seconds (integer) to time_ms
 */
export function secondsToMs(seconds: number | null | undefined): number | null {
  if (seconds === null || seconds === undefined) return null;
  return seconds * 1000;
}

/**
 * Convert time_ms to time_seconds (for legacy compatibility)
 */
export function msToSeconds(ms: number | null | undefined): number | null {
  if (ms === null || ms === undefined) return null;
  return Math.round(ms / 1000);
}

/**
 * Get the best time value (prefer ms, fallback to seconds * 1000)
 */
export function getTimeMs(entry: { time_ms?: number | null; time_seconds?: number | null }): number | null {
  if (entry.time_ms !== null && entry.time_ms !== undefined) {
    return entry.time_ms;
  }
  if (entry.time_seconds !== null && entry.time_seconds !== undefined) {
    return entry.time_seconds * 1000;
  }
  return null;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate time input string
 */
export function isValidTimeInput(timeStr: string): boolean {
  return parseTimeToMs(timeStr) !== null;
}

/**
 * Validate heart rate zone (1-5)
 */
export function isValidHeartRateZone(zone: number | null): boolean {
  if (zone === null) return true;
  return zone >= 1 && zone <= 5;
}

/**
 * Validate heart rate (30-250 bpm)
 */
export function isValidHeartRate(hr: number | null): boolean {
  if (hr === null) return true;
  return hr >= 30 && hr <= 250;
}

// ============================================================================
// PR / COMPARISON UTILITIES
// ============================================================================

/**
 * Compare two time values for PR (lower is better)
 * Returns true if newTime is better (lower) than oldTime
 */
export function isTimePR(newTimeMs: number | null, oldTimeMs: number | null): boolean {
  if (newTimeMs === null) return false;
  if (oldTimeMs === null) return true;
  return newTimeMs < oldTimeMs;
}

/**
 * Find best (minimum) time from array
 */
export function findBestTime(timesMs: (number | null | undefined)[]): number | null {
  const validTimes = timesMs.filter((t): t is number => t !== null && t !== undefined && t > 0);
  if (validTimes.length === 0) return null;
  return Math.min(...validTimes);
}

/**
 * Calculate average time from array
 */
export function averageTime(timesMs: (number | null | undefined)[]): number | null {
  const validTimes = timesMs.filter((t): t is number => t !== null && t !== undefined && t > 0);
  if (validTimes.length === 0) return null;
  return Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length);
}

// ============================================================================
// DISTANCE FORMATTING
// ============================================================================

/**
 * Format distance in meters to readable format
 * Automatically chooses between km, m, and cm based on value
 * 
 * @example
 * formatDistance(5000) // => "5.0 km"
 * formatDistance(500)  // => "500 m"
 * formatDistance(0.5)  // => "50 cm"
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return '-';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  if (meters >= 1) return `${Math.round(meters)} m`;
  return `${Math.round(meters * 100)} cm`;
}

/**
 * Format distance with more precision (2 decimal places for km)
 * 
 * @example
 * formatDistancePrecise(5123) // => "5.12 km"
 * formatDistancePrecise(500)  // => "500 m"
 */
export function formatDistancePrecise(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return '-';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  if (meters >= 1) return `${meters.toFixed(2)} m`;
  return `${Math.round(meters * 100)} cm`;
}

/**
 * Format distance compactly without spaces
 * 
 * @example
 * formatDistanceCompact(5000) // => "5.0km"
 * formatDistanceCompact(500)  // => "500m"
 */
export function formatDistanceCompact(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return '-';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  if (meters >= 1) return `${Math.round(meters)}m`;
  return `${Math.round(meters * 100)}cm`;
}
