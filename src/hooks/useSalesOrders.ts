import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { refundSale, showRefundResultToast } from '@/services/saleProcessor';

// Types
export type PaymentMethod = 'cash' | 'card' | 'bank' | 'credit';
export type PaymentStatus = 'pending' | 'completed' | 'refunded' | 'void';

export interface SalesOrder {
  id: string;
  user_id: string;
  client_id: string | null;
  group_id: string | null;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  idempotency_key: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  client?: { id: string; name: string } | null;
  items?: SalesOrderItem[];
}

export interface SalesOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name_snapshot: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  product_kind: string;
  credit_delta: number;
  created_at: string;
}

export interface SalesStatsResult {
  totalRevenue: number;
  totalOrders: number;
  byPaymentMethod: Record<PaymentMethod, { count: number; revenue: number }>;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

// Fetch sales orders
export function useSalesOrders(options?: { 
  limit?: number; 
  status?: PaymentStatus;
  from?: Date;
  to?: Date;
}) {
  const { limit = 50, status, from, to } = options || {};

  return useQuery({
    queryKey: ['sales_orders', { limit, status, from: from?.toISOString(), to: to?.toISOString() }],
    queryFn: async () => {
      let query = supabase
        .from('sales_orders')
        .select(`
          *,
          client:clients(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('payment_status', status);
      }

      if (from) {
        query = query.gte('created_at', from.toISOString());
      }

      if (to) {
        query = query.lte('created_at', to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesOrder[];
    },
  });
}

// Fetch single order with items
export function useSalesOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['sales_order', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const [orderResult, itemsResult] = await Promise.all([
        supabase
          .from('sales_orders')
          .select(`*, client:clients(id, name)`)
          .eq('id', orderId)
          .single(),
        supabase
          .from('sales_order_items')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at'),
      ]);

      if (orderResult.error) throw orderResult.error;
      if (itemsResult.error) throw itemsResult.error;

      return {
        ...orderResult.data,
        items: itemsResult.data,
      } as SalesOrder;
    },
    enabled: !!orderId,
  });
}

// Fetch sales statistics
export function useSalesStats(period: 'today' | 'week' | 'month' | 'year' = 'month') {
  return useQuery({
    queryKey: ['sales_stats', period],
    queryFn: async () => {
      const now = new Date();
      let fromDate: Date;

      switch (period) {
        case 'today':
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          fromDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('sales_orders')
        .select('id, total_amount, payment_method, payment_status')
        .gte('created_at', fromDate.toISOString())
        .eq('payment_status', 'completed');

      if (ordersError) throw ordersError;

      // Fetch items for top products
      const orderIds = orders?.map(o => o.id) || [];
      let items: SalesOrderItem[] = [];
      
      if (orderIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('sales_order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;
        items = itemsData || [];
      }

      // Calculate stats
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const totalOrders = orders?.length || 0;

      // By payment method
      const byPaymentMethod: Record<PaymentMethod, { count: number; revenue: number }> = {
        cash: { count: 0, revenue: 0 },
        card: { count: 0, revenue: 0 },
        bank: { count: 0, revenue: 0 },
        credit: { count: 0, revenue: 0 },
      };

      orders?.forEach(order => {
        const method = order.payment_method as PaymentMethod;
        if (byPaymentMethod[method]) {
          byPaymentMethod[method].count++;
          byPaymentMethod[method].revenue += order.total_amount || 0;
        }
      });

      // Top products
      const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
      items.forEach(item => {
        if (!productStats[item.product_id]) {
          productStats[item.product_id] = {
            name: item.name_snapshot,
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[item.product_id].quantity += item.quantity;
        productStats[item.product_id].revenue += item.line_total;
      });

      const topProducts = Object.entries(productStats)
        .map(([productId, stats]) => ({ productId, ...stats }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      return {
        totalRevenue,
        totalOrders,
        byPaymentMethod,
        topProducts,
      } as SalesStatsResult;
    },
  });
}

// Fetch sales trend data
export function useSalesTrend(period: 'week' | 'month' | 'year' = 'month') {
  return useQuery({
    queryKey: ['sales_trend', period],
    queryFn: async () => {
      const now = new Date();
      let fromDate: Date;

      switch (period) {
        case 'week':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          fromDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const { data, error } = await supabase
        .from('sales_orders')
        .select('id, total_amount, created_at')
        .gte('created_at', fromDate.toISOString())
        .eq('payment_status', 'completed')
        .order('created_at');

      if (error) throw error;

      // Group by day/month depending on period
      const grouped: Record<string, { date: string; revenue: number; count: number }> = {};

      data?.forEach(order => {
        const date = new Date(order.created_at);
        const key = period === 'year'
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          : date.toISOString().split('T')[0];

        if (!grouped[key]) {
          grouped[key] = { date: key, revenue: 0, count: 0 };
        }
        grouped[key].revenue += order.total_amount || 0;
        grouped[key].count++;
      });

      return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    },
  });
}

// Refund mutation
export function useRefundSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const result = await refundSale(orderId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: (result) => {
      showRefundResultToast(result);
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales_stats'] });
      queryClient.invalidateQueries({ queryKey: ['sales_trend'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      showRefundResultToast({ success: false, error: error.message });
    },
  });
}
