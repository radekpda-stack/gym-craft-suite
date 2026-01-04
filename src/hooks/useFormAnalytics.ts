import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

export interface FieldInteraction {
  field_name: string;
  time_spent_ms: number;
  interactions: number;
  validation_errors: number;
  was_skipped: boolean;
  focus_count: number;
  blur_count: number;
}

export interface FormAnalyticsSession {
  id?: string;
  form_type: string;
  form_instance_id?: string;
  client_id?: string;
  session_id: string;
  started_at: Date;
  fields: Map<string, FieldInteraction>;
}

// Generate a unique session ID
const generateSessionId = () => `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Detect device type
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

/**
 * Hook for tracking form field analytics
 * Tracks: time spent on fields, validation errors, skipped fields, completion rate
 */
export function useFormAnalytics(options: {
  formType: string;
  formInstanceId?: string;
  clientId?: string;
  trainerId?: string; // For portal forms where trainer owns the data
}) {
  const { user } = useAuth();
  const sessionRef = useRef<FormAnalyticsSession | null>(null);
  const currentFieldRef = useRef<{ name: string; focusTime: number } | null>(null);
  const analyticsIdRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);

  // Initialize session
  const initSession = useCallback(() => {
    if (!sessionRef.current) {
      sessionRef.current = {
        form_type: options.formType,
        form_instance_id: options.formInstanceId,
        client_id: options.clientId,
        session_id: generateSessionId(),
        started_at: new Date(),
        fields: new Map(),
      };
    }
    return sessionRef.current;
  }, [options.formType, options.formInstanceId, options.clientId]);

  // Track field focus
  const trackFieldFocus = useCallback((fieldName: string) => {
    const session = initSession();
    
    // End previous field tracking if any
    if (currentFieldRef.current && currentFieldRef.current.name !== fieldName) {
      const prevField = session.fields.get(currentFieldRef.current.name);
      if (prevField) {
        prevField.time_spent_ms += Date.now() - currentFieldRef.current.focusTime;
        prevField.blur_count++;
      }
    }
    
    // Start tracking new field
    currentFieldRef.current = { name: fieldName, focusTime: Date.now() };
    
    // Initialize or update field data
    if (!session.fields.has(fieldName)) {
      session.fields.set(fieldName, {
        field_name: fieldName,
        time_spent_ms: 0,
        interactions: 0,
        validation_errors: 0,
        was_skipped: false,
        focus_count: 0,
        blur_count: 0,
      });
    }
    
    const field = session.fields.get(fieldName)!;
    field.focus_count++;
    field.interactions++;
  }, [initSession]);

  // Track field blur
  const trackFieldBlur = useCallback((fieldName: string, hasValue: boolean) => {
    const session = sessionRef.current;
    if (!session) return;
    
    if (currentFieldRef.current?.name === fieldName) {
      const field = session.fields.get(fieldName);
      if (field) {
        field.time_spent_ms += Date.now() - currentFieldRef.current.focusTime;
        field.blur_count++;
        field.was_skipped = !hasValue;
      }
      currentFieldRef.current = null;
    }
  }, []);

  // Track validation error
  const trackValidationError = useCallback((fieldName: string) => {
    const session = initSession();
    
    if (!session.fields.has(fieldName)) {
      session.fields.set(fieldName, {
        field_name: fieldName,
        time_spent_ms: 0,
        interactions: 0,
        validation_errors: 0,
        was_skipped: false,
        focus_count: 0,
        blur_count: 0,
      });
    }
    
    const field = session.fields.get(fieldName)!;
    field.validation_errors++;
  }, [initSession]);

  // Track field change/interaction
  const trackFieldChange = useCallback((fieldName: string) => {
    const session = sessionRef.current;
    if (!session) return;
    
    const field = session.fields.get(fieldName);
    if (field) {
      field.interactions++;
    }
  }, []);

  // Save analytics to database
  const saveAnalytics = useCallback(async (completed: boolean) => {
    const session = sessionRef.current;
    if (!session || isSavingRef.current) return;
    
    const userId = options.trainerId || user?.id;
    if (!userId) return;

    isSavingRef.current = true;

    try {
      // Convert fields map to array
      const fieldsData = Array.from(session.fields.values());
      const totalFields = fieldsData.length;
      const completedFields = fieldsData.filter(f => !f.was_skipped && f.time_spent_ms > 0).length;
      const skippedFields = fieldsData.filter(f => f.was_skipped).length;
      const validationErrorCount = fieldsData.reduce((sum, f) => sum + f.validation_errors, 0);
      
      const now = new Date();
      const totalTimeSeconds = Math.round((now.getTime() - session.started_at.getTime()) / 1000);

      const analyticsData = {
        user_id: userId,
        client_id: session.client_id || null,
        form_type: session.form_type,
        form_instance_id: session.form_instance_id || null,
        session_id: session.session_id,
        form_started_at: session.started_at.toISOString(),
        form_completed_at: completed ? now.toISOString() : null,
        form_abandoned_at: !completed ? now.toISOString() : null,
        total_time_seconds: totalTimeSeconds,
        // Cast to JSON compatible format
        fields_data: JSON.parse(JSON.stringify(fieldsData)) as Json,
        total_fields: totalFields,
        completed_fields: completedFields,
        skipped_fields: skippedFields,
        validation_error_count: validationErrorCount,
        device_type: getDeviceType(),
        viewport_width: window.innerWidth,
      };

      if (analyticsIdRef.current) {
        // Update existing record
        await supabase
          .from('form_field_analytics')
          .update(analyticsData)
          .eq('id', analyticsIdRef.current);
      } else {
        // Insert new record
        const { data } = await supabase
          .from('form_field_analytics')
          .insert(analyticsData)
          .select('id')
          .single();
        
        if (data) {
          analyticsIdRef.current = data.id;
        }
      }
    } catch (error) {
      console.error('Error saving form analytics:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [user?.id, options.trainerId]);

  // Mark form as completed
  const completeForm = useCallback(() => {
    saveAnalytics(true);
  }, [saveAnalytics]);

  // Mark form as abandoned (call on unmount or explicit abandonment)
  const abandonForm = useCallback(() => {
    if (sessionRef.current && !isSavingRef.current) {
      saveAnalytics(false);
    }
  }, [saveAnalytics]);

  // Save on unmount (abandonment)
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        // Fire and forget - save abandonment
        abandonForm();
      }
    };
  }, [abandonForm]);

  // Auto-save periodically (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionRef.current && !isSavingRef.current) {
        saveAnalytics(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [saveAnalytics]);

  return {
    trackFieldFocus,
    trackFieldBlur,
    trackValidationError,
    trackFieldChange,
    completeForm,
    abandonForm,
    sessionId: sessionRef.current?.session_id,
  };
}

/**
 * Hook for fetching form analytics statistics
 */
export function useFormAnalyticsStats(period: '7d' | '30d' | '90d' | 'all' = '30d') {
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user?.id) return null;

    const startDate = period === 'all' 
      ? new Date('2020-01-01')
      : period === '7d'
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : period === '30d'
          ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('form_field_analytics')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching form analytics:', error);
      return null;
    }

    return data;
  }, [user?.id, period]);

  return { fetchStats };
}
