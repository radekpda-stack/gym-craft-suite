/**
 * Event Enrichment
 * 
 * Adds standard metadata to all events for consistency.
 */

import { sessionManager, getDeviceType, getOS, getBrowser } from '../SessionManager';

export const EVENT_SCHEMA_VERSION = '2.0';

/**
 * Get current route
 */
export function getCurrentRoute(): string {
  return window.location.pathname;
}

/**
 * Get environment
 */
export function getEnvironment(): 'prod' | 'demo' | 'dev' {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'dev';
  if (hostname.includes('demo') || window.location.search.includes('demo=true')) return 'demo';
  return 'prod';
}

/**
 * Get app version from build info
 */
export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION || '1.0.0';
}

// Referrer tracking
let previousRoute: string | null = null;

export function updateReferrerRoute(newRoute: string): void {
  previousRoute = newRoute;
}

export function getReferrerRoute(): string | null {
  return previousRoute;
}

/**
 * Enrich metadata with standard fields
 */
export function enrichMetadata(customMetadata?: Record<string, any>): Record<string, any> {
  return {
    ...customMetadata,
    event_schema_version: EVENT_SCHEMA_VERSION,
    route: getCurrentRoute(),
    referrer_route: getReferrerRoute(),
    device_type: getDeviceType(),
    browser: getBrowser(),
    platform_os: getOS(),
    environment: getEnvironment(),
    app_version: getAppVersion(),
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get current session ID
 */
export async function getSessionId(): Promise<string | null> {
  return sessionManager.getSessionId() || await sessionManager.waitForSession();
}

/**
 * Update session activity
 */
export function updateSessionActivity(): void {
  sessionManager.updateActivity();
}
