import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PurchaseSuggestion {
  productId: string;
  productName: string;
  purchaseCount: number;
  lastPurchased: string;
}

export function useClientPurchaseSuggestions(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-purchase-suggestions', clientId],
    queryFn: async (): Promise<PurchaseSuggestion[]> => {
      if (!clientId) return [];

      // Get last 3 months of purchases for this client
      const { data: items, error } = await supabase
        .from('sales_order_items')
        .select('product_id, name_snapshot, quantity, created_at, sales_orders!inner(client_id)')
        .eq('sales_orders.client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Aggregate by product
      const freq: Record<string, { name: string; count: number; lastDate: string }> = {};
      (items || []).forEach(item => {
        const key = item.product_id;
        if (!freq[key]) {
          freq[key] = { name: item.name_snapshot, count: 0, lastDate: item.created_at };
        }
        freq[key].count += item.quantity;
        if (item.created_at > freq[key].lastDate) {
          freq[key].lastDate = item.created_at;
        }
      });

      return Object.entries(freq)
        .map(([id, data]) => ({
          productId: id,
          productName: data.name,
          purchaseCount: data.count,
          lastPurchased: data.lastDate,
        }))
        .sort((a, b) => b.purchaseCount - a.purchaseCount)
        .slice(0, 4);
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
  });
}
