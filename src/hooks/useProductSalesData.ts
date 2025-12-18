import { useMemo } from 'react';
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
  id: string;
  name: string;
  count: number;
  revenue: number;
  cost: number;
  margin: number;
}

interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
}

interface ProductSalesResult {
  trendData: SalesTrendPoint[];
  topProducts: TopProduct[];
  allProducts: TopProduct[];
  paymentMethods: PaymentMethodBreakdown[];
  totalMargin: number;
  totalRevenue: number;
  totalCost: number;
  marginPercent: number;
}

export function useProductSalesData(period: SalesPeriod) {
  const { filters } = useDashboardFilters();
  const { accountingMode, clientIds, paymentStatus } = filters;
  
  // Stabilize queryKey
  const clientIdsKey = useMemo(() => clientIds.join(','), [clientIds]);

  return useQuery({
    queryKey: ['product-sales-data', period, accountingMode, clientIdsKey, paymentStatus],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date | null = null;
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
        case 'all':
          startDate = null; // No date filter - fetch all
          groupBy = 'month';
          break;
        default:
          startDate = subDays(now, 30);
          groupBy = 'day';
      }

      // Fetch product transactions with product details including purchase_price
      let transactionsQuery = supabase
        .from('credit_transactions')
        .select('amount, payment_method, created_at, product_id, client_id, products(id, name, purchase_price, price)')
        .not('product_id', 'is', null)
        .order('created_at', { ascending: true });

      // Apply date filter only if not 'all'
      if (startDate) {
        transactionsQuery = transactionsQuery.gte('created_at', startDate.toISOString());
      }

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
      const productMap = new Map<string, { id: string; count: number; revenue: number; cost: number }>();
      const paymentMap = new Map<string, { count: number; amount: number }>();

      let totalCost = 0;
      let totalRevenue = 0;

      transactions?.forEach((t: any) => {
        const date = new Date(t.created_at);
        const key =
          groupBy === 'day'
            ? format(date, 'd.M.')
            : format(date, 'MMM', { locale: cs });

        const saleAmount = Math.abs(t.amount);
        const purchasePrice = t.products?.purchase_price || 0;

        // Trend data
        if (!trendMap.has(key)) {
          trendMap.set(key, { revenue: 0, count: 0 });
        }
        const trend = trendMap.get(key)!;
        trend.revenue += saleAmount;
        trend.count += 1;

        // Product data with cost
        const productId = t.products?.id || t.product_id;
        const productName = t.products?.name || 'Neznámý produkt';
        if (!productMap.has(productId)) {
          productMap.set(productId, { id: productId, count: 0, revenue: 0, cost: 0 });
        }
        const product = productMap.get(productId)!;
        product.count += 1;
        product.revenue += saleAmount;
        product.cost += purchasePrice;

        totalRevenue += saleAmount;
        totalCost += purchasePrice;

        // Payment method data
        const method = t.payment_method || 'cash';
        if (!paymentMap.has(method)) {
          paymentMap.set(method, { count: 0, amount: 0 });
        }
        const payment = paymentMap.get(method)!;
        payment.count += 1;
        payment.amount += saleAmount;
      });

      const trendData: SalesTrendPoint[] = [];
      trendMap.forEach((value, key) => {
        trendData.push({ label: key, ...value });
      });

      // Fetch product names for productMap
      const productIds = Array.from(productMap.keys());
      let productsInfo: Record<string, string> = {};
      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds);
        
        productsData?.forEach((p: any) => {
          productsInfo[p.id] = p.name;
        });
      }

      const allProducts: TopProduct[] = [];
      productMap.forEach((value, id) => {
        const margin = value.revenue - value.cost;
        allProducts.push({
          id,
          name: productsInfo[id] || 'Neznámý produkt',
          count: value.count,
          revenue: value.revenue,
          cost: value.cost,
          margin,
        });
      });
      allProducts.sort((a, b) => b.count - a.count);

      const paymentMethods: PaymentMethodBreakdown[] = [];
      paymentMap.forEach((value, method) => {
        paymentMethods.push({ method, ...value });
      });

      const totalMargin = totalRevenue - totalCost;
      const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

      return {
        trendData,
        topProducts: allProducts.slice(0, 5),
        allProducts,
        paymentMethods,
        totalMargin,
        totalRevenue,
        totalCost,
        marginPercent,
      } as ProductSalesResult;
    },
  });
}