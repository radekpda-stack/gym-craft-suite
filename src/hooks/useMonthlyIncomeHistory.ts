import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MonthlyIncome {
  year: number;
  month: number; // 1-12
  monthLabel: string; // "Leden", "Únor", ...
  totalIncome: number;
  trainingIncome: number;
  productIncome: number;
  cancellationIncome: number;
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

/**
 * Hook pro načtení historie příjmů z credit_transactions
 * Jediný zdroj pravdy = credit_transactions
 */
export function useMonthlyIncomeHistory() {
  return useQuery({
    queryKey: ["monthly_income_history_v2"],
    queryFn: async () => {
      // Fetch all credit transactions that represent income (training, product, canceled_training)
      const { data: transactions, error } = await supabase
        .from("credit_transactions")
        .select("created_at, amount, type")
        .in("type", ["training", "product", "canceled_training"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        return { years: [], availableYears: [] };
      }

      // Determine available years
      const allDates = transactions.map(t => new Date(t.created_at));
      const minYear = Math.min(...allDates.map(d => d.getFullYear()));
      const maxYear = new Date().getFullYear();
      const availableYears = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).reverse();

      // Group data by year and month
      type MonthData = { 
        trainingIncome: number; 
        productIncome: number; 
        cancellationIncome: number;
        trainingsCount: number; 
        productsCount: number;
      };
      
      const yearlyData: Map<number, Map<number, MonthData>> = new Map();

      // Initialize all months for all years
      availableYears.forEach(year => {
        const monthsMap = new Map<number, MonthData>();
        for (let m = 1; m <= 12; m++) {
          monthsMap.set(m, { 
            trainingIncome: 0, 
            productIncome: 0, 
            cancellationIncome: 0,
            trainingsCount: 0, 
            productsCount: 0 
          });
        }
        yearlyData.set(year, monthsMap);
      });

      // Aggregate transactions by type
      transactions.forEach(tx => {
        if (!tx.created_at || tx.amount === null) return;
        
        const date = new Date(tx.created_at);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const absAmount = Math.abs(tx.amount);

        const yearMap = yearlyData.get(year);
        if (!yearMap) return;
        
        const monthData = yearMap.get(month);
        if (!monthData) return;

        if (tx.type === 'training') {
          monthData.trainingIncome += absAmount;
          monthData.trainingsCount += 1;
        } else if (tx.type === 'product') {
          monthData.productIncome += absAmount;
          monthData.productsCount += 1;
        } else if (tx.type === 'canceled_training') {
          monthData.cancellationIncome += absAmount;
        }
      });

      // Build yearly income data
      const years: YearlyIncomeData[] = availableYears.map(year => {
        const monthsMap = yearlyData.get(year)!;
        const months: MonthlyIncome[] = [];

        for (let m = 1; m <= 12; m++) {
          const data = monthsMap.get(m)!;
          const totalIncome = data.trainingIncome + data.productIncome + data.cancellationIncome;

          // Calculate vs last year
          let vsLastYear: number | null = null;
          const lastYearMap = yearlyData.get(year - 1);
          if (lastYearMap) {
            const lastYearData = lastYearMap.get(m);
            if (lastYearData) {
              const lastYearTotal = lastYearData.trainingIncome + lastYearData.productIncome + lastYearData.cancellationIncome;
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
            cancellationIncome: data.cancellationIncome,
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
