import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClientTrainingCount {
  client_id: string;
  count: number;
}

export function useClientTrainingCounts() {
  return useQuery({
    queryKey: ["client_training_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("client_id")
        .eq("status", "completed");

      if (error) throw error;

      // Count trainings per client
      const counts: Record<string, number> = {};
      for (const session of data || []) {
        counts[session.client_id] = (counts[session.client_id] || 0) + 1;
      }

      return counts;
    },
  });
}
