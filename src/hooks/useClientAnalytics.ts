import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  startOfMonth, 
  subMonths, 
  format, 
  subDays, 
  eachDayOfInterval,
  startOfYear,
  subYears,
  parseISO,
  differenceInDays
} from 'date-fns';

// Types
export type PeriodType = 'month' | 'year' | '30days' | '90days' | 'custom';
export type ComparisonMode = 'clients' | 'average' | 'history';

export interface ClientAnalyticsFilters {
  clientIds?: string[];
  periodType: PeriodType;
  periodValue?: { start: string; end: string };
  comparisonMode?: ComparisonMode;
}

export interface ClientActivityData {
  clientId: string;
  clientName: string;
  sessionCount: number;
  firstSession: string | null;
  lastSession: string | null;
  daysSinceLastSession: number;
  avgSessionsPerMonth: number;
  totalVolume: number;
  activityTrend: Array<{ date: string; count: number; label: string }>;
}

export interface ClientRetentionData {
  cohortMonth: string;
  totalClients: number;
  retained: number[];
  retentionRate: number[];
}

export interface ClientAnalyticsData {
  // Summary
  activeClientsCount: number;
  totalClientsCount: number;
  activePercentage: number;
  
  // Activity distribution
  activityDistribution: Array<{
    bucket: string;
    count: number;
    percentage: number;
  }>;
  
  // Trend
  clientActivityTrend: Array<{
    date: string;
    activeClients: number;
    sessions: number;
    label: string;
  }>;
  
  // Retention (cohort based - no judgement)
  retentionData: ClientRetentionData[];
  
  // LTV data
  ltvDistribution: Array<{
    bucket: string;
    count: number;
    avgLtv: number;
  }>;
  
  // Per-client data for comparisons
  clientData?: ClientActivityData[];
  
  // Comparison data
  clientComparisons?: ClientActivityData[];
  averageComparison?: {
    clientData: ClientActivityData;
    averageData: {
      avgSessions: number;
      avgVolume: number;
      avgSessionsPerMonth: number;
    };
    percentDiff: {
      sessions: number;
      volume: number;
      sessionsPerMonth: number;
    };
  };
  historyComparison?: {
    currentPeriod: ClientActivityData;
    previousPeriod: ClientActivityData;
    percentChange: {
      sessions: number;
      volume: number;
    };
  };
}

function getDateRange(periodType: PeriodType, customRange?: { start: string; end: string }) {
  const now = new Date();
  
  switch (periodType) {
    case 'month':
      return { start: startOfMonth(now), end: now };
    case 'year':
      return { start: startOfYear(now), end: now };
    case '30days':
      return { start: subDays(now, 30), end: now };
    case '90days':
      return { start: subDays(now, 90), end: now };
    case 'custom':
      if (customRange) {
        return { start: parseISO(customRange.start), end: parseISO(customRange.end) };
      }
      return { start: subDays(now, 30), end: now };
    default:
      return { start: subDays(now, 30), end: now };
  }
}

function getPreviousPeriodRange(periodType: PeriodType, customRange?: { start: string; end: string }) {
  const now = new Date();
  
  switch (periodType) {
    case 'month':
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: subDays(startOfMonth(now), 1) };
    case 'year':
      const lastYear = subYears(now, 1);
      return { start: startOfYear(lastYear), end: subDays(startOfYear(now), 1) };
    case '30days':
      return { start: subDays(now, 60), end: subDays(now, 31) };
    case '90days':
      return { start: subDays(now, 180), end: subDays(now, 91) };
    case 'custom':
      if (customRange) {
        const start = parseISO(customRange.start);
        const end = parseISO(customRange.end);
        const diff = end.getTime() - start.getTime();
        return { start: new Date(start.getTime() - diff), end: new Date(start.getTime() - 1) };
      }
      return { start: subDays(now, 60), end: subDays(now, 31) };
    default:
      return { start: subDays(now, 60), end: subDays(now, 31) };
  }
}

