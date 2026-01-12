/**
 * Performance Analytics Tracker
 * 
 * Tracks:
 * - Page/Route load performance
 * - API latency metrics
 * 
 * Events: performance_page_load, performance_api_latency
 */

import { supabase } from '@/integrations/supabase/client';
import { sessionManager, getDeviceType } from '../SessionManager';
import { hashUserId } from './utils';

// Simple in-memory cache to prevent duplicate page load events
const trackedPageLoads = new Set<string>();

/**
 * Track page/route load performance
 */
export async function trackPageLoadPerformance(route: string): Promise<void> {
  // Skip in development by default (can be enabled via flag)
  if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_PERF_TRACKING) {
    return;
  }

  // Create unique key for this page load
  const pageKey = `${route}-${Date.now()}`;
  
  // Debounce - only one per route per session load
  const sessionKey = `${sessionManager.getSessionId()}-${route}`;
  if (trackedPageLoads.has(sessionKey)) {
    return;
  }
  trackedPageLoads.add(sessionKey);
  
  // Allow time for metrics to stabilize
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Collect performance metrics
    let pageLoadTimeMs: number | undefined;
    let timeToInteractiveMs: number | undefined;
    let ttfbMs: number | undefined;
    let fcpMs: number | undefined;
    
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        pageLoadTimeMs = Math.round(navigation.loadEventEnd - navigation.startTime);
        ttfbMs = Math.round(navigation.responseStart - navigation.requestStart);
        
        // Time to interactive approximation
        timeToInteractiveMs = Math.round(navigation.domInteractive - navigation.startTime);
      }
      
      // First Contentful Paint
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        fcpMs = Math.round(fcp.startTime);
      }
    }

    // Only track if we have meaningful data
    if (!pageLoadTimeMs && !fcpMs && !ttfbMs) {
      return;
    }

    // Insert into app_events table with performance category
    await supabase.from('app_events').insert({
      event_name: 'performance_page_load',
      category: 'performance',
      user_id: user?.id || null,
      session_id: sessionManager.getSessionId(),
      timestamp: new Date().toISOString(),
      duration_ms: pageLoadTimeMs,
      success: true,
      metadata: {
        route,
        page_load_time_ms: pageLoadTimeMs,
        time_to_interactive_ms: timeToInteractiveMs,
        ttfb_ms: ttfbMs,
        fcp_ms: fcpMs,
        device_type: getDeviceType(),
        user_id_hash: user ? hashUserId(user.id) : null,
      }
    });

  } catch (error) {
    // Silent fail - don't break app for analytics
    if (import.meta.env.DEV) {
      console.debug('[Performance] Page load tracking failed:', error);
    }
  }
}

/**
 * Track SPA navigation performance
 */
export async function trackNavigationPerformance(
  route: string,
  navigationStartTime: number
): Promise<void> {
  if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_PERF_TRACKING) {
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const loadTimeMs = Date.now() - navigationStartTime;

    // Only track navigations that took meaningful time
    if (loadTimeMs < 50) return;

    await supabase.from('app_events').insert({
      event_name: 'performance_page_load',
      category: 'performance',
      user_id: user?.id || null,
      session_id: sessionManager.getSessionId(),
      timestamp: new Date().toISOString(),
      duration_ms: loadTimeMs,
      success: true,
      metadata: {
        route,
        page_load_time_ms: loadTimeMs,
        navigation_type: 'spa',
        device_type: getDeviceType(),
        user_id_hash: user ? hashUserId(user.id) : null,
      }
    });

  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug('[Performance] Navigation tracking failed:', error);
    }
  }
}

// Queue for API latency events (batch processing)
let apiLatencyQueue: Array<{
  endpoint: string;
  method: string;
  latencyMs: number;
  statusCode: number;
  route: string;
  userId: string | null;
  timestamp: string;
}> = [];

let flushTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Track API request latency
 */
export function trackApiLatency(
  endpoint: string,
  method: string,
  latencyMs: number,
  statusCode: number
): void {
  if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_PERF_TRACKING) {
    return;
  }

  // Sanitize endpoint - remove query params and sensitive data
  const sanitizedEndpoint = sanitizeEndpoint(endpoint);
  
  // Skip internal/analytics endpoints
  if (sanitizedEndpoint.includes('app_events') || 
      sanitizedEndpoint.includes('feature_usage') ||
      sanitizedEndpoint.includes('performance_metrics')) {
    return;
  }

  apiLatencyQueue.push({
    endpoint: sanitizedEndpoint,
    method,
    latencyMs,
    statusCode,
    route: window.location.pathname,
    userId: null, // Will be enriched on flush
    timestamp: new Date().toISOString(),
  });

  // Batch flush every 5 seconds
  if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushApiLatencyQueue();
    }, 5000);
  }

  // Immediate flush if queue is large
  if (apiLatencyQueue.length >= 10) {
    flushApiLatencyQueue();
  }
}

async function flushApiLatencyQueue(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (apiLatencyQueue.length === 0) return;

  const events = [...apiLatencyQueue];
  apiLatencyQueue = [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userIdHash = user ? hashUserId(user.id) : null;
    const sessionId = sessionManager.getSessionId();

    const records = events.map(event => ({
      event_name: 'performance_api_latency',
      category: 'performance',
      user_id: user?.id || null,
      session_id: sessionId,
      timestamp: event.timestamp,
      duration_ms: event.latencyMs,
      success: event.statusCode >= 200 && event.statusCode < 400,
      metadata: {
        endpoint: event.endpoint,
        method: event.method,
        latency_ms: event.latencyMs,
        status_code: event.statusCode,
        route: event.route,
        user_id_hash: userIdHash,
      }
    }));

    await supabase.from('app_events').insert(records);

  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug('[Performance] API latency flush failed:', error);
    }
  }
}

/**
 * Sanitize endpoint URL - remove sensitive info
 */
function sanitizeEndpoint(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove query params
    let path = urlObj.pathname;
    
    // Mask UUIDs
    path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
    
    // Keep only the endpoint path
    return path;
  } catch {
    // If URL parsing fails, return a sanitized version
    return url.split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (apiLatencyQueue.length > 0) {
      // Use sendBeacon for reliability
      const events = apiLatencyQueue.map(e => ({
        event_name: 'performance_api_latency',
        category: 'performance',
        timestamp: e.timestamp,
        duration_ms: e.latencyMs,
        metadata: {
          endpoint: e.endpoint,
          method: e.method,
          latency_ms: e.latencyMs,
          status_code: e.statusCode,
          route: e.route,
        }
      }));
      
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (baseUrl && apikey && navigator.sendBeacon) {
        navigator.sendBeacon(
          `${baseUrl}/rest/v1/app_events`,
          JSON.stringify(events)
        );
      }
    }
  });
}
