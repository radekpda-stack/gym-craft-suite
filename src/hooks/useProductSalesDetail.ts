import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';
import { cs } from 'date-fns/locale';

interface SalesTimePoint {
  label: string;
  month: string;
  revenue: number;
  quantity: number;
  cost: number;
  margin: number;
}

interface TopBuyer {
  clientId: string;
  clientName: string;
  purchaseCount: number;
  totalSpent: number;
}

interface ProductSalesDetail {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalQuantity: number;
  profitMargin: number;
  avgPrice: number;
  lastSaleDate: string | null;
  salesByMonth: SalesTimePoint[];
  topBuyers: TopBuyer[];
}

export function useProductSalesDetail(productId: string | null) {
  return useQuery({
    queryKey: ['product-sales-detail', productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProductSalesDetail> => {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      // Fetch product info
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price, purchase_price, category')
        .eq('id', productId)
        .single();

      const purchasePrice = product?.purchase_price || 0;

      // Fetch all sales for this product from credit_transactions (legacy)
      const { data: legacyTransactions } = await supabase
        .from('credit_transactions')
        .select('id, amount, created_at, client_id, clients(id, name)')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      // Fetch sales_order_items for this product
      const { data: orderItems } = await supabase
        .from('sales_order_items')
        .select(`
          id, 
          quantity, 
          unit_price, 
          line_total, 
          order_id,
          sales_orders(id, created_at, client_id, clients(id, name))
        `)
        .eq('product_id', productId);

      // Combine and aggregate data
      const monthlyData = new Map<string, SalesTimePoint>();
      const buyerData = new Map<string, TopBuyer>();
      
      let totalRevenue = 0;
      let totalQuantity = 0;
      let totalCost = 0;
      let lastSaleDate: string | null = null;

      // Process legacy transactions
      legacyTransactions?.forEach((t: any) => {
        const amount = Math.abs(t.amount || 0);
        const date = new Date(t.created_at);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMM yy', { locale: cs });
        
        totalRevenue += amount;
        totalQuantity += 1;
        totalCost += purchasePrice;

        if (!lastSaleDate || t.created_at > lastSaleDate) {
          lastSaleDate = t.created_at;
        }

        // Monthly aggregation
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            label: monthLabel,
            month: monthKey,
            revenue: 0,
            quantity: 0,
            cost: 0,
            margin: 0,
          });
        }
        const m = monthlyData.get(monthKey)!;
        m.revenue += amount;
        m.quantity += 1;
        m.cost += purchasePrice;

        // Buyer aggregation
        const clientId = t.client_id;
        const clientName = t.clients?.name || 'Neznámý klient';
        if (clientId) {
          if (!buyerData.has(clientId)) {
            buyerData.set(clientId, {
              clientId,
              clientName,
              purchaseCount: 0,
              totalSpent: 0,
            });
          }
          const b = buyerData.get(clientId)!;
          b.purchaseCount += 1;
          b.totalSpent += amount;
        }
      });

      // Process order items
      orderItems?.forEach((item: any) => {
        const order = item.sales_orders;
        if (!order) return;

        const quantity = item.quantity || 1;
        const amount = item.line_total || 0;
        const date = new Date(order.created_at);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMM yy', { locale: cs });
        const itemCost = purchasePrice * quantity;

        totalRevenue += amount;
        totalQuantity += quantity;
        totalCost += itemCost;

        if (!lastSaleDate || order.created_at > lastSaleDate) {
          lastSaleDate = order.created_at;
        }

        // Monthly aggregation
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            label: monthLabel,
            month: monthKey,
            revenue: 0,
            quantity: 0,
            cost: 0,
            margin: 0,
          });
        }
        const m = monthlyData.get(monthKey)!;
        m.revenue += amount;
        m.quantity += quantity;
        m.cost += itemCost;

        // Buyer aggregation
        const clientId = order.client_id;
        const clientName = order.clients?.name || 'Neznámý klient';
        if (clientId) {
          if (!buyerData.has(clientId)) {
            buyerData.set(clientId, {
              clientId,
              clientName,
              purchaseCount: 0,
              totalSpent: 0,
            });
          }
          const b = buyerData.get(clientId)!;
          b.purchaseCount += quantity;
          b.totalSpent += amount;
        }
      });

      // Calculate margin for each month
      monthlyData.forEach((m) => {
        m.margin = m.revenue > 0 ? ((m.revenue - m.cost) / m.revenue) * 100 : 0;
      });

      // Sort monthly data
      const salesByMonth = Array.from(monthlyData.values()).sort((a, b) => 
        a.month.localeCompare(b.month)
      );

      // Sort buyers by purchase count
      const topBuyers = Array.from(buyerData.values())
        .sort((a, b) => b.purchaseCount - a.purchaseCount)
        .slice(0, 5);

      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const avgPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

      return {
        totalRevenue,
        totalCost,
        totalProfit,
        totalQuantity,
        profitMargin,
        avgPrice,
        lastSaleDate,
        salesByMonth,
        topBuyers,
      };
    },
  });
}
