import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  | 'export';

interface TrackOptions {
  metadata?: Record<string, any>;
  debounceMs?: number;
}

// Global debounce map to prevent duplicate tracking
const lastTracked = new Map<string, number>();

export function useFeatureTracking() {
  const trackFeature = useCallback(async (
    featureName: string,
    category: FeatureCategory,
    options?: TrackOptions
  ) => {
    const { metadata, debounceMs = 1000 } = options || {};
    
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
        metadata: metadata || {}
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
  async track(featureName: string, category: FeatureCategory, metadata?: Record<string, any>) {
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
        metadata: metadata || {}
      });
    } catch (error) {
      console.debug('Feature tracking failed:', error);
    }
  }
};
