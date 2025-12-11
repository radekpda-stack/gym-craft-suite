import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { cs } from 'date-fns/locale';
import { FinancialPeriod } from '@/components/dashboard/UnifiedFinancialChart';

interface FinancialDataPoint {
  label: string;
  income: number;
  costs: number;
  profit: number;
}

export function useUnifiedFinancialData(period: FinancialPeriod) {
  return useQuery({
    queryKey: ['unified-financial-data', period],
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

      // Fetch credit transactions (income)
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('amount, type, created_at, product_id')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Fetch products for cost calculation
      const { data: products } = await supabase
        .from('products')
        .select('id, purchase_price');

      const productCostMap = new Map(
        products?.map((p) => [p.id, p.purchase_price || 0]) || []
      );

      // Group data by period
      const groupedData = new Map<string, { income: number; costs: number }>();

      transactions?.forEach((t) => {
        const date = new Date(t.created_at);
        const key =
          groupBy === 'day'
            ? format(date, 'd.M.')
            : format(date, 'MMM', { locale: cs });

        if (!groupedData.has(key)) {
          groupedData.set(key, { income: 0, costs: 0 });
        }

        const data = groupedData.get(key)!;

        // Income from payments
        if (t.type === 'payment' && t.amount > 0) {
          data.income += t.amount;
        }

        // Costs from product purchases
        if (t.product_id) {
          const cost = productCostMap.get(t.product_id) || 0;
          data.costs += cost;
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
    },
  });
}
