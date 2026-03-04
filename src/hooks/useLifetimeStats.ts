import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/contexts/DemoContext";
import { startOfYear } from "date-fns";

export interface YoYComparison {
  thisYear: number;
  lastYear: number;
  percentChange: number;
}

export interface LifetimeStats {
  // Trainings
  totalTrainings: number;
  uniqueClients: number;
  totalMinutes: number;
  totalHours: number;
  trainingDays: number;
  avgTrainingsPerDay: number;
  strengthTrainings: number;
  cardioTrainings: number;
  conditioningTrainings: number;
  otherTrainings: number;
  firstTrainingDate: string | null;
  lastTrainingDate: string | null;
  
  // Finance
  totalIncomeReceived: number;
  totalTrainingValue: number;
  totalProductRevenue: number;
  totalProductsSold: number;
  uniqueProductsSold: number;
  cancellationFees: number;
  avgPricePerTraining: number;
  avgHourlyRate: number;
  totalPayments: number;
  
  // Clients
  totalClientsEver: number;
  activeClients: number;
  archivedClients: number;
  firstClientDate: string | null;

  // Year-over-Year comparisons
  yoyTrainings: YoYComparison;
  yoyIncome: YoYComparison;
  yoyClients: YoYComparison;
  yoyProducts: YoYComparison;
}

function calcYoY(thisYear: number, lastYear: number): YoYComparison {
  return {
    thisYear,
    lastYear,
    percentChange: lastYear > 0 ? Math.round(((thisYear - lastYear) / lastYear) * 100) : (thisYear > 0 ? 100 : 0),
  };
}

const DEMO_STATS: LifetimeStats = {
  totalTrainings: 847,
  uniqueClients: 52,
  totalMinutes: 50820,
  totalHours: 847,
  trainingDays: 312,
  avgTrainingsPerDay: 2.7,
  strengthTrainings: 523,
  cardioTrainings: 156,
  conditioningTrainings: 100,
  otherTrainings: 68,
  firstTrainingDate: "2023-03-15",
  lastTrainingDate: "2026-01-04",
  totalIncomeReceived: 1245600,
  totalTrainingValue: 987400,
  totalProductRevenue: 89500,
  totalProductsSold: 145,
  uniqueProductsSold: 12,
  cancellationFees: 24500,
  avgPricePerTraining: 1166,
  avgHourlyRate: 1165,
  totalPayments: 423,
  totalClientsEver: 68,
  activeClients: 52,
  archivedClients: 16,
  firstClientDate: "2023-03-01",
  yoyTrainings: calcYoY(312, 280),
  yoyIncome: calcYoY(520000, 465000),
  yoyClients: calcYoY(15, 12),
  yoyProducts: calcYoY(62, 48),
};

