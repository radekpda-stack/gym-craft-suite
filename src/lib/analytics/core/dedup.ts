/**
 * Analytics Deduplication
 * 
 * Client-side deduplication to prevent duplicate events from:
 * - React StrictMode double renders
 * - Fast refresh
 * - Route change retries
 * - Network retries
 */

const DEDUP_WINDOW_MS = 800; // 800ms window for dedup
const MAX_CACHE_SIZE = 100;

interface DedupEntry {
  timestamp: number;
  eventId: string;
}

// LRU-style cache for recent events
const recentEvents = new Map<string, DedupEntry>();

/**
 * Generate a unique event ID
 */
export function generateEventId(): string {
  return crypto.randomUUID();
}

/**
 * Create a dedup key from event properties
 */
export function createDedupKey(
  eventName: string,
  category: string,
  route: string,
  entityId?: string
): string {
  return `${eventName}:${category}:${route}:${entityId || 'no-entity'}`;
}

/**
 * Check if an event should be deduplicated
 * Returns the existing event_id if duplicate, null if new
 */
export function checkDedup(dedupKey: string, windowMs: number = DEDUP_WINDOW_MS): string | null {
  const now = Date.now();
  const entry = recentEvents.get(dedupKey);
  
  if (entry && now - entry.timestamp < windowMs) {
    return entry.eventId; // Duplicate - return existing ID
  }
  
  return null; // Not a duplicate
}

/**
 * Mark an event as sent (add to dedup cache)
 */
export function markEventSent(dedupKey: string, eventId: string): void {
  // Enforce cache size limit
  if (recentEvents.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry
    const oldestKey = recentEvents.keys().next().value;
    if (oldestKey) {
      recentEvents.delete(oldestKey);
    }
  }
  
  recentEvents.set(dedupKey, {
    timestamp: Date.now(),
    eventId
  });
}

/**
 * Clear old entries from cache (call periodically)
 */
export function cleanupDedupCache(): void {
  const now = Date.now();
  const maxAge = 60000; // 1 minute max age
  
  for (const [key, entry] of recentEvents.entries()) {
    if (now - entry.timestamp > maxAge) {
      recentEvents.delete(key);
    }
  }
}

/**
 * Get current dedup cache size (for debugging)
 */
export function getDedupCacheSize(): number {
  return recentEvents.size;
}

/**
 * Get all cached events (for debugging)
 */
export function getDedupCacheContents(): Array<{ key: string; entry: DedupEntry }> {
  return Array.from(recentEvents.entries()).map(([key, entry]) => ({ key, entry }));
}

// Cleanup every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(cleanupDedupCache, 30000);
}
