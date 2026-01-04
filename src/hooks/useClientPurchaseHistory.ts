import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PurchaseHistoryItem {
  id: string;
  date: string;
  totalAmount: number;
  paymentMethod: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export function useClientPurchaseHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-purchase-history', clientId],
    queryFn: async (): Promise<PurchaseHistoryItem[]> => {
      if (!clientId) return [];

      // Fetch sales orders for this client
      const { data: orders, error } = await supabase
        .from('sales_orders')
        .select(`
          id,
          created_at,
          total_amount,
          payment_method,
          sales_order_items!sales_order_items_order_id_fkey (
            id,
            name_snapshot,
            quantity,
            unit_price,
            line_total
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (orders || []).map(order => ({
        id: order.id,
        date: order.created_at,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        items: (order.sales_order_items || []).map((item: any) => ({
          productName: item.name_snapshot,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.line_total,
        })),
      }));
    },
    enabled: !!clientId,
  });
}

export function useClientPurchaseStats(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-purchase-stats', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data: orders, error } = await supabase
        .from('sales_orders')
        .select('total_amount, created_at')
        .eq('client_id', clientId);

      if (error) throw error;

      const totalSpent = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const orderCount = orders?.length || 0;

      // Last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentOrders = (orders || []).filter(
        o => new Date(o.created_at) >= thirtyDaysAgo
      );
      const recentSpent = recentOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      return {
        totalSpent,
        orderCount,
        recentSpent,
        recentOrderCount: recentOrders.length,
      };
    },
    enabled: !!clientId,
  });
}
