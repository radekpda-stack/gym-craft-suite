import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { sessionManager } from '@/lib/analytics/SessionManager';
import { resetErrorCount } from '@/lib/analytics/errors';
import { trackPageLoadPerformance } from '@/lib/analytics/performance';

// Re-export for backwards compatibility
export function getCurrentSessionId(): string | null {
  return sessionManager.getSessionId();
}

export function useSessionTracking() {
  const { user } = useAuth();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (user && !isInitialized.current) {
      isInitialized.current = true;
      
      // Initialize session
      sessionManager.initialize(user.id).catch(console.debug);
      
      // Reset error count for new session
      resetErrorCount();
      
      // Track initial page load performance
      trackPageLoadPerformance(window.location.pathname);
    }
  }, [user]);

  return {
    sessionId: sessionManager.getSessionId(),
    isReady: sessionManager.isInitialized(),
  };
}