async function fetchClientActivity(
  userId: string,
  clientId: string,
  startDate: Date,
  endDate: Date,
  clientName: string
): Promise<ClientActivityData> {
  const { data: sessions, error } = await supabase
    .from('training_sessions')
    .select('id, date, duration')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString())
    .order('date', { ascending: true });

  if (error) throw error;

  const { data: entries } = await supabase
    .from('exercise_entries')
    .select('sets, reps, weight_kg')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'));

  const totalVolume = (entries || []).reduce((sum, e) => 
    sum + (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 0), 0
  );

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const sessionsByDate = new Map<string, number>();
  sessions?.forEach(s => {
    // Extract just the date part from timestamp
    const dateStr = format(parseISO(s.date), 'yyyy-MM-dd');
    sessionsByDate.set(dateStr, (sessionsByDate.get(dateStr) || 0) + 1);
  });

  const activityTrend = days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return {
      date: dateStr,
      count: sessionsByDate.get(dateStr) || 0,
      label: format(day, 'd.M.'),
    };
  });

  const sessionCount = sessions?.length || 0;
  const firstSession = sessions?.[0]?.date || null;
  const lastSession = sessions?.[sessions.length - 1]?.date || null;
  const daysSinceLastSession = lastSession 
    ? differenceInDays(new Date(), parseISO(lastSession))
    : -1;

  const monthsInPeriod = Math.max(1, differenceInDays(endDate, startDate) / 30);
  const avgSessionsPerMonth = sessionCount / monthsInPeriod;

  return {
    clientId,
    clientName,
    sessionCount,
    firstSession,
    lastSession,
    daysSinceLastSession,
    avgSessionsPerMonth: Math.round(avgSessionsPerMonth * 10) / 10,
    totalVolume,
    activityTrend,
  };
}

