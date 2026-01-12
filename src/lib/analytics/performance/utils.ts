/**
 * Performance Analytics Utilities
 */

/**
 * Create a simple hash of user ID for anonymization
 * Uses a fast, non-cryptographic hash suitable for analytics
 */
export function hashUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and take first 8 chars
  return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8);
}

/**
 * Create error fingerprint from message and stack
 */
export function createErrorFingerprint(message: string, stack?: string): string {
  const combined = `${message}${stack || ''}`;
  let hash = 0;
  for (let i = 0; i < Math.min(combined.length, 500); i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
