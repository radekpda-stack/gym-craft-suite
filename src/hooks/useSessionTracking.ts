import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { sessionManager } from '@/lib/analytics/SessionManager';

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
      sessionManager.initialize(user.id).catch(console.debug);
    }
  }, [user]);

  return {
    sessionId: sessionManager.getSessionId(),
    isReady: sessionManager.isInitialized(),
  };
}
