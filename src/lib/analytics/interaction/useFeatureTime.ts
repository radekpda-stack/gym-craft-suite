/**
 * useFeatureTime - Hook for tracking time spent in features/sections
 * 
 * Automatically tracks:
 * - Total time on feature
 * - Active time (excluding tab switches)
 * - Click count
 * - Scroll depth
 * - Input interactions
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { sessionManager } from '../SessionManager';
import type { EventCategory } from '../core/types';

interface FeatureTimeOptions {
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

interface FeatureSessionState {
  id: string | null;
  startedAt: number;
  activeTime: number;
  lastActiveTime: number;
  isVisible: boolean;
  clickCount: number;
  inputCount: number;
  maxScrollPercent: number;
}

export function useFeatureTime(
  featureName: string,
  category: EventCategory,
  options?: FeatureTimeOptions
) {
  const location = useLocation();
  const state = useRef<FeatureSessionState>({
    id: null,
    startedAt: Date.now(),
    activeTime: 0,
    lastActiveTime: Date.now(),
    isVisible: true,
    clickCount: 0,
    inputCount: 0,
    maxScrollPercent: 0,
  });
  const userId = useRef<string | null>(null);
  const savedRef = useRef(false);

  // Get user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      userId.current = data.user?.id || null;
    });
  }, []);

  // Start feature session
  const startSession = useCallback(async () => {
    if (!userId.current) return;

    state.current = {
      id: null,
      startedAt: Date.now(),
      activeTime: 0,
      lastActiveTime: Date.now(),
      isVisible: true,
      clickCount: 0,
      inputCount: 0,
      maxScrollPercent: 0,
    };
    savedRef.current = false;

    try {
      const { data, error } = await supabase
        .from('feature_sessions')
        .insert({
          user_id: userId.current,
          session_id: sessionManager.getSessionId(),
          feature_name: featureName,
          feature_category: category,
          started_at: new Date().toISOString(),
          entity_type: options?.entityType,
          entity_id: options?.entityId,
          metadata: options?.metadata,
        })
        .select('id')
        .single();

      if (!error && data) {
        state.current.id = data.id;
      }
    } catch (error) {
      console.error('Failed to start feature session:', error);
    }
  }, [featureName, category, options?.entityType, options?.entityId, options?.metadata]);

  // End feature session
  const endSession = useCallback(async (exitType: string = 'navigate', exitTo?: string) => {
    if (!userId.current || !state.current.id || savedRef.current) return;
    savedRef.current = true;

    const now = Date.now();
    const s = state.current;
    
    // Calculate final active time
    if (s.isVisible) {
      s.activeTime += now - s.lastActiveTime;
    }

    const durationMs = now - s.startedAt;

    try {
      await supabase
        .from('feature_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_ms: durationMs,
          active_duration_ms: s.activeTime,
          click_count: s.clickCount,
          input_count: s.inputCount,
          scroll_depth_percent: s.maxScrollPercent,
          exit_type: exitType,
          exit_to: exitTo,
        })
        .eq('id', s.id);
    } catch (error) {
      console.error('Failed to end feature session:', error);
    }
  }, []);

  // Track visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      const s = state.current;

      if (document.hidden) {
        // Going hidden - save active time
        if (s.isVisible) {
          s.activeTime += now - s.lastActiveTime;
        }
        s.isVisible = false;
      } else {
        // Coming back - reset active timer
        s.lastActiveTime = now;
        s.isVisible = true;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track clicks
  useEffect(() => {
    const handleClick = () => {
      state.current.clickCount++;
    };

    document.addEventListener('click', handleClick, { passive: true });
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Track inputs
  useEffect(() => {
    const handleInput = () => {
      state.current.inputCount++;
    };

    document.addEventListener('input', handleInput, { passive: true });
    return () => document.removeEventListener('input', handleInput);
  }, []);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? Math.round((scrollY / docHeight) * 100) : 0;
      
      if (percent > state.current.maxScrollPercent) {
        state.current.maxScrollPercent = percent;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Start on mount, end on unmount or route change
  useEffect(() => {
    startSession();

    return () => {
      endSession('navigate', location.pathname);
    };
  }, [startSession, endSession, location.pathname]);

  // Manual tracking functions
  const trackClick = useCallback(() => {
    state.current.clickCount++;
  }, []);

  const trackInput = useCallback(() => {
    state.current.inputCount++;
  }, []);

  const endWithError = useCallback(() => {
    endSession('error');
  }, [endSession]);

  return {
    trackClick,
    trackInput,
    endWithError,
    getStats: () => ({
      duration: Date.now() - state.current.startedAt,
      activeTime: state.current.activeTime + (state.current.isVisible ? Date.now() - state.current.lastActiveTime : 0),
      clicks: state.current.clickCount,
      inputs: state.current.inputCount,
      scrollDepth: state.current.maxScrollPercent,
    }),
  };
}
