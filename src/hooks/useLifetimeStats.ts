import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/contexts/DemoContext";

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
};

export function useLifetimeStats() {
  const { isDemo } = useDemoMode();

  return useQuery({
    queryKey: ["lifetime-stats", isDemo],
    staleTime: 1000 * 60 * 5, // 5 minutes - this data doesn't change often
    queryFn: async (): Promise<LifetimeStats> => {
      if (isDemo) {
        return DEMO_STATS;
      }

      // Fetch all data in parallel with specific columns
      const [
        trainingStatsResult,
        trainingTypesResult,
        financeStatsResult,
        productStatsResult,
        clientStatsResult,
        paidTrainingsResult,
      ] = await Promise.all([
        // Training stats - only needed columns
        supabase
          .from("training_sessions")
          .select("client_id, duration, final_price, date")
          .eq("status", "completed"),
        
        // Training types breakdown - only needed columns
        supabase
          .from("training_sessions")
          .select("id, training_type")
          .eq("status", "completed"),
        
        // Finance stats - only needed columns
        supabase
          .from("credit_transactions")
          .select("type, amount"),
        
        // Product stats - only needed columns
        supabase
          .from("credit_transactions")
          .select("product_id, amount")
          .eq("type", "product"),
        
        // Client stats - only needed columns
        supabase
          .from("clients")
          .select("id, is_archived, created_at")
          .eq("is_system", false),
        
        // Paid trainings - for accurate hourly rate calculation
        // Only count trainings that have a transaction (actual revenue)
        supabase
          .from("credit_transactions")
          .select("training_session_id, amount, training_sessions!inner(duration)")
          .eq("type", "training")
          .not("training_session_id", "is", null),
      ]);

      const trainings = trainingStatsResult.data || [];
      const trainingTypes = trainingTypesResult.data || [];
      const transactions = financeStatsResult.data || [];
      const productTransactions = productStatsResult.data || [];
      const clients = clientStatsResult.data || [];
      const paidTrainings = paidTrainingsResult.data || [];

      // Calculate training stats
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

      // Training types - single pass through data using reduce
      const typeCounts = trainingTypes.reduce((acc, t) => {
        const type = t.training_type || '';
        if (type === 'strength') {
          acc.strength++;
        } else if (['cardio', 'hiit', 'running'].includes(type)) {
          acc.cardio++;
        } else if (['conditioning', 'functional', 'mobility'].includes(type)) {
          acc.conditioning++;
        } else {
          acc.other++;
        }
        return acc;
      }, { strength: 0, cardio: 0, conditioning: 0, other: 0 });

      const strengthTrainings = typeCounts.strength;
      const cardioTrainings = typeCounts.cardio;
      const conditioningTrainings = typeCounts.conditioning;
      const otherTrainings = typeCounts.other;

      // Finance stats
      // Income received = payments (positive amounts) + manual additions (positive)
      const totalIncomeReceived = transactions
        .filter(t => ["payment", "manual", "transfer"].includes(t.type) && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Training value = what was charged for trainings (including canceled training fees)
      const totalTrainingValue = transactions
        .filter(t => t.type === "training" || t.type === "canceled_training")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const totalProductRevenue = transactions
        .filter(t => t.type === "product")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      // Cancellation fees are part of training value but also tracked separately
      const cancellationFees = transactions
        .filter(t => t.type === "canceled_training")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const totalPayments = transactions.filter(t => t.type === "payment").length;

      // Product stats
      const totalProductsSold = productTransactions.length;
      const uniqueProductsSold = new Set(productTransactions.map(p => p.product_id).filter(Boolean)).size;

      // Average price per training (only trainings with transactions)
      const paidTrainingsCount = new Set(paidTrainings.map((t: any) => t.training_session_id)).size;
      const avgPricePerTraining = paidTrainingsCount > 0 
        ? Math.round(totalTrainingValue / paidTrainingsCount) 
        : 0;

      // Average hourly rate - use only paid trainings for accurate calculation
      // Group by session to avoid counting same session multiple times (group trainings)
      const paidSessionMinutes = new Map<string, number>();
      paidTrainings.forEach((t: any) => {
        if (t.training_session_id && t.training_sessions?.duration) {
          paidSessionMinutes.set(t.training_session_id, t.training_sessions.duration);
        }
      });
      const paidMinutesTotal = Array.from(paidSessionMinutes.values()).reduce((sum, min) => sum + min, 0);
      const paidHours = paidMinutesTotal / 60;
      
      const avgHourlyRate = paidHours > 0
        ? Math.round(totalTrainingValue / paidHours)
        : 0;

      // Client stats
      const totalClientsEver = clients.length;
      const activeClients = clients.filter(c => !c.is_archived).length;
      const archivedClients = clients.filter(c => c.is_archived).length;
      
      const clientDates = clients.map(c => c.created_at).filter(Boolean).sort();
      const firstClientDate = clientDates[0] || null;

      return {
        totalTrainings,
        uniqueClients,
        totalMinutes,
        totalHours,
        trainingDays,
        avgTrainingsPerDay,
        strengthTrainings,
        cardioTrainings,
        conditioningTrainings,
        otherTrainings,
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
      };
    },
  });
}
