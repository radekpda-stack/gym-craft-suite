import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { StatsPeriodRange } from '@/components/statistics/StatsPeriodSelector';

export interface CancellationRecord {
  id: string;
  date: string;
  canceledAt: string | null;
  isLate: boolean;
  clientId: string;
  clientName: string;
  creditDeducted: boolean;
  creditAmount: number | null;
}

export interface ClientCancellationSummary {
  clientId: string;
  clientName: string;
  total: number;
  late: number;
  withCredit: number;
  withoutCredit: number;
  totalCreditDeducted: number;
}

export interface MonthlyCancellationData {
  month: string;
  label: string;
  total: number;
  late: number;
  onTime: number;
  withCredit: number;
  withoutCredit: number;
}

export interface CancellationStats {
  totalCanceled: number;
  lateCancellations: number;
  withCreditDeducted: number;
  withoutCreditDeducted: number;
  totalCreditAmount: number;
  cancellationRate: number;
  lateCancellationRate: number;
  monthlyData: MonthlyCancellationData[];
  cancellations: CancellationRecord[];
  byClient: ClientCancellationSummary[];
}

export function useCancellationStats(periodRange?: StatsPeriodRange) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cancellation-stats', user?.id, periodRange?.start?.toISOString(), periodRange?.end?.toISOString()],
    queryFn: async (): Promise<CancellationStats> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Build query for canceled sessions with optional period filter
      let canceledQuery = supabase
        .from('training_sessions')
        .select(`
          id,
          date,
          canceled_at,
          is_late_cancellation,
          client_id,
          clients!inner(name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'canceled')
        .order('date', { ascending: false });

      // Apply period filter if provided
      if (periodRange?.start) {
        canceledQuery = canceledQuery.gte('date', periodRange.start.toISOString().split('T')[0]);
      }
      if (periodRange?.end) {
        canceledQuery = canceledQuery.lte('date', periodRange.end.toISOString().split('T')[0]);
      }

      const { data: canceledSessions, error: canceledError } = await canceledQuery;

      if (canceledError) throw canceledError;

      // Build query for total sessions count with optional period filter
      let totalQuery = supabase
        .from('training_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (periodRange?.start) {
        totalQuery = totalQuery.gte('date', periodRange.start.toISOString().split('T')[0]);
      }
      if (periodRange?.end) {
        totalQuery = totalQuery.lte('date', periodRange.end.toISOString().split('T')[0]);
      }

      const { count: totalSessions, error: totalError } = await totalQuery;

      if (totalError) throw totalError;

      // Fetch credit transactions for canceled trainings (to get actual amounts if available)
      const { data: creditTransactions, error: creditError } = await supabase
        .from('credit_transactions')
        .select('training_session_id, amount')
        .eq('type', 'canceled_training');

      if (creditError) throw creditError;

      // Create a map of session_id -> credit amount (for actual recorded amounts)
      const creditAmountMap = new Map<string, number>();
      creditTransactions?.forEach(ct => {
        if (ct.training_session_id) {
          creditAmountMap.set(ct.training_session_id, Math.abs(ct.amount));
        }
      });

      // Default training price for late cancellation deduction
      const DEFAULT_TRAINING_PRICE = 800;

      // Process cancellations
      // IMPORTANT: is_late_cancellation = true means credit was ALWAYS deducted
      const cancellations: CancellationRecord[] = (canceledSessions || []).map(session => {
        const isLate = session.is_late_cancellation || false;
        // Credit is deducted when it's a late cancellation
        const creditDeducted = isLate;
        // Use actual amount from credit_transactions if available, otherwise use default
        const creditAmount = creditDeducted 
          ? (creditAmountMap.get(session.id) || DEFAULT_TRAINING_PRICE)
          : null;

        return {
          id: session.id,
          date: session.date,
          canceledAt: session.canceled_at,
          isLate,
          clientId: session.client_id,
          clientName: (session.clients as any)?.name || 'Neznámý klient',
          creditDeducted,
          creditAmount,
        };
      });

      // Calculate summary stats
      const totalCanceled = cancellations.length;
      const lateCancellations = cancellations.filter(c => c.isLate).length;
      const withCreditDeducted = cancellations.filter(c => c.creditDeducted).length;
      const withoutCreditDeducted = totalCanceled - withCreditDeducted;
      const totalCreditAmount = cancellations.reduce((sum, c) => sum + (c.creditAmount || 0), 0);
      const cancellationRate = totalSessions ? (totalCanceled / totalSessions) * 100 : 0;
      const lateCancellationRate = totalCanceled ? (lateCancellations / totalCanceled) * 100 : 0;

      // Aggregate by month
      const monthlyMap = new Map<string, MonthlyCancellationData>();
      cancellations.forEach(c => {
        const monthKey = format(startOfMonth(parseISO(c.date)), 'yyyy-MM');
        const monthLabel = format(parseISO(c.date), 'LLLL yyyy', { locale: cs });
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthKey,
            label: monthLabel,
            total: 0,
            late: 0,
            onTime: 0,
            withCredit: 0,
            withoutCredit: 0,
          });
        }
        
        const data = monthlyMap.get(monthKey)!;
        data.total++;
        if (c.isLate) {
          data.late++;
        } else {
          data.onTime++;
        }
        if (c.creditDeducted) {
          data.withCredit++;
        } else {
          data.withoutCredit++;
        }
      });

      const monthlyData = Array.from(monthlyMap.values())
        .sort((a, b) => a.month.localeCompare(b.month));

      // Aggregate by client
      const clientMap = new Map<string, ClientCancellationSummary>();
      cancellations.forEach(c => {
        if (!clientMap.has(c.clientId)) {
          clientMap.set(c.clientId, {
            clientId: c.clientId,
            clientName: c.clientName,
            total: 0,
            late: 0,
            withCredit: 0,
            withoutCredit: 0,
            totalCreditDeducted: 0,
          });
        }
        
        const data = clientMap.get(c.clientId)!;
        data.total++;
        if (c.isLate) data.late++;
        if (c.creditDeducted) {
          data.withCredit++;
          data.totalCreditDeducted += c.creditAmount || 0;
        } else {
          data.withoutCredit++;
        }
      });

      const byClient = Array.from(clientMap.values())
        .sort((a, b) => b.total - a.total);

      return {
        totalCanceled,
        lateCancellations,
        withCreditDeducted,
        withoutCreditDeducted,
        totalCreditAmount,
        cancellationRate,
        lateCancellationRate,
        monthlyData,
        cancellations,
        byClient,
      };
    },
    enabled: !!user?.id,
  });
}
