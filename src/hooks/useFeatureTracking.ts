/**
 * Analytics Hooks
 * 
 * React hooks for analytics tracking.
 * Provides convenient wrappers around the core analytics functions.
 */

import { useCallback, useEffect, useRef } from 'react';
import { 
  track, 
  trackPageView, 
  trackError, 
  trackMetric,
  startTimedAction,
  endCurrentPageView
} from '@/lib/analytics';
import type { EventCategory, TrackOptions, ErrorCode } from '@/lib/analytics';

// Re-export types
export type { EventCategory as FeatureCategory };

interface UseTrackOptions extends Omit<TrackOptions, 'debounceMs'> {
  debounceMs?: number;
}

/**
 * Hook for tracking feature usage
 */
export function useFeatureTracking() {
  const trackFeature = useCallback(async (
    featureName: string,
    category: EventCategory,
    options?: UseTrackOptions
  ) => {
    await track(featureName, category, options);
  }, []);

  return { trackFeature };
}

/**
 * Hook for automatic page view tracking with active duration
 */
export function usePageTracking(pageName: string) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackPageView(pageName);
    }
    
    // Cleanup on unmount
    return () => {
      // Page leave is handled by next trackPageView call
    };
  }, [pageName]);
}

/**
 * Hook for tracking timed operations
 */
export function useTimedTracking() {
  const startTiming = useCallback((
    actionName: string,
    category: EventCategory,
    metadata?: Record<string, any>
  ) => {
    return startTimedAction(actionName, category, metadata);
  }, []);

  return { startTiming };
}

/**
 * Hook for tracking errors in operations
 */
export function useErrorTracking() {
  const trackOperationError = useCallback(async (
    operation: string,
    category: EventCategory,
    error: Error | string,
    errorCode?: ErrorCode,
    metadata?: Record<string, any>
  ) => {
    await trackError(operation, category, error, errorCode, metadata);
  }, []);

  return { trackOperationError };
}

/**
 * Hook for tracking metrics (PRs, progress, etc.)
 */
export function useMetricTracking() {
  const trackMetricValue = useCallback(async (
    metricName: string,
    category: EventCategory,
    value: number,
    metadata?: Record<string, any>
  ) => {
    await trackMetric(metricName, category, value, metadata);
  }, []);

  return { trackMetricValue };
}

/**
 * Singleton for tracking outside of React components
 * (backwards compatible with existing featureTracker usage)
 */
export const featureTracker = {
  async track(
    featureName: string, 
    category: EventCategory, 
    metadata?: Record<string, any>,
    options?: { success?: boolean; error_message?: string; duration_ms?: number }
  ) {
    await track(featureName, category, {
      metadata,
      duration_ms: options?.duration_ms,
      success: options?.success,
      error_message: options?.error_message,
    });
  },

  startTiming(featureName: string, category: EventCategory, metadata?: Record<string, any>) {
    return startTimedAction(featureName, category, metadata);
  },
  
  async trackError(
    operation: string,
    category: EventCategory,
    error: Error | string,
    errorCode?: ErrorCode,
    metadata?: Record<string, any>
  ) {
    await trackError(operation, category, error, errorCode, metadata);
  }
};
