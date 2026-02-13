/**
 * Hook for fetching dashboard metrics for each section
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessageCount } from '@/hooks/useChatMessages';
import { subDays, format } from 'date-fns';

// Performance metrics
export function usePerformanceMetrics(clientId: string | undefined) {
  const { user } = useAuth();
  
  const { data: prCount = 0 } = useQuery({
    queryKey: ['performance-metrics-prs', clientId],
    queryFn: async () => {
      const { count } = await supabase
        .from('client_prs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!);
      return count ?? 0;
    },
    enabled: !!clientId && !!user,
  });

  const { data: trainingStats } = useQuery({
    queryKey: ['performance-metrics-trainings', clientId],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('training_sessions')
        .select('id, status')
        .eq('client_id', clientId!)
        .eq('status', 'completed')
        .gte('date', thirtyDaysAgo);
      return {
        monthlyCount: data?.length ?? 0,
      };
    },
    enabled: !!clientId && !!user,
  });

  const { data: feedbackStats } = useQuery({
    queryKey: ['performance-metrics-feedback', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_feedback')
        .select('fun, enjoyment_level')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!data || data.length === 0) return { avgRating: null, count: 0 };
      
      // Use fun or enjoyment_level as rating proxy
      const ratings = data
        .map(f => f.fun ?? f.enjoyment_level)
        .filter((r): r is number => r !== null);
      const avg = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : null;
      
      return {
        avgRating: avg ? Math.round(avg * 10) / 10 : null,
        count: data.length,
      };
    },
    enabled: !!clientId && !!user,
  });

  return {
    prCount,
    monthlyTrainings: trainingStats?.monthlyCount ?? 0,
    avgFeedbackRating: feedbackStats?.avgRating ?? null,
    feedbackCount: feedbackStats?.count ?? 0,
  };
}

// Communication metrics
export function useCommunicationMetrics(clientId: string | undefined) {
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useUnreadMessageCount(undefined, clientId);

  const { data: notesStats } = useQuery({
    queryKey: ['communication-metrics-notes', clientId],
    queryFn: async () => {
      const { data: client } = await supabase
        .from('clients')
        .select('notes')
        .eq('id', clientId!)
        .maybeSingle();
      
      const notes = client?.notes || '';
      const noteCount = notes.split('\n\n').filter((n: string) => n.startsWith('[')).length;
      
      return { noteCount };
    },
    enabled: !!clientId && !!user,
  });

  const { data: lastMessage } = useQuery({
    queryKey: ['communication-metrics-last-message', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return data?.created_at ?? null;
    },
    enabled: !!clientId && !!user,
  });

  return {
    unreadCount,
    noteCount: notesStats?.noteCount ?? 0,
    lastMessageAt: lastMessage,
  };
}

// Health metrics - uses training_feedback for pain data
export function useHealthMetrics(clientId: string | undefined) {
  const { user } = useAuth();

  const { data: painData } = useQuery({
    queryKey: ['health-metrics-pain', clientId],
    queryFn: async () => {
      // Get pain data from training_feedback
      const fourteenDaysAgo = format(subDays(new Date(), 14), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('training_feedback')
        .select('id, pain, pain_area')
        .eq('client_id', clientId!)
        .gte('training_date', fourteenDaysAgo)
        .gt('pain', 3);
      
      const activePains = data?.length ?? 0;
      const hasHighSeverity = data?.some(p => (p.pain ?? 0) >= 7) ?? false;
      
      return { activePains, hasHighSeverity };
    },
    enabled: !!clientId && !!user,
  });

  const { data: lastDiagnostic } = useQuery({
    queryKey: ['health-metrics-diagnostic', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('diagnostics')
        .select('created_at')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return data?.created_at ?? null;
    },
    enabled: !!clientId && !!user,
  });

  const { data: healthRestrictions } = useQuery({
    queryKey: ['health-metrics-restrictions', clientId],
    queryFn: async () => {
      const { data: client } = await supabase
        .from('clients')
        .select('health_restrictions')
        .eq('id', clientId!)
        .maybeSingle();
      
      return !!client?.health_restrictions;
    },
    enabled: !!clientId && !!user,
  });

  return {
    activePains: painData?.activePains ?? 0,
    hasHighSeverity: painData?.hasHighSeverity ?? false,
    lastDiagnosticAt: lastDiagnostic,
    hasRestrictions: healthRestrictions ?? false,
  };
}

// Body metrics
export function useBodyMetrics(clientId: string | undefined) {
  const { user } = useAuth();

  const { data: measurementData } = useQuery({
    queryKey: ['body-metrics-measurements', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('measurements')
        .select('weight, date')
        .eq('client_id', clientId!)
        .order('date', { ascending: false })
        .limit(2);
      
      if (!data || data.length === 0) {
        return { currentWeight: null, weightChange: null, measurementCount: 0 };
      }

      const currentWeight = data[0]?.weight;
      const previousWeight = data[1]?.weight;
      const weightChange = currentWeight && previousWeight 
        ? Math.round((currentWeight - previousWeight) * 10) / 10
        : null;

      const { count } = await supabase
        .from('measurements')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!);

      return {
        currentWeight,
        weightChange,
        measurementCount: count ?? 0,
      };
    },
    enabled: !!clientId && !!user,
  });

  const { data: mediaCount = 0 } = useQuery({
    queryKey: ['body-metrics-media', clientId],
    queryFn: async () => {
      const { count } = await supabase
        .from('client_media')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!);
      return count ?? 0;
    },
    enabled: !!clientId && !!user,
  });

  return {
    currentWeight: measurementData?.currentWeight ?? null,
    weightChange: measurementData?.weightChange ?? null,
    measurementCount: measurementData?.measurementCount ?? 0,
    mediaCount,
  };
}

// History metrics
export function useHistoryMetrics(clientId: string | undefined) {
  const { user } = useAuth();

  const { data: timelineData } = useQuery({
    queryKey: ['history-metrics-timeline', clientId],
    queryFn: async () => {
      // Count training sessions as events
      const { count: sessionCount } = await supabase
        .from('training_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!);

      // Get last event date
      const { data: lastSession } = await supabase
        .from('training_sessions')
        .select('date')
        .eq('client_id', clientId!)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        eventCount: sessionCount ?? 0,
        lastEventDate: lastSession?.date ?? null,
      };
    },
    enabled: !!clientId && !!user,
  });

  return {
    eventCount: timelineData?.eventCount ?? 0,
    lastEventDate: timelineData?.lastEventDate ?? null,
  };
}
