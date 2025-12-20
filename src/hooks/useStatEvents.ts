import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

export type StatEventType = 'training' | 'feedback' | 'nutrition' | 'health' | 'finance' | 'measurement';

export interface StatEvent {
  id: string;
  user_id: string;
  client_id: string | null;
  session_id: string | null;
  event_type: StatEventType;
  event_name: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string | null;
  context_json: Json;
  recorded_at: string;
  created_at: string;
}

export interface CreateStatEventInput {
  client_id?: string | null;
  session_id?: string | null;
  event_type: StatEventType;
  event_name: string;
  value_numeric?: number | null;
  value_text?: string | null;
  unit?: string | null;
  context_json?: Json;
  recorded_at?: string;
}

// Hook pro vytváření stat events
export function useCreateStatEvent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStatEventInput) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('stat_events')
        .insert({
          user_id: user.id,
          client_id: input.client_id ?? null,
          session_id: input.session_id ?? null,
          event_type: input.event_type,
          event_name: input.event_name,
          value_numeric: input.value_numeric ?? null,
          value_text: input.value_text ?? null,
          unit: input.unit ?? null,
          context_json: input.context_json ?? {},
          recorded_at: input.recorded_at ?? new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stat-events'] });
    },
  });
}

// Batch insert pro více událostí najednou
export function useCreateStatEventsBatch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: CreateStatEventInput[]) => {
      if (!user) throw new Error('User not authenticated');
      if (inputs.length === 0) return [];

      const events = inputs.map((input) => ({
        user_id: user.id,
        client_id: input.client_id ?? null,
        session_id: input.session_id ?? null,
        event_type: input.event_type,
        event_name: input.event_name,
        value_numeric: input.value_numeric ?? null,
        value_text: input.value_text ?? null,
        unit: input.unit ?? null,
        context_json: input.context_json ?? {},
        recorded_at: input.recorded_at ?? new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('stat_events')
        .insert(events)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stat-events'] });
    },
  });
}

// Hook pro načítání stat events
export function useStatEvents(options?: {
  clientId?: string;
  eventType?: StatEventType;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stat-events', user?.id, options],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('stat_events')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false });

      if (options?.clientId) {
        query = query.eq('client_id', options.clientId);
      }
      if (options?.eventType) {
        query = query.eq('event_type', options.eventType);
      }
      if (options?.startDate) {
        query = query.gte('recorded_at', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('recorded_at', options.endDate);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StatEvent[];
    },
    enabled: !!user,
  });
}

// Utility funkce pro logování běžných událostí
export function createTrainingEvents(
  sessionId: string,
  clientId: string,
  data: {
    duration?: number;
    exerciseCount?: number;
    totalSets?: number;
    totalReps?: number;
    totalVolume?: number;
    tags?: string[];
  }
): CreateStatEventInput[] {
  const events: CreateStatEventInput[] = [];
  const now = new Date().toISOString();

  events.push({
    client_id: clientId,
    session_id: sessionId,
    event_type: 'training',
    event_name: 'training_completed',
    value_numeric: 1,
    context_json: {
      duration: data.duration ?? null,
      exerciseCount: data.exerciseCount ?? null,
      totalSets: data.totalSets ?? null,
      totalReps: data.totalReps ?? null,
      totalVolume: data.totalVolume ?? null,
      tags: data.tags ?? null,
    },
    recorded_at: now,
  });

  if (data.duration) {
    events.push({
      client_id: clientId,
      session_id: sessionId,
      event_type: 'training',
      event_name: 'training_duration',
      value_numeric: data.duration,
      unit: 'min',
      recorded_at: now,
    });
  }

  if (data.totalVolume) {
    events.push({
      client_id: clientId,
      session_id: sessionId,
      event_type: 'training',
      event_name: 'training_volume',
      value_numeric: data.totalVolume,
      unit: 'kg',
      recorded_at: now,
    });
  }

  return events;
}

export function createFeedbackEvents(
  clientId: string,
  sessionId: string | null,
  data: {
    sleepQuality?: number;
    fatigueLevel?: number;
    sorenessLevel?: number;
    overallRating?: number;
    painAreas?: string[];
  }
): CreateStatEventInput[] {
  const events: CreateStatEventInput[] = [];
  const now = new Date().toISOString();

  if (data.sleepQuality !== undefined) {
    events.push({
      client_id: clientId,
      session_id: sessionId,
      event_type: 'feedback',
      event_name: 'sleep_quality',
      value_numeric: data.sleepQuality,
      unit: 'score',
      recorded_at: now,
    });
  }

  if (data.fatigueLevel !== undefined) {
    events.push({
      client_id: clientId,
      session_id: sessionId,
      event_type: 'feedback',
      event_name: 'fatigue_level',
      value_numeric: data.fatigueLevel,
      unit: 'score',
      recorded_at: now,
    });
  }

  if (data.sorenessLevel !== undefined) {
    events.push({
      client_id: clientId,
      session_id: sessionId,
      event_type: 'feedback',
      event_name: 'soreness_level',
      value_numeric: data.sorenessLevel,
      unit: 'score',
      recorded_at: now,
    });
  }

  if (data.overallRating !== undefined) {
    events.push({
      client_id: clientId,
      session_id: sessionId,
      event_type: 'feedback',
      event_name: 'overall_rating',
      value_numeric: data.overallRating,
      unit: 'score',
      recorded_at: now,
    });
  }

  if (data.painAreas && data.painAreas.length > 0) {
    data.painAreas.forEach((area) => {
      events.push({
        client_id: clientId,
        session_id: sessionId,
        event_type: 'health',
        event_name: 'pain_reported',
        value_text: area,
        context_json: { body_part: area },
        recorded_at: now,
      });
    });
  }

  return events;
}

export function createCreditEvent(
  clientId: string,
  data: {
    type: 'add' | 'use' | 'refund';
    amount: number;
    source?: string;
    description?: string;
  }
): CreateStatEventInput {
  return {
    client_id: clientId,
    event_type: 'finance',
    event_name: `credit_${data.type}`,
    value_numeric: data.amount,
    unit: 'CZK',
    context_json: {
      source: data.source ?? null,
      description: data.description ?? null,
    },
    recorded_at: new Date().toISOString(),
  };
}

export function createMeasurementEvent(
  clientId: string,
  data: {
    measurementType: string;
    value: number;
    unit: string;
  }
): CreateStatEventInput {
  return {
    client_id: clientId,
    event_type: 'measurement',
    event_name: data.measurementType,
    value_numeric: data.value,
    unit: data.unit,
    recorded_at: new Date().toISOString(),
  };
}