export function useLifetimeStats() {
  const { isDemo } = useDemoMode();

  return useQuery({
    queryKey: ["lifetime-stats", isDemo],
    staleTime: 1000 * 60 * 30,
    refetchOnMount: false,
    queryFn: async (): Promise<LifetimeStats> => {
      if (isDemo) {
        return DEMO_STATS;
      }

      const now = new Date();
      const thisYearStart = startOfYear(now).toISOString().split('T')[0];
      const lastYearStart = startOfYear(new Date(now.getFullYear() - 1, 0, 1)).toISOString().split('T')[0];
      // Same day last year for fair comparison
      const lastYearSameDay = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];

      const [
        trainingStatsResult,
        trainingTypesResult,
        financeStatsResult,
        productStatsResult,
        clientStatsResult,
        paidTrainingsResult,
      ] = await Promise.all([
        supabase.from("training_sessions").select("client_id, duration, final_price, date").eq("status", "completed"),
        supabase.from("training_sessions").select("id, training_type").eq("status", "completed"),
        supabase.from("credit_transactions").select("type, amount"),
        supabase.from("credit_transactions").select("product_id, amount").eq("type", "product"),
        supabase.from("clients").select("id, is_archived, created_at").eq("is_system", false),
        supabase.from("credit_transactions").select("training_session_id, amount, training_sessions!inner(duration)").eq("type", "training").not("training_session_id", "is", null),
      ]);

      const trainings = trainingStatsResult.data || [];
      const trainingTypes = trainingTypesResult.data || [];
      const transactions = financeStatsResult.data || [];
      const productTransactions = productStatsResult.data || [];
      const clients = clientStatsResult.data || [];
      const paidTrainings = paidTrainingsResult.data || [];

      // === Training stats ===
      const totalTrainings = trainings.length;
      const uniqueClients = new Set(trainings.map(t => t.client_id)).size;
      const totalMinutes = trainings.reduce((sum, t) => sum + (t.duration || 0), 0);
      const totalHours = Math.round(totalMinutes / 60);
      
      const trainingDates = trainings.map(t => t.date).filter(Boolean);
      const uniqueDates = new Set(trainingDates.map(d => d?.split('T')[0]));
      const trainingDays = uniqueDates.size;
      const avgTrainingsPerDay = trainingDays > 0 ? Math.round((totalTrainings / trainingDays) * 10) / 10 : 0;
      
      const sortedDates = [...trainingDates].sort();
      const firstTrainingDate = sortedDates[0] || null;
      const lastTrainingDate = sortedDates[sortedDates.length - 1] || null;

      // Training types
      const typeCounts = trainingTypes.reduce((acc, t) => {
        const type = t.training_type || '';
        if (type === 'strength') acc.strength++;
        else if (['cardio', 'hiit', 'running'].includes(type)) acc.cardio++;
        else if (['conditioning', 'functional', 'mobility'].includes(type)) acc.conditioning++;
        else acc.other++;
        return acc;
      }, { strength: 0, cardio: 0, conditioning: 0, other: 0 });

      // === Finance stats ===
      const totalIncomeReceived = transactions
        .filter(t => ["payment", "manual", "transfer"].includes(t.type) && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalTrainingValue = transactions
        .filter(t => t.type === "training" || t.type === "canceled_training")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const totalProductRevenue = transactions
        .filter(t => t.type === "product")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const cancellationFees = transactions
        .filter(t => t.type === "canceled_training")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const totalPayments = transactions.filter(t => t.type === "payment").length;
      const totalProductsSold = productTransactions.length;
      const uniqueProductsSold = new Set(productTransactions.map(p => p.product_id).filter(Boolean)).size;

      const paidTrainingsCount = new Set(paidTrainings.map((t: any) => t.training_session_id)).size;
      const avgPricePerTraining = paidTrainingsCount > 0 ? Math.round(totalTrainingValue / paidTrainingsCount) : 0;

      const paidSessionMinutes = new Map<string, number>();
      paidTrainings.forEach((t: any) => {
        if (t.training_session_id && t.training_sessions?.duration) {
          paidSessionMinutes.set(t.training_session_id, t.training_sessions.duration);
        }
      });
      const paidHours = Array.from(paidSessionMinutes.values()).reduce((sum, min) => sum + min, 0) / 60;
      const avgHourlyRate = paidHours > 0 ? Math.round(totalTrainingValue / paidHours) : 0;

      // === Client stats ===
      const totalClientsEver = clients.length;
      const activeClients = clients.filter(c => !c.is_archived).length;
      const archivedClients = clients.filter(c => c.is_archived).length;
      const clientDates = clients.map(c => c.created_at).filter(Boolean).sort();
      const firstClientDate = clientDates[0] || null;

      // === Year-over-Year comparisons ===
      const thisYearTrainings = trainings.filter(t => {
        const d = t.date?.split('T')[0];
        return d && d >= thisYearStart && d <= todayStr;
      });
      const lastYearTrainings = trainings.filter(t => {
        const d = t.date?.split('T')[0];
        return d && d >= lastYearStart && d <= lastYearSameDay;
      });

      const thisYearIncome = thisYearTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const lastYearIncome = lastYearTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);

      const thisYearClients = clients.filter(c => c.created_at >= thisYearStart && c.created_at.split('T')[0] <= todayStr).length;
      const lastYearClients = clients.filter(c => c.created_at >= lastYearStart && c.created_at.split('T')[0] <= lastYearSameDay).length;

      const thisYearProducts = productTransactions.filter((t: any) => {
        // product transactions don't have a date field directly, so we approximate
        return true; // We'll use count-based approximation
      }).length;
      // For products we don't have reliable date filtering from credit_transactions in this query,
      // so we skip YoY for products (set to 0)

      return {
        totalTrainings,
        uniqueClients,
        totalMinutes,
        totalHours,
        trainingDays,
        avgTrainingsPerDay,
        strengthTrainings: typeCounts.strength,
        cardioTrainings: typeCounts.cardio,
        conditioningTrainings: typeCounts.conditioning,
        otherTrainings: typeCounts.other,
        firstTrainingDate,
        lastTrainingDate,
        totalIncomeReceived,
        totalTrainingValue,
        totalProductRevenue,
        totalProductsSold,
        uniqueProductsSold,
        cancellationFees,
        avgPricePerTraining,
        avgHourlyRate,
        totalPayments,
        totalClientsEver,
        activeClients,
        archivedClients,
        firstClientDate,
        yoyTrainings: calcYoY(thisYearTrainings.length, lastYearTrainings.length),
        yoyIncome: calcYoY(thisYearIncome, lastYearIncome),
        yoyClients: calcYoY(thisYearClients, lastYearClients),
        yoyProducts: calcYoY(0, 0), // Not enough data for reliable YoY
      };
    },
  });
}
