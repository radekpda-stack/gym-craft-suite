// Main analytics exports
export { sessionManager, getDeviceType, getBrowser, getOS } from './SessionManager';
export { trackEvent, startTimedEvent, EVENT_SCHEMA_VERSION } from './trackEvent';
export type { EventCategory, FeatureCategory, TrackEventOptions } from './trackEvent';
export { trackPageView, getPageNameFromRoute, endCurrentPageView } from './trackPageView';
