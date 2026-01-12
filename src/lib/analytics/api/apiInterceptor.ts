/**
 * Supabase API Interceptor
 * 
 * Wraps fetch to automatically track API performance and errors.
 * Only active in production or when explicitly enabled.
 */

import { trackApiLatency } from '../performance';
import { trackNetworkFailure } from '../errors';

let isInitialized = false;
const originalFetch = window.fetch;

/**
 * Initialize API interceptor
 * Call this once at app startup
 */
export function initApiInterceptor(): void {
  if (isInitialized) return;
  
  // Only intercept in production (or if explicitly enabled)
  if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_PERF_TRACKING) {
    return;
  }
  
  isInitialized = true;

  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const startTime = performance.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || 'GET';

    // Skip non-API requests
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || !url.includes(supabaseUrl)) {
      return originalFetch(input, init);
    }

    // Skip analytics endpoints to prevent recursion
    if (url.includes('app_events') || 
        url.includes('app_errors') || 
        url.includes('feature_usage') ||
        url.includes('performance_metrics') ||
        url.includes('user_sessions')) {
      return originalFetch(input, init);
    }

    try {
      const response = await originalFetch(input, init);
      const latencyMs = Math.round(performance.now() - startTime);

      // Track performance
      trackApiLatency(url, method, latencyMs, response.status);

      // Track errors
      if (!response.ok) {
        const errorType = response.status >= 500 ? '5xx' : '4xx';
        trackNetworkFailure(url, method, response.status, errorType);
      }

      return response;

    } catch (error) {
      const latencyMs = Math.round(performance.now() - startTime);
      
      // Determine error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage.toLowerCase().includes('timeout') || 
                       errorMessage.toLowerCase().includes('aborted');
      
      const errorType = isTimeout ? 'timeout' : 'network_error';
      
      // Track as failed request
      trackApiLatency(url, method, latencyMs, 0);
      trackNetworkFailure(url, method, 0, errorType, errorMessage);

      throw error;
    }
  };
}

/**
 * Cleanup - restore original fetch
 */
export function cleanupApiInterceptor(): void {
  if (isInitialized) {
    window.fetch = originalFetch;
    isInitialized = false;
  }
}
