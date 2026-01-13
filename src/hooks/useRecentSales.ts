import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecentSaleItem {
  product_id: string;
  name_snapshot: string;
  unit_price: number;
  quantity: number;
  product_kind: string;
  credit_delta: number;
}

export interface RecentSale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  client_name: string | null;
  client_id: string | null;
  items: RecentSaleItem[];
}

export function useRecentSales(limit = 3) {
  return useQuery({
    queryKey: ['recent_sales', limit],
    staleTime: 1000 * 60 * 1, // 1 minute cache
    queryFn: async () => {
      // Fetch recent completed orders
      const { data: orders, error: ordersError } = await supabase
        .from('sales_orders')
        .select(`
          id,
          total_amount,
          payment_method,
          created_at,
          client_id,
          client:clients(name)
        `)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return [];

      // Fetch items for all orders
      const orderIds = orders.map(o => o.id);
      const { data: items, error: itemsError } = await supabase
        .from('sales_order_items')
        .select('order_id, product_id, name_snapshot, unit_price, quantity, product_kind, credit_delta')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Group items by order
      const itemsByOrder: Record<string, RecentSaleItem[]> = {};
      items?.forEach(item => {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push({
          product_id: item.product_id,
          name_snapshot: item.name_snapshot,
          unit_price: item.unit_price,
          quantity: item.quantity,
          product_kind: item.product_kind,
          credit_delta: item.credit_delta,
        });
      });

      // Map orders with items
      return orders.map(order => ({
        id: order.id,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        created_at: order.created_at,
        client_name: order.client?.name ?? null,
        client_id: order.client_id,
        items: itemsByOrder[order.id] || [],
      })) as RecentSale[];
    },
  });
}
