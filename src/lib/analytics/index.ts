// Core analytics exports
export * from './core/tracker';
export * from './core/types';
export { sessionManager, getDeviceType, getBrowser, getOS } from './SessionManager';
export { EVENT_SCHEMA_VERSION, updateReferrerRoute, getReferrerRoute } from './core/enrichment';

// Interaction analytics
export { InteractionTracker, useFeatureTime, useJourney, JOURNEY_TYPES, usePerformance, measureRenderTime } from './interaction';

// Legacy compatibility
export { track as trackEvent, startTimedAction as startTimedEvent } from './core/tracker';
