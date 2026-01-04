import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, subMonths, format, startOfMonth } from "date-fns";

export type SalesPeriod = '30days' | '6months' | '12months' | 'all';

export interface SalesStats {
  totalRevenue: number;
  totalSales: number;
  byPaymentMethod: {
    cash: number;
    credit: number;
    card: number;
  };
  countByPaymentMethod: {
    cash: number;
    credit: number;
    card: number;
  };
}

export interface SalesTrendData {
  date: string;
  revenue: number;
  count: number;
}

export function useSalesStats() {
  return useQuery({
    queryKey: ["sales_stats"],
    queryFn: async () => {
      const startOfCurrentMonth = startOfMonth(new Date()).toISOString();
      
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("amount, payment_method")
        .eq("type", "product")
        .gte("created_at", startOfCurrentMonth);

      if (error) throw error;

      const stats: SalesStats = {
        totalRevenue: 0,
        totalSales: 0,
        byPaymentMethod: { cash: 0, credit: 0, card: 0 },
        countByPaymentMethod: { cash: 0, credit: 0, card: 0 },
      };

      data?.forEach((sale) => {
        const revenue = Math.abs(sale.amount);
        stats.totalRevenue += revenue;
        stats.totalSales += 1;

        const method = sale.payment_method || 'credit';
        if (method === 'cash') {
          stats.byPaymentMethod.cash += revenue;
          stats.countByPaymentMethod.cash += 1;
        } else if (method === 'card') {
          stats.byPaymentMethod.card += revenue;
          stats.countByPaymentMethod.card += 1;
        } else {
          stats.byPaymentMethod.credit += revenue;
          stats.countByPaymentMethod.credit += 1;
        }
      });

      return stats;
    },
  });
}

export function useSalesTrend(period: SalesPeriod) {
  return useQuery({
    queryKey: ["sales_trend", period],
    queryFn: async () => {
      let startDate: Date | null = null;
      let groupByFormat: string;
      
      switch (period) {
        case '30days':
          startDate = subDays(new Date(), 30);
          groupByFormat = 'yyyy-MM-dd';
          break;
        case '6months':
          startDate = subMonths(new Date(), 6);
          groupByFormat = 'yyyy-MM';
          break;
        case '12months':
          startDate = subMonths(new Date(), 12);
          groupByFormat = 'yyyy-MM';
          break;
        case 'all':
          startDate = null;
          groupByFormat = 'yyyy-MM';
          break;
      }

      let query = supabase
        .from("credit_transactions")
        .select("amount, created_at")
        .eq("type", "product");
      
      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
      
      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) throw error;

      // Group by date/month
      const grouped: Record<string, { revenue: number; count: number }> = {};

      data?.forEach((sale) => {
        const key = format(new Date(sale.created_at), groupByFormat);
        if (!grouped[key]) {
          grouped[key] = { revenue: 0, count: 0 };
        }
        grouped[key].revenue += Math.abs(sale.amount);
        grouped[key].count += 1;
      });

      // Convert to array
      const trendData: SalesTrendData[] = Object.entries(grouped).map(([date, values]) => ({
        date: period === '30days' ? format(new Date(date), 'd.M.') : format(new Date(date + '-01'), 'MMM'),
        revenue: values.revenue,
        count: values.count,
      }));

      return trendData;
    },
  });
}
