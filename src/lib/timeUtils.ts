/**
 * Time and pace conversion utilities for cardio exercises
 */

/**
 * Parse pace string (mm:ss) to seconds
 * @param paceStr - Format "mm:ss" or "m:ss"
 * @returns Total seconds or null if invalid
 */
export function parsePace(paceStr: string): number | null {
  if (!paceStr || !paceStr.includes(':')) return null;
  
  const parts = paceStr.split(':');
  if (parts.length !== 2) return null;
  
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  
  if (isNaN(minutes) || isNaN(seconds)) return null;
  if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
  
  return minutes * 60 + seconds;
}

/**
 * Format seconds to pace string (mm:ss)
 * @param totalSeconds - Total seconds
 * @returns Formatted string "m:ss" or "mm:ss"
 */
export function formatPace(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds <= 0) return '';
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse time string (mm:ss or h:mm:ss) to seconds
 * @param timeStr - Format "mm:ss" or "h:mm:ss"
 * @returns Total seconds or null if invalid
 */
export function parseTime(timeStr: string): number | null {
  if (!timeStr) return null;
  
  // If it's just a number, treat it as seconds
  if (!timeStr.includes(':')) {
    const seconds = parseInt(timeStr, 10);
    return isNaN(seconds) ? null : seconds;
  }
  
  const parts = timeStr.split(':');
  
  if (parts.length === 2) {
    // mm:ss format
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    
    if (isNaN(minutes) || isNaN(seconds)) return null;
    if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
    
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // h:mm:ss format
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
    if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null;
    
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  return null;
}

/**
 * Format seconds to time string (m:ss or h:mm:ss)
 * @param totalSeconds - Total seconds
 * @returns Formatted string "m:ss" or "h:mm:ss"
 */
export function formatTime(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds < 0) return '';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
