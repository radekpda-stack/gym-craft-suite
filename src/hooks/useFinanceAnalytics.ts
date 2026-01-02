import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, format, parseISO, subMonths } from 'date-fns';

export type FinancePeriodType = 'month' | 'year' | '30days' | '90days' | 'custom';
export type FinanceComparisonMode = 'clients' | 'average' | 'history';

interface FinanceAnalyticsParams {
  periodType: FinancePeriodType;
  customDateRange?: { start: Date; end: Date };
  selectedClientIds?: string[];
  comparisonMode: FinanceComparisonMode;
}

export interface FinanceDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface FinanceTrendItem {
  date: string;
  value: number;
  label: string;
}

export interface ClientFinanceData {
  clientId: string;
  clientName: string;
  totalIncome: number;
  trainingIncome: number;
  productIncome: number;
  transactionCount: number;
}

export interface FinanceAnalyticsData {
  totalIncome: number;
  trainingIncome: number;
  productIncome: number;
  otherIncome: number;
  transactionCount: number;
  distribution: FinanceDistributionItem[];
  trend: FinanceTrendItem[];
  clientBreakdown: ClientFinanceData[];
  averagePerClient: number;
  previousPeriod?: {
    totalIncome: number;
    trainingIncome: number;
    productIncome: number;
  };
}

function getDateRange(periodType: FinancePeriodType, customRange?: { start: Date; end: Date }) {
  const now = new Date();
  
  switch (periodType) {
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case '30days':
      return { start: subDays(now, 30), end: now };
    case '90days':
      return { start: subDays(now, 90), end: now };
    case 'custom':
      return customRange || { start: subDays(now, 30), end: now };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function getPreviousPeriodRange(periodType: FinancePeriodType, currentRange: { start: Date; end: Date }) {
  const duration = currentRange.end.getTime() - currentRange.start.getTime();
  const previousEnd = new Date(currentRange.start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  
  return { start: previousStart, end: previousEnd };
}

export function useFinanceAnalytics(params: FinanceAnalyticsParams) {
  const { user } = useAuth();
  const { periodType, customDateRange, selectedClientIds, comparisonMode } = params;

  return useQuery({
    queryKey: ['financeAnalytics', user?.id, periodType, customDateRange, selectedClientIds, comparisonMode],
    queryFn: async (): Promise<FinanceAnalyticsData> => {
      if (!user?.id) throw new Error('User not authenticated');

      const dateRange = getDateRange(periodType, customDateRange);
      const previousRange = getPreviousPeriodRange(periodType, dateRange);

      // Fetch current period transactions
      // Note: training and product transactions have NEGATIVE amounts (credit deduction from client = income for trainer)
      // We need to fetch negative amounts and use absolute values
      let query = supabase
        .from('credit_transactions')
        .select(`
          id,
          amount,
          type,
          client_id,
          product_id,
          training_session_id,
          created_at,
          clients!inner(id, name)
        `)
        .eq('user_id', user.id)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .lt('amount', 0); // Negative amounts = income (credit deducted from client)

      if (selectedClientIds && selectedClientIds.length > 0) {
        query = query.in('client_id', selectedClientIds);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Fetch previous period for comparison
      let previousQuery = supabase
        .from('credit_transactions')
        .select('amount, type, product_id, training_session_id')
        .eq('user_id', user.id)
        .gte('created_at', previousRange.start.toISOString())
        .lte('created_at', previousRange.end.toISOString())
        .lt('amount', 0); // Negative amounts = income

      if (selectedClientIds && selectedClientIds.length > 0) {
        previousQuery = previousQuery.in('client_id', selectedClientIds);
      }

      const { data: previousTransactions } = await previousQuery;

      // Calculate totals
      let totalIncome = 0;
      let trainingIncome = 0;
      let productIncome = 0;
      let otherIncome = 0;

      const clientMap = new Map<string, ClientFinanceData>();
      const trendMap = new Map<string, number>();

      transactions?.forEach(tx => {
        // Use absolute value since amounts are negative (deductions)
        const amount = Math.abs(tx.amount);
        totalIncome += amount;

        // Categorize by type field instead of just foreign keys
        if (tx.type === 'training' || tx.training_session_id) {
          trainingIncome += amount;
        } else if (tx.type === 'product' || tx.product_id) {
          productIncome += amount;
        } else {
          otherIncome += amount;
        }

        // Client breakdown
        const clientId = tx.client_id;
        const clientName = (tx.clients as any)?.name || 'Neznámý';
        
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            clientId,
            clientName,
            totalIncome: 0,
            trainingIncome: 0,
            productIncome: 0,
            transactionCount: 0,
          });
        }

        const clientData = clientMap.get(clientId)!;
        clientData.totalIncome += amount;
        clientData.transactionCount += 1;
        if (tx.type === 'training' || tx.training_session_id) {
          clientData.trainingIncome += amount;
        } else if (tx.type === 'product' || tx.product_id) {
          clientData.productIncome += amount;
        }

        // Trend data
        const dateKey = format(parseISO(tx.created_at), 'yyyy-MM-dd');
        trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + amount);
      });

      // Previous period totals
      let prevTotalIncome = 0;
      let prevTrainingIncome = 0;
      let prevProductIncome = 0;

      previousTransactions?.forEach(tx => {
        const amount = Math.abs(tx.amount);
        prevTotalIncome += amount;
        if (tx.type === 'training' || tx.training_session_id) {
          prevTrainingIncome += amount;
        } else if (tx.type === 'product' || tx.product_id) {
          prevProductIncome += amount;
        }
      });

      // Build distribution
      const distribution: FinanceDistributionItem[] = [
        { name: 'Tréninky', value: trainingIncome, color: 'hsl(var(--chart-1))' },
        { name: 'Produkty', value: productIncome, color: 'hsl(var(--chart-2))' },
        { name: 'Ostatní', value: otherIncome, color: 'hsl(var(--chart-3))' },
      ].filter(item => item.value > 0);

      // Build trend
      const trend: FinanceTrendItem[] = Array.from(trendMap.entries())
        .map(([date, value]) => ({
          date,
          value,
          label: format(parseISO(date), 'd.M.'),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Client breakdown sorted by income
      const clientBreakdown = Array.from(clientMap.values())
        .sort((a, b) => b.totalIncome - a.totalIncome);

      const averagePerClient = clientBreakdown.length > 0 
        ? totalIncome / clientBreakdown.length 
        : 0;

      return {
        totalIncome,
        trainingIncome,
        productIncome,
        otherIncome,
        transactionCount: transactions?.length || 0,
        distribution,
        trend,
        clientBreakdown,
        averagePerClient,
        previousPeriod: {
          totalIncome: prevTotalIncome,
          trainingIncome: prevTrainingIncome,
          productIncome: prevProductIncome,
        },
      };
    },
    enabled: !!user?.id,
  });
}

export function useFinanceSavedViews() {
  const { user } = useAuth();

  const { data: views, isLoading, refetch } = useQuery({
    queryKey: ['financeSavedViews', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('analytics_saved_views')
        .select('*')
        .eq('user_id', user.id)
        .eq('view_type', 'finance')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const saveView = async (name: string, filters: any, description?: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('analytics_saved_views')
      .insert({
        user_id: user.id,
        name,
        description,
        filters,
        view_type: 'finance',
      });

    if (error) throw error;
    refetch();
  };

  const deleteView = async (id: string) => {
    const { error } = await supabase
      .from('analytics_saved_views')
      .delete()
      .eq('id', id);

    if (error) throw error;
    refetch();
  };

  return { views, isLoading, saveView, deleteView, refetch };
}
