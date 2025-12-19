import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SessionInfo {
  id: string;
  startedAt: Date;
}

// Detect device type
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// Detect browser
function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
}

// Detect OS
function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

// Store session ID globally for feature tracking
let currentSessionId: string | null = null;

export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

export function useSessionTracking() {
  const { user } = useAuth();
  const sessionRef = useRef<SessionInfo | null>(null);
  const isInitialized = useRef(false);

  const startSession = useCallback(async () => {
    if (!user || sessionRef.current || isInitialized.current) return;
    isInitialized.current = true;

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          device_type: getDeviceType(),
          browser: getBrowser(),
          os: getOS(),
          screen_width: window.innerWidth,
          screen_height: window.innerHeight,
        })
        .select('id')
        .single();

      if (error) {
        console.debug('Session tracking error:', error);
        return;
      }

      sessionRef.current = {
        id: data.id,
        startedAt: new Date(),
      };
      currentSessionId = data.id;
    } catch (error) {
      console.debug('Session tracking failed:', error);
    }
  }, [user]);

  const endSession = useCallback(async () => {
    if (!sessionRef.current) return;

    const session = sessionRef.current;
    const durationSeconds = Math.round((Date.now() - session.startedAt.getTime()) / 1000);

    try {
      await supabase
        .from('user_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', session.id);
    } catch (error) {
      console.debug('Session end tracking failed:', error);
    }

    sessionRef.current = null;
    currentSessionId = null;
  }, []);

  // Start session on mount
  useEffect(() => {
    if (user) {
      startSession();
    }

    // End session on unmount or page unload
    const handleUnload = () => {
      if (sessionRef.current) {
        const session = sessionRef.current;
        const durationSeconds = Math.round((Date.now() - session.startedAt.getTime()) / 1000);
        
        // Use sendBeacon for reliability on page unload
        const payload = JSON.stringify({
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        });
        
        // Best-effort update using sendBeacon
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${session.id}`,
          payload
        );
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      endSession();
    };
  }, [user, startSession, endSession]);

  return {
    sessionId: sessionRef.current?.id || null,
    startSession,
    endSession,
  };
}
