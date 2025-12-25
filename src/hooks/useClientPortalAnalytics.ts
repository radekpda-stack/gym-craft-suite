import { useCallback } from 'react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { trackEvent } from '@/lib/analytics/trackEvent';
import { trackPageView } from '@/lib/analytics/trackPageView';

/**
 * Specialized analytics hook for Client Portal
 * Automatically includes clientId in all events
 */
export function useClientPortalAnalytics() {
  const { clientId } = useClientPortal();

  const trackPortalEvent = useCallback(
    (eventName: string, metadata?: Record<string, any>) => {
      if (!clientId) return;
      
      trackEvent(eventName, 'client-portal', {
        metadata: { 
          client_id: clientId,
          portal_type: 'client',
          ...metadata 
        }
      });
    },
    [clientId]
  );

  const trackPortalPageView = useCallback(
    (pageName: string) => {
      if (!clientId) return;
      trackPageView(pageName);
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
