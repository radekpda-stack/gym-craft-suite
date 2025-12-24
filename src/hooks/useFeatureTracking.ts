import { useCallback, useEffect, useRef } from 'react';
import { trackEvent, startTimedEvent, trackPageView } from '@/lib/analytics';
import type { EventCategory } from '@/lib/analytics';

// Re-export types for backwards compatibility
export type FeatureCategory = EventCategory;

interface TrackOptions {
  metadata?: Record<string, any>;
  debounceMs?: number;
  duration_ms?: number;
  success?: boolean;
  error_message?: string;
}

/**
 * Hook for tracking feature usage
 */
export function useFeatureTracking() {
  const trackFeature = useCallback(async (
    featureName: string,
    category: FeatureCategory,
    options?: TrackOptions
  ) => {
    await trackEvent(featureName, category, {
      metadata: options?.metadata,
      duration_ms: options?.duration_ms,
      success: options?.success,
      error_message: options?.error_message,
      debounceMs: options?.debounceMs,
    });
  }, []);

  return { trackFeature };
}

/**
 * Hook for automatic page view tracking with duration
 */
export function usePageTracking(pageName: string) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackPageView(pageName);
    }
  }, [pageName]);
}

/**
 * Singleton for tracking outside of React components
 */
export const featureTracker = {
  async track(
    featureName: string, 
    category: FeatureCategory, 
    metadata?: Record<string, any>,
    options?: { success?: boolean; error_message?: string; duration_ms?: number }
  ) {
    await trackEvent(featureName, category, {
      metadata,
      duration_ms: options?.duration_ms,
      success: options?.success,
      error_message: options?.error_message,
    });
  },

  startTiming(featureName: string, category: FeatureCategory, metadata?: Record<string, any>) {
    return startTimedEvent(featureName, category, metadata);
  }
};
