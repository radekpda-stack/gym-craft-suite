/**
 * Interaction Analytics Module
 * 
 * Comprehensive tracking for:
 * - Click tracking
 * - Scroll depth
 * - Rage clicks
 * - Feature time
 * - User journeys
 * - Performance metrics
 */

export { InteractionTracker } from './InteractionTracker';
export { useFeatureTime } from './useFeatureTime';
export { useJourney, JOURNEY_TYPES } from './useJourney';
export { usePerformance, measureRenderTime } from './usePerformance';
