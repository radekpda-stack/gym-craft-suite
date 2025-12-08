import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  format, 
  subDays, 
  subMonths, 
  eachDayOfInterval, 
  eachMonthOfInterval, 
  startOfMonth, 
  endOfMonth 
} from "date-fns";
import { cs } from "date-fns/locale";
import { ProfitPeriod, ProfitDataPoint } from "@/components/dashboard/ProfitChart";

export function useProfitByPeriod(period: ProfitPeriod) {
  return useQuery({
    queryKey: ["profit_by_period", period],
    queryFn: async (): Promise<ProfitDataPoint[]> => {
      const now = new Date();

      // Fetch product transactions
      const { data: transactions, error: transError } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("type", "product")
        .order("created_at", { ascending: true });

      if (transError) throw transError;

      // Fetch products for purchase prices
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("id, name, price, purchase_price");

      if (prodError) throw prodError;

      // Helper to calculate profit data for a period
      const calculatePeriodData = (
        startDate: Date,
        endDate: Date,
        label: string
      ): ProfitDataPoint => {
        const periodTrans = (transactions || []).filter(t => {
          const date = new Date(t.created_at);
          return date >= startDate && date <= endDate;
        });

        let revenue = 0;
        let costs = 0;

        periodTrans.forEach(t => {
          revenue += Math.abs(t.amount || 0);
          if (t.product_id) {
            const product = products?.find(p => p.id === t.product_id);
            if (product) {
              costs += product.purchase_price || 0;
            }
          }
        });

        return {
          label,
          revenue,
          costs,
          profit: revenue - costs,
        };
      };

      if (period === "30days") {
        const startDate = subDays(now, 30);
        const days = eachDayOfInterval({ start: startDate, end: now });
        
        // Group by week for better visualization
        const weeklyData: ProfitDataPoint[] = [];
        for (let i = 0; i < days.length; i += 7) {
          const weekDays = days.slice(i, Math.min(i + 7, days.length));
          if (weekDays.length === 0) continue;
          
          const weekStart = weekDays[0];
          const weekEnd = weekDays[weekDays.length - 1];
          weekEnd.setHours(23, 59, 59, 999);
          
          const label = format(weekStart, "d.M.", { locale: cs });
          weeklyData.push(calculatePeriodData(weekStart, weekEnd, label));
        }
        return weeklyData;
      }

      if (period === "6months") {
        const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
        return months.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const label = format(month, "MMM", { locale: cs });
          return calculatePeriodData(monthStart, monthEnd, label);
        });
      }

      if (period === "12months") {
        const months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
        return months.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const label = format(month, "MMM", { locale: cs });
          return calculatePeriodData(monthStart, monthEnd, label);
        });
      }

      return [];
    },
  });
}
