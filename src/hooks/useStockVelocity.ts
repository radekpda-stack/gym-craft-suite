import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export interface StockVelocityItem {
  productId: string;
  avgDailySales: number;
  daysRemaining: number | null; // null = no sales data
  totalSold30d: number;
}

export function useStockVelocity() {
  return useQuery({
    queryKey: ['stock_velocity'],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data: items, error } = await supabase
        .from('sales_order_items')
        .select('product_id, quantity, sales_orders!inner(created_at, payment_status)')
        .gte('sales_orders.created_at', thirtyDaysAgo)
        .eq('sales_orders.payment_status', 'completed');

      if (error) throw error;

      // Aggregate by product
      const productSales: Record<string, number> = {};
      (items || []).forEach(item => {
        productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity;
      });

      // Get current stock
      const { data: products } = await supabase
        .from('products')
        .select('id, stock_quantity')
        .eq('kind', 'inventory')
        .eq('is_active', true);

      const velocityMap: Record<string, StockVelocityItem> = {};

      (products || []).forEach(product => {
        const totalSold = productSales[product.id] || 0;
        const avgDaily = totalSold / 30;
        const daysRemaining = avgDaily > 0 
          ? Math.round((product.stock_quantity || 0) / avgDaily) 
          : null;

        velocityMap[product.id] = {
          productId: product.id,
          avgDailySales: avgDaily,
          daysRemaining,
          totalSold30d: totalSold,
        };
      });

      return velocityMap;
    },
  });
}
