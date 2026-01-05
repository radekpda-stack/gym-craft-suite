/**
 * useJourney - Hook for tracking user journeys/funnels
 * 
 * Use for tracking multi-step processes like:
 * - Onboarding
 * - Creating a client
 * - Completing a training session
 */

import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sessionManager } from '../SessionManager';

interface JourneyStep {
  step: string;
  route: string;
  timestamp: string;
  duration_ms?: number;
  metadata?: Record<string, any>;
}

interface JourneyState {
  id: string | null;
  steps: JourneyStep[];
  startedAt: number;
  lastStepTime: number;
}

export function useJourney(journeyType: string, journeyName?: string) {
  const state = useRef<JourneyState>({
    id: null,
    steps: [],
    startedAt: 0,
    lastStepTime: 0,
  });
  const userId = useRef<string | null>(null);

  // Get user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      userId.current = data.user?.id || null;
    });
  }, []);

  // Start a new journey
  const startJourney = useCallback(async (metadata?: Record<string, any>) => {
    if (!userId.current) return null;

    const now = Date.now();
    state.current = {
      id: null,
      steps: [],
      startedAt: now,
      lastStepTime: now,
    };

    try {
      const { data, error } = await supabase
        .from('user_journeys')
        .insert({
          user_id: userId.current,
          session_id: sessionManager.getSessionId(),
          journey_type: journeyType,
          journey_name: journeyName,
          started_at: new Date().toISOString(),
          steps: [],
          total_steps: 0,
          completed_steps: 0,
          metadata,
        })
        .select('id')
        .single();

      if (!error && data) {
        state.current.id = data.id;
        return data.id;
      }
    } catch (error) {
      console.error('Failed to start journey:', error);
    }
    
    return null;
  }, [journeyType, journeyName]);

  // Add a step to the journey
  const addStep = useCallback(async (
    stepName: string,
    route: string,
    metadata?: Record<string, any>
  ) => {
    if (!state.current.id) return;

    const now = Date.now();
    const step: JourneyStep = {
      step: stepName,
      route,
      timestamp: new Date().toISOString(),
      duration_ms: now - state.current.lastStepTime,
      metadata,
    };

    state.current.steps.push(step);
    state.current.lastStepTime = now;

    try {
      await supabase
        .from('user_journeys')
        .update({
          steps: JSON.parse(JSON.stringify(state.current.steps)),
          total_steps: state.current.steps.length,
          completed_steps: state.current.steps.length,
        })
        .eq('id', state.current.id);
    } catch (error) {
      console.error('Failed to add journey step:', error);
    }
  }, []);

  // Complete the journey successfully
  const completeJourney = useCallback(async (metadata?: Record<string, any>) => {
    if (!state.current.id) return;

    try {
      await supabase
        .from('user_journeys')
        .update({
          completed_at: new Date().toISOString(),
          success: true,
          metadata: {
            ...(metadata || {}),
            totalDuration: Date.now() - state.current.startedAt,
          },
        })
        .eq('id', state.current.id);
    } catch (error) {
      console.error('Failed to complete journey:', error);
    }

    state.current.id = null;
  }, []);

  // Abandon the journey
  const abandonJourney = useCallback(async (reason?: string) => {
    if (!state.current.id) return;

    try {
      await supabase
        .from('user_journeys')
        .update({
          abandoned_at: new Date().toISOString(),
          success: false,
          metadata: {
            abandonReason: reason,
            lastStep: state.current.steps[state.current.steps.length - 1]?.step,
            totalDuration: Date.now() - state.current.startedAt,
          },
        })
        .eq('id', state.current.id);
    } catch (error) {
      console.error('Failed to abandon journey:', error);
    }

    state.current.id = null;
  }, []);

  // Check if journey is active
  const isActive = useCallback(() => {
    return state.current.id !== null;
  }, []);

  return {
    startJourney,
    addStep,
    completeJourney,
    abandonJourney,
    isActive,
    getSteps: () => [...state.current.steps],
  };
}

// Predefined journey types
export const JOURNEY_TYPES = {
  ONBOARDING: 'onboarding',
  CREATE_CLIENT: 'create_client',
  CREATE_TRAINING: 'create_training',
  COMPLETE_SESSION: 'complete_session',
  FIRST_PAYMENT: 'first_payment',
  SETUP_PORTAL: 'setup_portal',
} as const;
