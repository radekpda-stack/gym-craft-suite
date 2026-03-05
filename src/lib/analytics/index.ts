// Core analytics exports
export * from './core/tracker';
export * from './core/types';
export { sessionManager, getDeviceType, getBrowser, getOS } from './SessionManager';
export { EVENT_SCHEMA_VERSION, updateReferrerRoute, getReferrerRoute } from './core/enrichment';

// Performance analytics
export { trackPageLoadPerformance, trackNavigationPerformance, trackApiLatency } from './performance';

// Error analytics
export { trackUIException, trackNetworkFailure, trackUnhandledException, resetErrorCount } from './errors';

// Legacy compatibility
export { track as trackEvent, startTimedAction as startTimedEvent } from './core/tracker';
