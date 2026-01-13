import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, eachMonthOfInterval, subDays, startOfYear, endOfYear } from "date-fns";

export interface FinancialStats {
  totalIncome: number;
  incomeThisMonth: number;
  incomeLastMonth: number;
  productIncome: number;
  productCost: number;
  productProfit: number;
  trainingIncome: number;
  totalCredit: number;
  clientsWithLowCredit: number;
  incomeByDay: { date: string; income: number; payments: number; products: number }[];
  incomeByMonth: { month: string; income: number; payments: number; products: number }[];
  productBreakdown: { name: string; amount: number; cost: number; profit: number; count: number }[];
  yearlyIncome: number;
  yearlyExpenses: number;
  yearlyProfit: number;
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
      const yearStart = startOfYear(now);
      const yearEnd = endOfYear(now);

      // Fetch all transactions
      const { data: transactions, error: transError } = await supabase
        .from("credit_transactions")
        .select("*")
        .order("created_at", { ascending: true });

      if (transError) throw transError;

      // Fetch all clients for listing
      const { data: clients, error: clientError } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_archived", false);

      if (clientError) throw clientError;

      // Fetch products for breakdown (including purchase_price)
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("id, name, price, purchase_price");

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

      // Calculate product costs
      let productCost = 0;
      productTransactions.forEach(t => {
        if (t.product_id) {
          const product = products?.find(p => p.id === t.product_id);
          if (product) {
            // Count is typically 1 per transaction, but we can infer from description if needed
            productCost += (product.purchase_price || 0);
          }
        }
      });

      const productProfit = productIncome - productCost;

      // Calculate total credit from payment transactions (ledger-based)
      const totalCredit = paymentTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) - 
                          Math.abs(trainingTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)) -
                          Math.abs(productTransactions.reduce((sum, t) => sum + (t.amount || 0), 0));
      
      // Clients with low credit - count based on ledger balances
      const clientBalances = new Map<string, number>();
      transactions?.forEach(t => {
        if (!t.group_id && t.client_id) {
          clientBalances.set(t.client_id, (clientBalances.get(t.client_id) || 0) + (t.amount || 0));
        }
      });
      const clientsWithLowCredit = Array.from(clientBalances.values()).filter(b => b < 500).length;

      // Yearly calculations
      const yearlyPayments = paymentTransactions.filter(t => {
        const date = new Date(t.created_at);
        return date >= yearStart && date <= yearEnd;
      });
      const yearlyProductTrans = productTransactions.filter(t => {
        const date = new Date(t.created_at);
        return date >= yearStart && date <= yearEnd;
      });

      const yearlyIncome = yearlyPayments.reduce((sum, t) => sum + (t.amount || 0), 0);
      
      // Calculate yearly expenses (product costs)
      let yearlyExpenses = 0;
      yearlyProductTrans.forEach(t => {
        if (t.product_id) {
          const product = products?.find(p => p.id === t.product_id);
          if (product) {
            yearlyExpenses += (product.purchase_price || 0);
          }
        }
      });
      
      const yearlyProfit = yearlyIncome - yearlyExpenses;

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

      // Product breakdown with costs and profits
      const productBreakdown = products?.map(product => {
        const productTrans = productTransactions.filter(t => t.product_id === product.id);
        const salesAmount = Math.abs(productTrans.reduce((sum, t) => sum + (t.amount || 0), 0));
        const costAmount = productTrans.length * (product.purchase_price || 0);
        return {
          name: product.name,
          amount: salesAmount,
          cost: costAmount,
          profit: salesAmount - costAmount,
          count: productTrans.length,
        };
      }).filter(p => p.count > 0) || [];

      return {
        totalIncome,
        incomeThisMonth,
        incomeLastMonth,
        productIncome,
        productCost,
        productProfit,
        trainingIncome,
        totalCredit,
        clientsWithLowCredit,
        incomeByDay,
        incomeByMonth,
        productBreakdown,
        yearlyIncome,
        yearlyExpenses,
        yearlyProfit,
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
