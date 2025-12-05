import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  format, 
  subDays, 
  subMonths, 
  eachDayOfInterval, 
  eachMonthOfInterval,
  eachYearOfInterval,
  startOfMonth,
  endOfMonth,
  startOfYear
} from "date-fns";
import { cs } from "date-fns/locale";
import { IncomePeriod } from "@/components/dashboard/IncomeChart";

interface IncomeDataPoint {
  label: string;
  payments: number;
  products: number;
}

export function useIncomeByPeriod(period: IncomePeriod) {
  return useQuery({
    queryKey: ["income_by_period", period],
    queryFn: async (): Promise<IncomeDataPoint[]> => {
      const now = new Date();
      
      // Fetch all payment transactions
      const { data: transactions, error } = await supabase
        .from("credit_transactions")
        .select("created_at, amount, type")
        .eq("type", "payment")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const paymentTransactions = transactions || [];

      if (period === '30days') {
        const start = subDays(now, 30);
        const days = eachDayOfInterval({ start, end: now });
        
        return days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayPayments = paymentTransactions.filter(t => 
            format(new Date(t.created_at), 'yyyy-MM-dd') === dayStr
          );
          
          return {
            label: format(day, 'd.M.'),
            payments: dayPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
            products: 0,
          };
        });
      }

      if (period === '6months') {
        const start = startOfMonth(subMonths(now, 5));
        const months = eachMonthOfInterval({ start, end: now });
        
        return months.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          
          const monthPayments = paymentTransactions.filter(t => {
            const date = new Date(t.created_at);
            return date >= monthStart && date <= monthEnd;
          });
          
          return {
            label: format(month, 'MMM', { locale: cs }),
            payments: monthPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
            products: 0,
          };
        });
      }

      if (period === '12months') {
        const start = startOfMonth(subMonths(now, 11));
        const months = eachMonthOfInterval({ start, end: now });
        
        return months.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          
          const monthPayments = paymentTransactions.filter(t => {
            const date = new Date(t.created_at);
            return date >= monthStart && date <= monthEnd;
          });
          
          return {
            label: format(month, 'MMM', { locale: cs }),
            payments: monthPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
            products: 0,
          };
        });
      }

      // Lifetime - group by year
      if (paymentTransactions.length === 0) {
        return [];
      }

      const firstDate = new Date(paymentTransactions[0].created_at);
      const startYear = startOfYear(firstDate);
      const years = eachYearOfInterval({ start: startYear, end: now });

      // If only one year, show months instead
      if (years.length <= 1) {
        const months = eachMonthOfInterval({ start: startYear, end: now });
        return months.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          
          const monthPayments = paymentTransactions.filter(t => {
            const date = new Date(t.created_at);
            return date >= monthStart && date <= monthEnd;
          });
          
          return {
            label: format(month, 'MMM yyyy', { locale: cs }),
            payments: monthPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
            products: 0,
          };
        });
      }

      return years.map(year => {
        const yearStart = startOfYear(year);
        const yearEnd = new Date(year.getFullYear(), 11, 31, 23, 59, 59);
        
        const yearPayments = paymentTransactions.filter(t => {
          const date = new Date(t.created_at);
          return date >= yearStart && date <= yearEnd;
        });
        
        return {
          label: format(year, 'yyyy'),
          payments: yearPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
          products: 0,
        };
      });
    },
  });
}
