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
      
      // Fetch payment and product transactions
       const { data: transactions, error } = await supabase
         .from("credit_transactions")
         .select("created_at, amount, type")
         .in("type", ["payment", "product"])
         .order("created_at", { ascending: true });

       if (error) throw error;

       const paymentTransactions = (transactions || []).filter(t => t.type === 'payment');
       const productTransactions = (transactions || []).filter(t => t.type === 'product');

      if (period === '30days') {
        const start = subDays(now, 30);
        const days = eachDayOfInterval({ start, end: now });
        
        return days.map(day => {
           const dayStr = format(day, 'yyyy-MM-dd');
           const dayPayments = paymentTransactions.filter(t => 
             format(new Date(t.created_at), 'yyyy-MM-dd') === dayStr
           );
           const dayProducts = productTransactions.filter(t => 
             format(new Date(t.created_at), 'yyyy-MM-dd') === dayStr
           );
           
           return {
             label: format(day, 'd.M.'),
             payments: dayPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
             products: Math.abs(dayProducts.reduce((sum, t) => sum + (t.amount || 0), 0)),
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
           const monthProducts = productTransactions.filter(t => {
             const date = new Date(t.created_at);
             return date >= monthStart && date <= monthEnd;
           });
           
           return {
             label: format(month, 'MMM', { locale: cs }),
             payments: monthPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
             products: Math.abs(monthProducts.reduce((sum, t) => sum + (t.amount || 0), 0)),
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
           const monthProducts = productTransactions.filter(t => {
             const date = new Date(t.created_at);
             return date >= monthStart && date <= monthEnd;
           });
           
           return {
             label: format(month, 'MMM', { locale: cs }),
             payments: monthPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
             products: Math.abs(monthProducts.reduce((sum, t) => sum + (t.amount || 0), 0)),
           };
         });
      }

      // Lifetime - group by year
       const allTransactions = [...paymentTransactions, ...productTransactions];
       if (allTransactions.length === 0) {
         return [];
       }

       // Sort by date to find first
       allTransactions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
       const firstDate = new Date(allTransactions[0].created_at);
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
           const monthProducts = productTransactions.filter(t => {
             const date = new Date(t.created_at);
             return date >= monthStart && date <= monthEnd;
           });
           
           return {
             label: format(month, 'MMM yyyy', { locale: cs }),
             payments: monthPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
             products: Math.abs(monthProducts.reduce((sum, t) => sum + (t.amount || 0), 0)),
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
         const yearProducts = productTransactions.filter(t => {
           const date = new Date(t.created_at);
           return date >= yearStart && date <= yearEnd;
         });
         
         return {
           label: format(year, 'yyyy'),
           payments: yearPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
           products: Math.abs(yearProducts.reduce((sum, t) => sum + (t.amount || 0), 0)),
         };
       });
     },
   });
 }
