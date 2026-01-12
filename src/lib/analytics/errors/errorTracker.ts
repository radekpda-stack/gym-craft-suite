/**
 * Error Analytics Tracker
 * 
 * Tracks:
 * - UI/Component errors (Error Boundary)
 * - Network/API errors
 * - Unhandled exceptions
 * 
 * Events: error_ui_exception, error_network_failure
 */

import { supabase } from '@/integrations/supabase/client';
import { sessionManager, getDeviceType } from '../SessionManager';
import { hashUserId, createErrorFingerprint } from '../performance/utils';

// Throttle identical errors
const recentErrors = new Map<string, { count: number; lastTime: number }>();
const ERROR_THROTTLE_MS = 60000; // 1 minute
const MAX_ERRORS_PER_SESSION = 50;
let errorCount = 0;

/**
 * Track UI/Component exception from Error Boundary
 */
export async function trackUIException(
  error: Error,
  componentName?: string,
  severity: 'critical' | 'warning' = 'critical'
): Promise<void> {
  if (errorCount >= MAX_ERRORS_PER_SESSION) {
    return; // Prevent error flood
  }
  errorCount++;

  const errorMessage = error.message || 'Unknown error';
  const errorStack = error.stack || '';
  const errorFingerprint = createErrorFingerprint(errorMessage, errorStack);
  const route = window.location.pathname;

  // Check throttle
  const throttleKey = `${errorFingerprint}-${route}`;
  const existing = recentErrors.get(throttleKey);
  const now = Date.now();

  if (existing && (now - existing.lastTime) < ERROR_THROTTLE_MS) {
    existing.count++;
    existing.lastTime = now;
    return;
  }

  recentErrors.set(throttleKey, { count: 1, lastTime: now });

  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('app_events').insert({
      event_name: 'error_ui_exception',
      category: 'errors',
      user_id: user?.id || null,
      session_id: sessionManager.getSessionId(),
      timestamp: new Date().toISOString(),
      success: false,
      error_message: errorMessage.substring(0, 500),
      error_code: severity === 'critical' ? 'UNKNOWN' : 'VALIDATION',
      metadata: {
        error_fingerprint: errorFingerprint,
        error_message: errorMessage.substring(0, 200),
        error_name: error.name,
        route,
        component_name: componentName || null,
        user_id_hash: user ? hashUserId(user.id) : null,
        severity,
        device_type: getDeviceType(),
        stack_preview: errorStack.substring(0, 300),
      }
    });

    // Also log to app_errors table for detailed debugging
    await supabase.from('app_errors').insert({
      error_type: 'ui_exception',
      message: errorMessage.substring(0, 1000),
      stack: errorStack.substring(0, 2000),
      screen: route,
      user_id: user?.id || null,
      session_id: sessionManager.getSessionId(),
      payload_json: {
        component_name: componentName,
        severity,
        fingerprint: errorFingerprint,
      }
    });

  } catch (trackingError) {
    if (import.meta.env.DEV) {
      console.debug('[ErrorAnalytics] UI exception tracking failed:', trackingError);
    }
  }
}

/**
 * Track network/API failure
 */
export async function trackNetworkFailure(
  endpoint: string,
  method: string,
  statusCode: number,
  errorType: 'timeout' | '4xx' | '5xx' | 'network_error',
  errorMessage?: string
): Promise<void> {
  if (errorCount >= MAX_ERRORS_PER_SESSION) {
    return;
  }
  errorCount++;

  // Sanitize endpoint
  const sanitizedEndpoint = sanitizeEndpoint(endpoint);
  
  // Skip internal endpoints
  if (sanitizedEndpoint.includes('app_events') || 
      sanitizedEndpoint.includes('app_errors') ||
      sanitizedEndpoint.includes('feature_usage')) {
    return;
  }

  const route = window.location.pathname;
  const fingerprint = createErrorFingerprint(`${method}-${sanitizedEndpoint}-${statusCode}`, errorMessage);

  // Check throttle
  const throttleKey = `network-${fingerprint}`;
  const existing = recentErrors.get(throttleKey);
  const now = Date.now();

  if (existing && (now - existing.lastTime) < ERROR_THROTTLE_MS) {
    existing.count++;
    existing.lastTime = now;
    return;
  }

  recentErrors.set(throttleKey, { count: 1, lastTime: now });

  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('app_events').insert({
      event_name: 'error_network_failure',
      category: 'errors',
      user_id: user?.id || null,
      session_id: sessionManager.getSessionId(),
      timestamp: new Date().toISOString(),
      success: false,
      error_message: errorMessage?.substring(0, 500) || `${errorType}: ${statusCode}`,
      error_code: errorType === 'timeout' ? 'TIMEOUT' : 
                  errorType === '5xx' ? 'SERVER' :
                  errorType === '4xx' ? 'VALIDATION' : 'NETWORK',
      metadata: {
        endpoint: sanitizedEndpoint,
        method,
        status_code: statusCode,
        error_type: errorType,
        route,
        user_id_hash: user ? hashUserId(user.id) : null,
        device_type: getDeviceType(),
      }
    });

    // Log severe errors to app_errors
    if (errorType === '5xx' || errorType === 'timeout') {
      await supabase.from('app_errors').insert({
        error_type: 'network_failure',
        message: errorMessage || `${method} ${sanitizedEndpoint} failed with ${statusCode}`,
        screen: route,
        endpoint: sanitizedEndpoint,
        user_id: user?.id || null,
        session_id: sessionManager.getSessionId(),
        payload_json: {
          method,
          status_code: statusCode,
          error_type: errorType,
        }
      });
    }

  } catch (trackingError) {
    if (import.meta.env.DEV) {
      console.debug('[ErrorAnalytics] Network failure tracking failed:', trackingError);
    }
  }
}

/**
 * Track unhandled exception (for global error handler)
 */
export async function trackUnhandledException(
  error: Error | string,
  source?: string
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  await trackUIException(
    error instanceof Error ? error : new Error(errorMessage),
    source || 'global',
    'critical'
  );
}

/**
 * Sanitize endpoint URL
 */
function sanitizeEndpoint(url: string): string {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname;
    // Mask UUIDs
    path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
    return path;
  } catch {
    return url.split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
  }
}

/**
 * Reset error count (call on session start)
 */
export function resetErrorCount(): void {
  errorCount = 0;
  recentErrors.clear();
}
