import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subYears } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ProductMonthlyData {
  month: string;
  revenue: number;
  cost: number;
  margin: number;
  count: number;
}

interface ProductDetailResult {
  productName: string;
  // All-time stats
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  totalCount: number;
  marginPercent: number;
  avgSalePrice: number;
  // Year stats
  yearRevenue: number;
  yearCost: number;
  yearMargin: number;
  yearCount: number;
  // Monthly data for chart (last 12 months)
  monthlyData: ProductMonthlyData[];
  // First and last sale dates
  firstSaleDate: string | null;
  lastSaleDate: string | null;
}

export function useProductDetailData(productId: string | null) {
  return useQuery({
    queryKey: ['product-detail-data', productId],
    queryFn: async (): Promise<ProductDetailResult | null> => {
      if (!productId) return null;

      const now = new Date();
      const yearStart = subYears(now, 1);
      
      // Fetch product info
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price, purchase_price')
        .eq('id', productId)
        .single();

      if (!product) return null;

      // Fetch ALL transactions for this product
      const { data: allTransactions } = await supabase
        .from('credit_transactions')
        .select('amount, created_at, products(purchase_price)')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (!allTransactions || allTransactions.length === 0) {
        return {
          productName: product.name,
          totalRevenue: 0,
          totalCost: 0,
          totalMargin: 0,
          totalCount: 0,
          marginPercent: 0,
          avgSalePrice: product.price || 0,
          yearRevenue: 0,
          yearCost: 0,
          yearMargin: 0,
          yearCount: 0,
          monthlyData: [],
          firstSaleDate: null,
          lastSaleDate: null,
        };
      }

      // Calculate all-time stats
      let totalRevenue = 0;
      let totalCost = 0;
      let yearRevenue = 0;
      let yearCost = 0;
      let yearCount = 0;

      // Group by month for chart
      const monthlyMap = new Map<string, { revenue: number; cost: number; count: number }>();
      
      // Initialize all months in the last 12 months
      const monthsInterval = eachMonthOfInterval({
        start: startOfMonth(yearStart),
        end: endOfMonth(now),
      });
      
      monthsInterval.forEach(month => {
        const key = format(month, 'yyyy-MM');
        monthlyMap.set(key, { revenue: 0, cost: 0, count: 0 });
      });

      allTransactions.forEach((t: any) => {
        const saleAmount = Math.abs(t.amount);
        const purchasePrice = t.products?.purchase_price || product.purchase_price || 0;
        const transactionDate = new Date(t.created_at);

        totalRevenue += saleAmount;
        totalCost += purchasePrice;

        // Check if within last year
        if (transactionDate >= yearStart) {
          yearRevenue += saleAmount;
          yearCost += purchasePrice;
          yearCount += 1;

          // Add to monthly data
          const monthKey = format(transactionDate, 'yyyy-MM');
          if (monthlyMap.has(monthKey)) {
            const monthData = monthlyMap.get(monthKey)!;
            monthData.revenue += saleAmount;
            monthData.cost += purchasePrice;
            monthData.count += 1;
          }
        }
      });

      const totalCount = allTransactions.length;
      const totalMargin = totalRevenue - totalCost;
      const yearMargin = yearRevenue - yearCost;
      const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
      const avgSalePrice = totalCount > 0 ? totalRevenue / totalCount : (product.price || 0);

      // Convert monthly map to array
      const monthlyData: ProductMonthlyData[] = [];
      monthlyMap.forEach((value, key) => {
        monthlyData.push({
          month: format(new Date(key + '-01'), 'MMM yy', { locale: cs }),
          revenue: value.revenue,
          cost: value.cost,
          margin: value.revenue - value.cost,
          count: value.count,
        });
      });

      return {
        productName: product.name,
        totalRevenue,
        totalCost,
        totalMargin,
        totalCount,
        marginPercent,
        avgSalePrice,
        yearRevenue,
        yearCost,
        yearMargin,
        yearCount,
        monthlyData,
        firstSaleDate: allTransactions[0]?.created_at || null,
        lastSaleDate: allTransactions[allTransactions.length - 1]?.created_at || null,
      };
    },
    enabled: !!productId,
  });
}
