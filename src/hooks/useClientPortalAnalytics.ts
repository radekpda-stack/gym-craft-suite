import { useCallback } from 'react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { trackEvent } from '@/lib/analytics/trackEvent';
import { trackPageView } from '@/lib/analytics/trackPageView';
import { supabase } from '@/integrations/supabase/client';

/**
 * Save activity to client_portal_activity table for analytics
 */
async function savePortalActivity(
  clientId: string, 
  activityType: string, 
  metadata?: Record<string, any>
) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    await supabase
      .from('client_portal_activity')
      .insert({
        client_id: clientId,
        activity_type: activityType,
        activity_date: today,
        metadata: metadata || {},
      });
  } catch (error) {
    // Silent fail - don't break the app if analytics fails
    console.warn('Failed to save portal activity:', error);
  }
}

/**
 * Specialized analytics hook for Client Portal
 * Automatically includes clientId in all events and saves to DB
 */
export function useClientPortalAnalytics() {
  const { clientId } = useClientPortal();

  const trackPortalEvent = useCallback(
    async (eventName: string, metadata?: Record<string, any>) => {
      if (!clientId) return;
      
      // Track in feature_usage for global analytics
      trackEvent(eventName, 'client-portal', {
        metadata: { 
          client_id: clientId,
          portal_type: 'client',
          ...metadata 
        }
      });

      // Also save to client_portal_activity for client-specific analytics
      await savePortalActivity(clientId, eventName, metadata);
    },
    [clientId]
  );

  const trackPortalPageView = useCallback(
    async (pageName: string) => {
      if (!clientId) return;
      trackPageView(pageName);
      
      // Save page view to client_portal_activity
      await savePortalActivity(clientId, `page_view_${pageName}`, { page: pageName });
    },
    [clientId]
  );

  return { 
    trackPortalEvent, 
    trackPortalPageView,
    clientId 
  };
}

/**
 * Hook for tracking page views in Client Portal
 * Use in useEffect on component mount
 */
export function useClientPortalPageTracking(pageName: string) {
  const { trackPortalPageView, trackPortalEvent } = useClientPortalAnalytics();

  // Track page view on mount
  const trackPageMount = useCallback(() => {
    trackPortalPageView(pageName);
    trackPortalEvent(`${pageName}_viewed`);
  }, [pageName, trackPortalPageView, trackPortalEvent]);

  return { trackPageMount, trackPortalEvent };
}
