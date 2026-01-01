import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/contexts/DemoContext";

export interface CareerStats {
  totalTrainings: number;
  totalMinutes: number;
  totalIncome: number;
  activeClients: number;
}

const MILESTONES = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

export function getNextMilestone(current: number): number {
  return MILESTONES.find(m => m > current) || current + 1000;
}

export function useCareerStats() {
  const { isDemo } = useDemoMode();

  return useQuery({
    queryKey: ["career-stats", isDemo],
    queryFn: async (): Promise<CareerStats> => {
      if (isDemo) {
        return {
          totalTrainings: 151,
          totalMinutes: 9060,
          totalIncome: 102400,
          activeClients: 41,
        };
      }

      const [trainingsResult, clientsResult] = await Promise.all([
        supabase
          .from("training_sessions")
          .select("duration, final_price")
          .eq("status", "completed"),
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .eq("is_archived", false)
          .eq("is_system", false),
      ]);

      const trainings = trainingsResult.data || [];
      const totalTrainings = trainings.length;
      const totalMinutes = trainings.reduce((sum, t) => sum + (t.duration || 0), 0);
      const totalIncome = trainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const activeClients = clientsResult.count || 0;

      return {
        totalTrainings,
        totalMinutes,
        totalIncome,
        activeClients,
      };
    },
  });
}
