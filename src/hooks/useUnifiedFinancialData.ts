import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths } from 'date-fns';
import { cs } from 'date-fns/locale';
import { FinancialPeriod } from '@/components/dashboard/UnifiedFinancialChart';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';

interface FinancialDataPoint {
  label: string;
  income: number;
  costs: number;
  profit: number;
}

export function useUnifiedFinancialData(period: FinancialPeriod) {
  const { filters } = useDashboardFilters();
  const { accountingMode, clientIds } = filters;

  // Stabilize queryKey
  const clientIdsKey = useMemo(() => clientIds.join(','), [clientIds]);

  return useQuery({
    queryKey: ['unified-financial-data', period, accountingMode, clientIdsKey],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      let groupBy: 'day' | 'month';

      switch (period) {
        case '30days':
          startDate = subDays(now, 30);
          groupBy = 'day';
          break;
        case '3months':
          startDate = subMonths(now, 3);
          groupBy = 'month';
          break;
        case '6months':
          startDate = subMonths(now, 6);
          groupBy = 'month';
          break;
        case '12months':
          startDate = subMonths(now, 12);
          groupBy = 'month';
          break;
        default:
          startDate = subDays(now, 30);
          groupBy = 'day';
      }

      // For ACCRUAL mode: we need to calculate income based on service dates
      // For CASH mode: we calculate based on transaction dates (when payment was received)

      if (accountingMode === 'accrual') {
        // ACCRUAL: Use training session dates for training income, transaction dates for products
        
        // Fetch completed trainings in the period (by service date)
        let trainingsQuery = supabase
          .from('training_sessions')
          .select('id, date, final_price, client_id, payment_status')
          .eq('status', 'completed')
          .gte('date', startDate.toISOString())
          .order('date', { ascending: true });

        if (clientIds.length > 0) {
          trainingsQuery = trainingsQuery.in('client_id', clientIds);
        }

        const { data: trainings } = await trainingsQuery;

        // Fetch product transactions (for products, use transaction date as "service" date)
        let transactionsQuery = supabase
          .from('credit_transactions')
          .select('amount, type, created_at, product_id, client_id, products(purchase_price)')
          .gte('created_at', startDate.toISOString())
          .not('product_id', 'is', null);

        if (clientIds.length > 0) {
          transactionsQuery = transactionsQuery.in('client_id', clientIds);
        }

        const { data: productTransactions } = await transactionsQuery;

        // Group data by period
        const groupedData = new Map<string, { income: number; costs: number }>();

        // Add training income by service date
        trainings?.forEach((t) => {
          const date = new Date(t.date);
          const key = groupBy === 'day'
            ? format(date, 'd.M.')
            : format(date, 'MMM', { locale: cs });

          if (!groupedData.has(key)) {
            groupedData.set(key, { income: 0, costs: 0 });
          }

          const data = groupedData.get(key)!;
          data.income += t.final_price || 0;
        });

        // Add product income and costs
        productTransactions?.forEach((t: any) => {
          const date = new Date(t.created_at);
          const key = groupBy === 'day'
            ? format(date, 'd.M.')
            : format(date, 'MMM', { locale: cs });

          if (!groupedData.has(key)) {
            groupedData.set(key, { income: 0, costs: 0 });
          }

          const data = groupedData.get(key)!;
          if (t.type === 'payment' && t.amount > 0) {
            data.income += t.amount;
          }
          if (t.products?.purchase_price) {
            data.costs += t.products.purchase_price;
          }
        });

        // Convert to array
        const result: FinancialDataPoint[] = [];
        groupedData.forEach((value, key) => {
          result.push({
            label: key,
            income: value.income,
            costs: value.costs,
            profit: value.income - value.costs,
          });
        });

        return result;

      } else {
        // CASH: Use transaction dates (when payment was actually received)
        
        let transactionsQuery = supabase
          .from('credit_transactions')
          .select('amount, type, created_at, product_id, client_id, products(purchase_price)')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (clientIds.length > 0) {
          transactionsQuery = transactionsQuery.in('client_id', clientIds);
        }

        const { data: transactions } = await transactionsQuery;

        // Group data by period
        const groupedData = new Map<string, { income: number; costs: number }>();

        transactions?.forEach((t: any) => {
          const date = new Date(t.created_at);
          const key = groupBy === 'day'
            ? format(date, 'd.M.')
            : format(date, 'MMM', { locale: cs });

          if (!groupedData.has(key)) {
            groupedData.set(key, { income: 0, costs: 0 });
          }

          const data = groupedData.get(key)!;

          // Income from payments (when cash was received)
          if (t.type === 'payment' && t.amount > 0) {
            data.income += t.amount;
          }

          // Costs from product purchases
          if (t.product_id && t.products?.purchase_price) {
            data.costs += t.products.purchase_price;
          }
        });

        // Convert to array
        const result: FinancialDataPoint[] = [];
        groupedData.forEach((value, key) => {
          result.push({
            label: key,
            income: value.income,
            costs: value.costs,
            profit: value.income - value.costs,
          });
        });

        return result;
      }
    },
  });
}