import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, startOfYear, subMonths } from 'date-fns';
import type { ExpenseCategory } from './useBusinessExpenses';

export interface ExpenseStatsByCategory {
  category: ExpenseCategory;
  amount: number;
  count: number;
  percentage: number;
}

export interface MonthlyExpenseTrend {
  month: string;
  label: string;
  amount: number;
}

export interface ExpenseStatsData {
  // Totals
  totalAllTime: number;
  totalThisYear: number;
  totalThisMonth: number;
  totalLastMonth: number;
  
  // Trends
  monthlyChange: number;
  yearlyAverage: number;
  
  // By category
  byCategory: ExpenseStatsByCategory[];
  
  // Monthly trend
  monthlyTrend: MonthlyExpenseTrend[];
  
  // Counts
  expenseCount: number;
  recurringCount: number;
}

export function useExpenseStats() {
  return useQuery({
    queryKey: ['expense-stats'],
    queryFn: async (): Promise<ExpenseStatsData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thisMonthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const lastMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
      const lastMonthEnd = format(startOfMonth(now), 'yyyy-MM-dd');
      const yearStart = format(startOfYear(now), 'yyyy-MM-dd');

      // Fetch all expenses
      const { data: expenses, error } = await supabase
        .from('business_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      if (!expenses) return emptyStats();

      // Calculate totals
      const totalAllTime = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      
      const thisYearExpenses = expenses.filter(e => e.date >= yearStart);
      const totalThisYear = thisYearExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      
      const thisMonthExpenses = expenses.filter(e => e.date >= thisMonthStart);
      const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      
      const lastMonthExpenses = expenses.filter(e => e.date >= lastMonthStart && e.date < lastMonthEnd);
      const totalLastMonth = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      // Monthly change percentage
      const monthlyChange = totalLastMonth > 0 
        ? Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100)
        : totalThisMonth > 0 ? 100 : 0;

      // Calculate by category
      const categoryTotals: Record<string, { amount: number; count: number }> = {};
      expenses.forEach(e => {
        if (!categoryTotals[e.category]) {
          categoryTotals[e.category] = { amount: 0, count: 0 };
        }
        categoryTotals[e.category].amount += Number(e.amount);
        categoryTotals[e.category].count += 1;
      });

      const byCategory: ExpenseStatsByCategory[] = Object.entries(categoryTotals)
        .map(([category, data]) => ({
          category: category as ExpenseCategory,
          amount: data.amount,
          count: data.count,
          percentage: totalAllTime > 0 ? Math.round((data.amount / totalAllTime) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      // Monthly trend (last 12 months)
      const monthlyTotals: Record<string, number> = {};
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthKey = format(monthDate, 'yyyy-MM');
        monthlyTotals[monthKey] = 0;
      }
      
      expenses.forEach(e => {
        const monthKey = e.date.substring(0, 7);
        if (monthlyTotals[monthKey] !== undefined) {
          monthlyTotals[monthKey] += Number(e.amount);
        }
      });

      const monthlyTrend: MonthlyExpenseTrend[] = Object.entries(monthlyTotals)
        .map(([month, amount]) => ({
          month,
          label: format(new Date(month + '-01'), 'MMM yy'),
          amount,
        }));

      // Yearly average (per month)
      const monthsWithData = Object.values(monthlyTotals).filter(v => v > 0).length;
      const yearlyAverage = monthsWithData > 0 ? Math.round(totalThisYear / Math.min(monthsWithData, new Date().getMonth() + 1)) : 0;

      // Counts
      const recurringCount = expenses.filter(e => e.is_recurring).length;

      return {
        totalAllTime,
        totalThisYear,
        totalThisMonth,
        totalLastMonth,
        monthlyChange,
        yearlyAverage,
        byCategory,
        monthlyTrend,
        expenseCount: expenses.length,
        recurringCount,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

function emptyStats(): ExpenseStatsData {
  return {
    totalAllTime: 0,
    totalThisYear: 0,
    totalThisMonth: 0,
    totalLastMonth: 0,
    monthlyChange: 0,
    yearlyAverage: 0,
    byCategory: [],
    monthlyTrend: [],
    expenseCount: 0,
    recurringCount: 0,
  };
}