export function useClientAnalytics(filters: ClientAnalyticsFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-analytics', user?.id, JSON.stringify(filters)],
    queryFn: async (): Promise<ClientAnalyticsData> => {
      if (!user?.id) throw new Error('No user');

      const { start, end } = getDateRange(filters.periodType, filters.periodValue);

      // Fetch all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, created_at, is_archived')
        .eq('user_id', user.id);

      if (clientsError) throw clientsError;

      // Fetch all training sessions for period
      const { data: sessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select('id, client_id, date')
        .eq('user_id', user.id)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());

      if (sessionsError) throw sessionsError;

      // Calculate session counts per client
      const sessionsByClient = new Map<string, number>();
      sessions?.forEach(s => {
        sessionsByClient.set(s.client_id, (sessionsByClient.get(s.client_id) || 0) + 1);
      });

      // Calculate activity distribution buckets
      const activityBuckets = {
        '0': 0,
        '1-2': 0,
        '3-5': 0,
        '6-10': 0,
        '11+': 0,
      };

      const activeClientIds = new Set<string>();
      clients?.forEach(client => {
        const count = sessionsByClient.get(client.id) || 0;
        if (count > 0) activeClientIds.add(client.id);
        
        if (count === 0) activityBuckets['0']++;
        else if (count <= 2) activityBuckets['1-2']++;
        else if (count <= 5) activityBuckets['3-5']++;
        else if (count <= 10) activityBuckets['6-10']++;
        else activityBuckets['11+']++;
      });

      const totalClients = clients?.length || 1;
      const activityDistribution = Object.entries(activityBuckets).map(([bucket, count]) => ({
        bucket,
        count,
        percentage: Math.round((count / totalClients) * 100),
      }));

      // Calculate daily activity trend
      const days = eachDayOfInterval({ start, end });
      const sessionsByDate = new Map<string, { clients: Set<string>; count: number }>();
      
      sessions?.forEach(s => {
        // Extract just the date part from timestamp
        const dateStr = format(parseISO(s.date), 'yyyy-MM-dd');
        const existing = sessionsByDate.get(dateStr) || { clients: new Set(), count: 0 };
        existing.clients.add(s.client_id);
        existing.count++;
        sessionsByDate.set(dateStr, existing);
      });

      const clientActivityTrend = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const data = sessionsByDate.get(dateStr);
        return {
          date: dateStr,
          activeClients: data?.clients.size || 0,
          sessions: data?.count || 0,
          label: format(day, 'd.M.'),
        };
      });

      // Simple retention data (cohort-style, without judgement)
      const retentionData: ClientRetentionData[] = [];

      // LTV distribution (based on session count as proxy)
      const ltvBuckets = {
        '1-5 tréninků': { count: 0, totalSessions: 0 },
        '6-15 tréninků': { count: 0, totalSessions: 0 },
        '16-30 tréninků': { count: 0, totalSessions: 0 },
        '31+ tréninků': { count: 0, totalSessions: 0 },
      };

      clients?.forEach(client => {
        const count = sessionsByClient.get(client.id) || 0;
        if (count >= 1 && count <= 5) {
          ltvBuckets['1-5 tréninků'].count++;
          ltvBuckets['1-5 tréninků'].totalSessions += count;
        } else if (count <= 15) {
          ltvBuckets['6-15 tréninků'].count++;
          ltvBuckets['6-15 tréninků'].totalSessions += count;
        } else if (count <= 30) {
          ltvBuckets['16-30 tréninků'].count++;
          ltvBuckets['16-30 tréninků'].totalSessions += count;
        } else if (count > 30) {
          ltvBuckets['31+ tréninků'].count++;
          ltvBuckets['31+ tréninků'].totalSessions += count;
        }
      });

      const ltvDistribution = Object.entries(ltvBuckets)
        .filter(([_, data]) => data.count > 0)
        .map(([bucket, data]) => ({
          bucket,
          count: data.count,
          avgLtv: data.count > 0 ? Math.round(data.totalSessions / data.count) : 0,
        }));

      const result: ClientAnalyticsData = {
        activeClientsCount: activeClientIds.size,
        totalClientsCount: clients?.length || 0,
        activePercentage: totalClients > 0 ? Math.round((activeClientIds.size / totalClients) * 100) : 0,
        activityDistribution,
        clientActivityTrend,
        retentionData,
        ltvDistribution,
      };

      // Handle comparison modes
      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);

      if (filters.comparisonMode === 'clients' && filters.clientIds && filters.clientIds.length > 1) {
        result.clientComparisons = await Promise.all(
          filters.clientIds.map(id => 
            fetchClientActivity(user.id, id, start, end, clientMap.get(id) || 'Klient')
          )
        );
      }

      if (filters.comparisonMode === 'average' && filters.clientIds && filters.clientIds.length === 1) {
        const clientData = await fetchClientActivity(
          user.id, 
          filters.clientIds[0], 
          start, 
          end, 
          clientMap.get(filters.clientIds[0]) || 'Klient'
        );

        // Calculate averages across all active clients
        const allClientData = await Promise.all(
          Array.from(activeClientIds).slice(0, 20).map(id => 
            fetchClientActivity(user.id, id, start, end, '')
          )
        );

        const avgSessions = allClientData.reduce((sum, c) => sum + c.sessionCount, 0) / allClientData.length;
        const avgVolume = allClientData.reduce((sum, c) => sum + c.totalVolume, 0) / allClientData.length;
        const avgSessionsPerMonth = allClientData.reduce((sum, c) => sum + c.avgSessionsPerMonth, 0) / allClientData.length;

        result.averageComparison = {
          clientData,
          averageData: {
            avgSessions,
            avgVolume,
            avgSessionsPerMonth: Math.round(avgSessionsPerMonth * 10) / 10,
          },
          percentDiff: {
            sessions: avgSessions > 0 ? Math.round(((clientData.sessionCount - avgSessions) / avgSessions) * 100) : 0,
            volume: avgVolume > 0 ? Math.round(((clientData.totalVolume - avgVolume) / avgVolume) * 100) : 0,
            sessionsPerMonth: avgSessionsPerMonth > 0 ? Math.round(((clientData.avgSessionsPerMonth - avgSessionsPerMonth) / avgSessionsPerMonth) * 100) : 0,
          },
        };
      }

      if (filters.comparisonMode === 'history' && filters.clientIds && filters.clientIds.length === 1) {
        const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(filters.periodType, filters.periodValue);
        
        const currentData = await fetchClientActivity(
          user.id, 
          filters.clientIds[0], 
          start, 
          end, 
          clientMap.get(filters.clientIds[0]) || 'Klient'
        );

        const previousData = await fetchClientActivity(
          user.id, 
          filters.clientIds[0], 
          prevStart, 
          prevEnd, 
          clientMap.get(filters.clientIds[0]) || 'Klient'
        );

        result.historyComparison = {
          currentPeriod: currentData,
          previousPeriod: previousData,
          percentChange: {
            sessions: previousData.sessionCount > 0 
              ? Math.round(((currentData.sessionCount - previousData.sessionCount) / previousData.sessionCount) * 100) 
              : currentData.sessionCount > 0 ? 100 : 0,
            volume: previousData.totalVolume > 0 
              ? Math.round(((currentData.totalVolume - previousData.totalVolume) / previousData.totalVolume) * 100) 
              : currentData.totalVolume > 0 ? 100 : 0,
          },
        };
      }

      return result;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// Saved Views Hook for Clients
export function useClientSavedViews() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['client-analytics-saved-views', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('analytics_saved_views')
        .select('*')
        .eq('user_id', user.id)
        .eq('view_type', 'clients')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const saveView = useMutation({
    mutationFn: async ({ name, filters }: { name: string; filters: ClientAnalyticsFilters }) => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('analytics_saved_views')
        .insert({
          user_id: user.id,
          name,
          view_type: 'clients',
          filters: filters as any,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-analytics-saved-views'] });
    },
  });

  const deleteView = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('analytics_saved_views')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-analytics-saved-views'] });
    },
  });

  return {
    views: query.data || [],
    isLoading: query.isLoading,
    saveView,
    deleteView,
  };
}
