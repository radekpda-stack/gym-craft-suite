import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, eachDayOfInterval, eachMonthOfInterval, subDays } from "date-fns";

export interface FinancialStats {
  totalIncome: number;
  incomeThisMonth: number;
  incomeLastMonth: number;
  productIncome: number;
  trainingIncome: number;
  totalCredit: number;
  clientsWithLowCredit: number;
  incomeByDay: { date: string; income: number; payments: number; products: number }[];
  incomeByMonth: { month: string; income: number; payments: number; products: number }[];
  productBreakdown: { name: string; amount: number; count: number }[];
}

export function useFinancialStats() {
  return useQuery({
    queryKey: ["financial_stats"],
    queryFn: async (): Promise<FinancialStats> => {
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      const endOfCurrentMonth = endOfMonth(now);
      const startOfLastMonth = startOfMonth(subMonths(now, 1));
      const endOfLastMonth = endOfMonth(subMonths(now, 1));
      const last30Days = subDays(now, 30);

      // Fetch all transactions
      const { data: transactions, error: transError } = await supabase
        .from("credit_transactions")
        .select("*")
        .order("created_at", { ascending: true });

      if (transError) throw transError;

      // Fetch all clients for credit balance
      const { data: clients, error: clientError } = await supabase
        .from("clients")
        .select("id, name, credit_balance");

      if (clientError) throw clientError;

      // Fetch products for breakdown
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("id, name");

      if (prodError) throw prodError;

      // Calculate totals
      const paymentTransactions = transactions?.filter(t => t.type === 'payment') || [];
      const productTransactions = transactions?.filter(t => t.type === 'product') || [];
      const trainingTransactions = transactions?.filter(t => t.type === 'training') || [];

      const totalIncome = paymentTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const incomeThisMonth = paymentTransactions
        .filter(t => {
          const date = new Date(t.created_at);
          return date >= startOfCurrentMonth && date <= endOfCurrentMonth;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const incomeLastMonth = paymentTransactions
        .filter(t => {
          const date = new Date(t.created_at);
          return date >= startOfLastMonth && date <= endOfLastMonth;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const productIncome = Math.abs(productTransactions.reduce((sum, t) => sum + (t.amount || 0), 0));
      const trainingIncome = Math.abs(trainingTransactions.reduce((sum, t) => sum + (t.amount || 0), 0));

      const totalCredit = clients?.reduce((sum, c) => sum + (c.credit_balance || 0), 0) || 0;
      const clientsWithLowCredit = clients?.filter(c => (c.credit_balance || 0) < 500).length || 0;

      // Income by day (last 30 days)
      const days = eachDayOfInterval({ start: last30Days, end: now });
      const incomeByDay = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayPayments = paymentTransactions.filter(t => 
          format(new Date(t.created_at), 'yyyy-MM-dd') === dayStr
        );
        const dayProducts = productTransactions.filter(t => 
          format(new Date(t.created_at), 'yyyy-MM-dd') === dayStr
        );
        
        return {
          date: format(day, 'd.M.'),
          income: dayPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
          payments: dayPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
          products: Math.abs(dayProducts.reduce((sum, t) => sum + (t.amount || 0), 0)),
        };
      });

      // Income by month (last 6 months)
      const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
      const incomeByMonth = months.map(month => {
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
          month: format(month, 'MMM'),
          income: monthPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
          payments: monthPayments.reduce((sum, t) => sum + (t.amount || 0), 0),
          products: Math.abs(monthProducts.reduce((sum, t) => sum + (t.amount || 0), 0)),
        };
      });

      // Product breakdown
      const productBreakdown = products?.map(product => {
        const productTrans = productTransactions.filter(t => t.product_id === product.id);
        return {
          name: product.name,
          amount: Math.abs(productTrans.reduce((sum, t) => sum + (t.amount || 0), 0)),
          count: productTrans.length,
        };
      }).filter(p => p.count > 0) || [];

      return {
        totalIncome,
        incomeThisMonth,
        incomeLastMonth,
        productIncome,
        trainingIncome,
        totalCredit,
        clientsWithLowCredit,
        incomeByDay,
        incomeByMonth,
        productBreakdown,
      };
    },
  });
}

export function useClientCredits() {
  return useQuery({
    queryKey: ["client_credits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, credit_balance")
        .order("credit_balance", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
