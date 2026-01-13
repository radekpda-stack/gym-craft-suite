import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, subYears } from "date-fns";
import { cs } from "date-fns/locale";

export interface MonthlyIncome {
  year: number;
  month: number; // 1-12
  monthLabel: string; // "Leden", "Únor", ...
  totalIncome: number;
  trainingIncome: number;
  productIncome: number;
  trainingsCount: number;
  productsCount: number;
  vsLastYear: number | null; // procentuální změna
}

export interface YearlyIncomeData {
  year: number;
  months: MonthlyIncome[];
  totalYearIncome: number;
  bestMonth: MonthlyIncome | null;
  worstMonth: MonthlyIncome | null;
  averageMonthly: number;
}

const MONTH_NAMES_CS = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
];

export function useMonthlyIncomeHistory() {
  return useQuery({
    queryKey: ["monthly_income_history"],
    queryFn: async () => {
      // Fetch all completed training sessions with payment
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("date, final_price, participant_count")
        .eq("status", "completed")
        .not("final_price", "is", null)
        .order("date", { ascending: true });

      if (sessionsError) throw sessionsError;

      // Fetch all payment credit transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from("credit_transactions")
        .select("created_at, amount, type")
        .eq("type", "payment")
        .order("created_at", { ascending: true });

      if (transactionsError) throw transactionsError;

      // Determine available years
      const allDates: Date[] = [];
      sessions?.forEach(s => s.date && allDates.push(new Date(s.date)));
      transactions?.forEach(t => t.created_at && allDates.push(new Date(t.created_at)));

      if (allDates.length === 0) {
        return { years: [], availableYears: [] };
      }

      const minYear = Math.min(...allDates.map(d => d.getFullYear()));
      const maxYear = new Date().getFullYear();
      const availableYears = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).reverse();

      // Group data by year and month
      const yearlyData: Map<number, Map<number, { trainingIncome: number; productIncome: number; trainingsCount: number; productsCount: number }>> = new Map();

      // Initialize all months for all years
      availableYears.forEach(year => {
        const monthsMap = new Map<number, { trainingIncome: number; productIncome: number; trainingsCount: number; productsCount: number }>();
        for (let m = 1; m <= 12; m++) {
          monthsMap.set(m, { trainingIncome: 0, productIncome: 0, trainingsCount: 0, productsCount: 0 });
        }
        yearlyData.set(year, monthsMap);
      });

      // Aggregate training sessions
      sessions?.forEach(session => {
        if (!session.date || !session.final_price) return;
        const date = new Date(session.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const yearMap = yearlyData.get(year);
        if (yearMap) {
          const monthData = yearMap.get(month);
          if (monthData) {
            monthData.trainingIncome += session.final_price;
            monthData.trainingsCount += 1;
          }
        }
      });

      // Aggregate product transactions (payments)
      transactions?.forEach(tx => {
        if (!tx.created_at || !tx.amount) return;
        const date = new Date(tx.created_at);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const yearMap = yearlyData.get(year);
        if (yearMap) {
          const monthData = yearMap.get(month);
          if (monthData) {
            monthData.productIncome += tx.amount;
            monthData.productsCount += 1;
          }
        }
      });

      // Build yearly income data
      const years: YearlyIncomeData[] = availableYears.map(year => {
        const monthsMap = yearlyData.get(year)!;
        const months: MonthlyIncome[] = [];

        for (let m = 1; m <= 12; m++) {
          const data = monthsMap.get(m)!;
          const totalIncome = data.trainingIncome + data.productIncome;

          // Calculate vs last year
          let vsLastYear: number | null = null;
          const lastYearMap = yearlyData.get(year - 1);
          if (lastYearMap) {
            const lastYearData = lastYearMap.get(m);
            if (lastYearData) {
              const lastYearTotal = lastYearData.trainingIncome + lastYearData.productIncome;
              if (lastYearTotal > 0) {
                vsLastYear = ((totalIncome - lastYearTotal) / lastYearTotal) * 100;
              } else if (totalIncome > 0) {
                vsLastYear = 100; // New income this year
              }
            }
          }

          months.push({
            year,
            month: m,
            monthLabel: MONTH_NAMES_CS[m - 1],
            totalIncome,
            trainingIncome: data.trainingIncome,
            productIncome: data.productIncome,
            trainingsCount: data.trainingsCount,
            productsCount: data.productsCount,
            vsLastYear,
          });
        }

        const totalYearIncome = months.reduce((sum, m) => sum + m.totalIncome, 0);
        const monthsWithIncome = months.filter(m => m.totalIncome > 0);
        const averageMonthly = monthsWithIncome.length > 0 
          ? totalYearIncome / monthsWithIncome.length 
          : 0;

        const bestMonth = monthsWithIncome.length > 0
          ? monthsWithIncome.reduce((best, m) => m.totalIncome > best.totalIncome ? m : best)
          : null;

        const worstMonth = monthsWithIncome.length > 0
          ? monthsWithIncome.reduce((worst, m) => m.totalIncome < worst.totalIncome ? m : worst)
          : null;

        return {
          year,
          months,
          totalYearIncome,
          bestMonth,
          worstMonth,
          averageMonthly,
        };
      });

      return { years, availableYears };
    },
  });
}
