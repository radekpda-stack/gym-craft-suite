import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths } from 'date-fns';
import { cs } from 'date-fns/locale';
import { SalesPeriod } from '@/components/dashboard/ProductSalesChart';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';

interface SalesTrendPoint {
  label: string;
  revenue: number;
  count: number;
}

interface TopProduct {
  name: string;
  count: number;
  revenue: number;
}

interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
}

export function useProductSalesData(period: SalesPeriod) {
  const { filters } = useDashboardFilters();
  const { accountingMode, clientIds, paymentStatus } = filters;

  return useQuery({
    queryKey: ['product-sales-data', period, accountingMode, clientIds, paymentStatus],
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

      // Fetch product transactions
      // For both CASH and ACCRUAL, product sales use created_at as the date
      // (products are typically sold and paid for at the same time)
      let transactionsQuery = supabase
        .from('credit_transactions')
        .select('amount, payment_method, created_at, product_id, client_id, products(name)')
        .not('product_id', 'is', null)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Apply client filter
      if (clientIds.length > 0) {
        transactionsQuery = transactionsQuery.in('client_id', clientIds);
      }

      // Apply payment status filter
      if (paymentStatus === 'paid') {
        transactionsQuery = transactionsQuery.in('payment_method', ['cash', 'credit', 'card', 'bank', 'paid_cash', 'paid_credit', 'paid_card', 'paid_bank']);
      }

      const { data: transactions } = await transactionsQuery;

      // Group trend data
      const trendMap = new Map<string, { revenue: number; count: number }>();
      const productMap = new Map<string, { count: number; revenue: number }>();
      const paymentMap = new Map<string, { count: number; amount: number }>();

      transactions?.forEach((t: any) => {
        const date = new Date(t.created_at);
        const key =
          groupBy === 'day'
            ? format(date, 'd.M.')
            : format(date, 'MMM', { locale: cs });

        // Trend data
        if (!trendMap.has(key)) {
          trendMap.set(key, { revenue: 0, count: 0 });
        }
        const trend = trendMap.get(key)!;
        trend.revenue += Math.abs(t.amount);
        trend.count += 1;

        // Product data
        const productName = t.products?.name || 'Neznámý produkt';
        if (!productMap.has(productName)) {
          productMap.set(productName, { count: 0, revenue: 0 });
        }
        const product = productMap.get(productName)!;
        product.count += 1;
        product.revenue += Math.abs(t.amount);

        // Payment method data
        const method = t.payment_method || 'cash';
        if (!paymentMap.has(method)) {
          paymentMap.set(method, { count: 0, amount: 0 });
        }
        const payment = paymentMap.get(method)!;
        payment.count += 1;
        payment.amount += Math.abs(t.amount);
      });

      const trendData: SalesTrendPoint[] = [];
      trendMap.forEach((value, key) => {
        trendData.push({ label: key, ...value });
      });

      const topProducts: TopProduct[] = [];
      productMap.forEach((value, name) => {
        topProducts.push({ name, ...value });
      });
      topProducts.sort((a, b) => b.count - a.count);

      const paymentMethods: PaymentMethodBreakdown[] = [];
      paymentMap.forEach((value, method) => {
        paymentMethods.push({ method, ...value });
      });

      return {
        trendData,
        topProducts: topProducts.slice(0, 5),
        paymentMethods,
      };
    },
  });
}