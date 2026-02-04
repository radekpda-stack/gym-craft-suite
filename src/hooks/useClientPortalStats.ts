import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, differenceInWeeks, parseISO, startOfDay, addDays } from 'date-fns';
import { cs } from 'date-fns/locale';

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

export function useClientPortalAttendanceStats(clientId: string | undefined, period: PeriodDays = 30) {
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
      // Get current balance from shared budget or ledger (not stale credit_balance field)
      // First check if client is in a budget group
      const { data: budgetMembership } = await supabase
        .from('client_budget_members')
        .select('group_id, client_budget_groups(shared_balance)')
        .eq('client_id', clientId)
        .maybeSingle();

      let balance = 0;
      
      if (budgetMembership?.client_budget_groups) {
        // Client is in a shared budget - use group balance
        balance = (budgetMembership.client_budget_groups as any).shared_balance || 0;
      } else {
        // Individual client - calculate from ledger
        const { data: transactions } = await supabase
          .from('credit_transactions')
          .select('amount')
          .eq('client_id', clientId)
          .is('group_id', null);
        
        balance = (transactions || []).reduce((sum, t) => sum + (t.amount || 0), 0);
      }

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
// Shows: completed trainings, upcoming trainings, credit payments (only additions)
// =====================================================

export interface ActivityItem {
  id: string;
  type: 'training' | 'upcoming_training' | 'credit';
  date: string;
  label: string;
  value?: string;
}

export function useClientRecentActivity(clientId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ['client-portal-recent-activity', clientId, limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!clientId) return [];

      const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
      const futureLimit = format(addDays(new Date(), 30), 'yyyy-MM-dd'); // Next 30 days

      // Fetch recent completed trainings
      const { data: completedTrainings } = await supabase
        .from('training_sessions')
        .select('id, date, training_type, status')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(limit);

      // Fetch upcoming scheduled trainings
      const { data: upcomingTrainings } = await supabase
        .from('training_sessions')
        .select('id, date, training_type, status')
        .eq('client_id', clientId)
        .eq('status', 'scheduled')
        .gte('date', today)
        .lte('date', futureLimit)
        .order('date', { ascending: true })
        .limit(3); // Max 3 upcoming

      // Fetch only credit additions (payments), not deductions
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('id, amount, type, description, created_at')
        .eq('client_id', clientId)
        .eq('type', 'credit') // Only credit additions (payments)
        .gt('amount', 0) // Positive amounts only
        .order('created_at', { ascending: false })
        .limit(limit);

      const activities: ActivityItem[] = [];

      // Add completed trainings
      (completedTrainings ?? []).forEach(t => {
        activities.push({
          id: `training-${t.id}`,
          type: 'training',
          date: t.date,
          label: t.training_type ? `Trénink – ${t.training_type}` : 'Trénink',
        });
      });

      // Add upcoming trainings
      (upcomingTrainings ?? []).forEach(t => {
        activities.push({
          id: `upcoming-${t.id}`,
          type: 'upcoming_training',
          date: t.date,
          label: 'Naplánovaný trénink',
        });
      });

// Add credit payments
      (transactions ?? []).forEach(t => {
        activities.push({
          id: `credit-${t.id}`,
          type: 'credit',
          date: t.created_at,
          label: 'Platba kreditu',
          value: `+${t.amount.toLocaleString('cs-CZ')} Kč`,
        });
      });

      // Sort: upcoming first (by date asc), then rest by date desc
      const upcoming = activities.filter(a => a.type === 'upcoming_training')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const past = activities.filter(a => a.type !== 'upcoming_training')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return [...upcoming, ...past].slice(0, limit);
    },
    enabled: !!clientId,
  });
}

// =====================================================
// UNPAID TRAININGS (for effective balance calculation)
// =====================================================

export interface UnpaidTrainingsInfo {
  count: number;
  amount: number;
  sessions: Array<{
    id: string;
    date: string;
    final_price: number | null;
  }>;
}

export function useClientUnpaidTrainings(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-unpaid', clientId],
    queryFn: async (): Promise<UnpaidTrainingsInfo> => {
      if (!clientId) {
        return { count: 0, amount: 0, sessions: [] };
      }

      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, date, final_price')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .eq('payment_status', 'pending')
        .order('date', { ascending: false });

      if (error) throw error;

      const sessions = data ?? [];
      const count = sessions.length;
      const amount = sessions.reduce((sum, t) => sum + (t.final_price || 0), 0);

      return { count, amount, sessions };
    },
    enabled: !!clientId,
  });
}
