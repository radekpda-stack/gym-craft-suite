/**
 * Error Throttle / Debounce
 * 
 * Prevents spam logging of repeated identical errors.
 * Same error (message + screen) only logged once per 60 seconds.
 */

interface ThrottleEntry {
  count: number;
  firstSeen: number;
  lastSeen: number;
}

// Cache of recent errors: key = message + screen
const errorCache = new Map<string, ThrottleEntry>();

// Throttle window in milliseconds
const THROTTLE_WINDOW_MS = 60000; // 60 seconds

// Max cache size to prevent memory leaks
const MAX_CACHE_SIZE = 100;

/**
 * Create a throttle key from error details
 */
export function createErrorKey(message: string, screen?: string): string {
  const normalizedMessage = message.substring(0, 200).toLowerCase().trim();
  return `${normalizedMessage}:${screen || 'unknown'}`;
}

/**
 * Check if error should be throttled
 * Returns { shouldLog, isDuplicate, duplicateCount }
 */
export function checkErrorThrottle(
  message: string, 
  screen?: string
): { 
  shouldLog: boolean; 
  isDuplicate: boolean; 
  duplicateCount: number;
  throttleKey: string;
} {
  const key = createErrorKey(message, screen);
  const now = Date.now();
  
  const existing = errorCache.get(key);
  
  if (existing) {
    // Check if within throttle window
    if (now - existing.lastSeen < THROTTLE_WINDOW_MS) {
      // Update count and lastSeen
      existing.count++;
      existing.lastSeen = now;
      
      return {
        shouldLog: false,
        isDuplicate: true,
        duplicateCount: existing.count,
        throttleKey: key,
      };
    } else {
      // Window expired, reset and allow logging
      existing.count = 1;
      existing.firstSeen = now;
      existing.lastSeen = now;
      
      return {
        shouldLog: true,
        isDuplicate: false,
        duplicateCount: 1,
        throttleKey: key,
      };
    }
  }
  
  // New error - add to cache
  if (errorCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry
    const oldestKey = findOldestEntry();
    if (oldestKey) {
      errorCache.delete(oldestKey);
    }
  }
  
  errorCache.set(key, {
    count: 1,
    firstSeen: now,
    lastSeen: now,
  });
  
  return {
    shouldLog: true,
    isDuplicate: false,
    duplicateCount: 1,
    throttleKey: key,
  };
}

/**
 * Mark error as logged (after successful logging)
 */
export function markErrorLogged(key: string): void {
  const entry = errorCache.get(key);
  if (entry) {
    entry.lastSeen = Date.now();
  }
}

/**
 * Get throttle stats for a specific error
 */
export function getErrorThrottleStats(message: string, screen?: string): ThrottleEntry | null {
  const key = createErrorKey(message, screen);
  return errorCache.get(key) || null;
}

/**
 * Find oldest cache entry for eviction
 */
function findOldestEntry(): string | null {
  let oldestKey: string | null = null;
  let oldestTime = Date.now();
  
  for (const [key, entry] of errorCache.entries()) {
    if (entry.lastSeen < oldestTime) {
      oldestTime = entry.lastSeen;
      oldestKey = key;
    }
  }
  
  return oldestKey;
}

/**
 * Clean up expired entries
 */
export function cleanupErrorThrottleCache(): void {
  const now = Date.now();
  
  for (const [key, entry] of errorCache.entries()) {
    // Remove entries older than 5 minutes
    if (now - entry.lastSeen > 300000) {
      errorCache.delete(key);
    }
  }
}

/**
 * Get cache stats for debugging
 */
export function getErrorThrottleCacheStats(): {
  size: number;
  entries: Array<{ key: string; count: number; age: number }>;
} {
  const now = Date.now();
  
  return {
    size: errorCache.size,
    entries: Array.from(errorCache.entries()).map(([key, entry]) => ({
      key: key.substring(0, 50),
      count: entry.count,
      age: Math.round((now - entry.firstSeen) / 1000),
    })),
  };
}

// Cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupErrorThrottleCache, 300000);
}
