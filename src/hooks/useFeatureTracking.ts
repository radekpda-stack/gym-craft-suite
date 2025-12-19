import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentSessionId } from './useSessionTracking';

export type FeatureCategory = 
  | 'navigation'
  | 'calendar'
  | 'clients'
  | 'trainings'
  | 'plans'
  | 'measurements'
  | 'diagnostics'
  | 'finance'
  | 'media'
  | 'search'
  | 'ai'
  | 'feedback'
  | 'nutrition'
  | 'progress'
  | 'settings'
  | 'export'
  | 'system';

interface TrackOptions {
  metadata?: Record<string, any>;
  debounceMs?: number;
  duration_ms?: number;
  success?: boolean;
  error_message?: string;
}

// Global debounce map to prevent duplicate tracking
const lastTracked = new Map<string, number>();

export function useFeatureTracking() {
  const trackFeature = useCallback(async (
    featureName: string,
    category: FeatureCategory,
    options?: TrackOptions
  ) => {
    const { metadata, debounceMs = 1000, duration_ms, success = true, error_message } = options || {};
    
    // Debounce to prevent spam
    const key = `${featureName}-${category}`;
    const now = Date.now();
    const lastTime = lastTracked.get(key) || 0;
    
    if (now - lastTime < debounceMs) {
      return;
    }
    lastTracked.set(key, now);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('feature_usage').insert({
        user_id: user.id,
        feature_name: featureName,
        feature_category: category,
        metadata: metadata || {},
        session_id: getCurrentSessionId(),
        duration_ms: duration_ms || null,
        success,
        error_message: error_message || null,
      });
    } catch (error) {
      // Silently fail - we don't want to break the app for analytics
      console.debug('Feature tracking failed:', error);
    }
  }, []);

  return { trackFeature };
}

// Hook for automatic page view tracking
export function usePageTracking(pageName: string) {
  const { trackFeature } = useFeatureTracking();
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackFeature(`page_view_${pageName}`, 'navigation');
    }
  }, [pageName, trackFeature]);
}

// Singleton for tracking outside of React components
export const featureTracker = {
  async track(
    featureName: string, 
    category: FeatureCategory, 
    metadata?: Record<string, any>,
    options?: { success?: boolean; error_message?: string; duration_ms?: number }
  ) {
    const key = `${featureName}-${category}`;
    const now = Date.now();
    const lastTime = lastTracked.get(key) || 0;
    
    if (now - lastTime < 1000) return;
    lastTracked.set(key, now);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('feature_usage').insert({
        user_id: user.id,
        feature_name: featureName,
        feature_category: category,
        metadata: metadata || {},
        session_id: getCurrentSessionId(),
        duration_ms: options?.duration_ms || null,
        success: options?.success ?? true,
        error_message: options?.error_message || null,
      });
    } catch (error) {
      console.debug('Feature tracking failed:', error);
    }
  },

  // Track with timing - returns a function to call when action completes
  startTiming(featureName: string, category: FeatureCategory, metadata?: Record<string, any>) {
    const startTime = Date.now();
    return {
      success: () => {
        const duration = Date.now() - startTime;
        this.track(featureName, category, metadata, { duration_ms: duration, success: true });
      },
      error: (errorMessage: string) => {
        const duration = Date.now() - startTime;
        this.track(featureName, category, metadata, { duration_ms: duration, success: false, error_message: errorMessage });
      }
    };
  }
};
