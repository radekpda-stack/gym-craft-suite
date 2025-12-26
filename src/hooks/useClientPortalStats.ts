import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, differenceInWeeks, parseISO, startOfDay } from 'date-fns';

export type PeriodDays = 7 | 30 | 90 | 'all';

// =====================================================
// ATTENDANCE STATS (period-based)
// =====================================================

export interface AttendanceStats {
  trainingsInPeriod: number;
  trainingsInPreviousPeriod: number;
  trend: number; // difference
  avgPerWeek: number;
  lastTraining: {
    date: string;
    type: string | null;
    duration: number | null;
  } | null;
  sessions: Array<{
    id: string;
    date: string;
    duration: number | null;
    status: string | null;
    training_type: string | null;
  }>;
}

export function useClientAttendanceStats(clientId: string | undefined, period: PeriodDays = 30) {
  return useQuery({
    queryKey: ['client-portal-attendance-stats', clientId, period],
    queryFn: async (): Promise<AttendanceStats> => {
      if (!clientId) {
        return {
          trainingsInPeriod: 0,
          trainingsInPreviousPeriod: 0,
          trend: 0,
          avgPerWeek: 0,
          lastTraining: null,
          sessions: [],
        };
      }

      const today = startOfDay(new Date());
      const periodDays = period === 'all' ? 365 * 2 : period; // 2 years for "all"
      const startDate = format(subDays(today, periodDays), 'yyyy-MM-dd');
      const previousStartDate = format(subDays(today, periodDays * 2), 'yyyy-MM-dd');

      // Fetch sessions in current period
      const { data: currentSessions, error: currentError } = await supabase
        .from('training_sessions')
        .select('id, date, duration, status, training_type')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (currentError) throw currentError;

      // Fetch sessions in previous period for trend
      const { data: previousSessions, error: previousError } = await supabase
        .from('training_sessions')
        .select('id')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .gte('date', previousStartDate)
        .lt('date', startDate);

      if (previousError) throw previousError;

      const sessions = currentSessions ?? [];
      const trainingsInPeriod = sessions.length;
      const trainingsInPreviousPeriod = previousSessions?.length ?? 0;
      const trend = trainingsInPeriod - trainingsInPreviousPeriod;

      // Calculate avg per week
      const weeks = Math.max(1, periodDays / 7);
      const avgPerWeek = Math.round((trainingsInPeriod / weeks) * 10) / 10;

      // Get last training
      const lastTraining = sessions.length > 0 
        ? {
            date: sessions[0].date,
            type: sessions[0].training_type,
            duration: sessions[0].duration,
          }
        : null;

      return {
        trainingsInPeriod,
        trainingsInPreviousPeriod,
        trend,
        avgPerWeek,
        lastTraining,
        sessions,
      };
    },
    enabled: !!clientId,
  });
}

// =====================================================
// CREDIT STATS (period-based with credit_history_start_at filter)
// =====================================================

export interface CreditStats {
  balance: number;
  spentInPeriod: number;
  addedInPeriod: number;
  netChange: number;
  creditHistoryStartAt: string | null;
  lastTransaction: {
    date: string;
    amount: number;
    description: string | null;
    type: string;
  } | null;
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string | null;
    payment_method: string | null;
    created_at: string;
  }>;
}

export function useClientCreditStats(clientId: string | undefined, period: PeriodDays = 30) {
  return useQuery({
    queryKey: ['client-portal-credit-stats', clientId, period],
    queryFn: async (): Promise<CreditStats> => {
      if (!clientId) {
        return {
          balance: 0,
          spentInPeriod: 0,
          addedInPeriod: 0,
          netChange: 0,
          creditHistoryStartAt: null,
          lastTransaction: null,
          transactions: [],
        };
      }

      // Get current balance (always shown, no filter)
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('credit_balance')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      const balance = client?.credit_balance ?? 0;

      // Get credit_history_start_at from client_accounts
      const { data: accountData } = await supabase
        .from('client_accounts')
        .select('credit_history_start_at')
        .eq('client_id', clientId)
        .maybeSingle();

      const creditHistoryStartAt = accountData?.credit_history_start_at ?? null;

      // Get transactions for period with credit_history_start_at filter
      const today = startOfDay(new Date());
      const periodDays = period === 'all' ? 365 * 5 : period;
      const startDate = format(subDays(today, periodDays), 'yyyy-MM-dd');

      // Build query with credit_history_start_at filter
      let query = supabase
        .from('credit_transactions')
        .select('id, amount, type, description, payment_method, created_at')
        .eq('client_id', clientId)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      // Apply credit_history_start_at filter if exists
      if (creditHistoryStartAt) {
        query = query.gte('created_at', creditHistoryStartAt);
      }

      const { data: transactions, error: txError } = await query;

      if (txError) throw txError;

      const txList = transactions ?? [];
      
      const spentInPeriod = txList
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const addedInPeriod = txList
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      const netChange = addedInPeriod - spentInPeriod;

      const lastTransaction = txList.length > 0
        ? {
            date: txList[0].created_at,
            amount: txList[0].amount,
            description: txList[0].description,
            type: txList[0].type,
          }
        : null;

      return {
        balance,
        spentInPeriod,
        addedInPeriod,
        netChange,
        creditHistoryStartAt,
        lastTransaction,
        transactions: txList,
      };
    },
    enabled: !!clientId,
  });
}

// =====================================================
// RECENT ACTIVITY (combined for dashboard)
// =====================================================

export interface ActivityItem {
  id: string;
  type: 'training' | 'credit';
  date: string;
  label: string;
  value?: string;
}

export function useClientRecentActivity(clientId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ['client-portal-recent-activity', clientId, limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!clientId) return [];

      // Fetch recent trainings
      const { data: trainings } = await supabase
        .from('training_sessions')
        .select('id, date, training_type, status')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(limit);

      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('id, amount, type, description, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      const activities: ActivityItem[] = [];

      (trainings ?? []).forEach(t => {
        activities.push({
          id: `training-${t.id}`,
          type: 'training',
          date: t.date,
          label: t.training_type || 'Trénink',
        });
      });

      (transactions ?? []).forEach(t => {
        activities.push({
          id: `credit-${t.id}`,
          type: 'credit',
          date: t.created_at,
          label: t.description || t.type,
          value: `${t.amount > 0 ? '+' : ''}${t.amount.toLocaleString('cs-CZ')} Kč`,
        });
      });

      // Sort by date and limit
      return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
    },
    enabled: !!clientId,
  });
}
