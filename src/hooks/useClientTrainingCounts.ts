import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientActivityData {
  count: number;
  lastActivityDate: string | null;
}

export function useClientTrainingCounts() {
  return useQuery({
    queryKey: ["client_training_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("client_id, date, status")
        .eq("status", "completed")
        .order("date", { ascending: false });

      if (error) throw error;

      // Count trainings and get last activity date per client
      const activityData: Record<string, ClientActivityData> = {};
      for (const session of data || []) {
        if (!activityData[session.client_id]) {
          activityData[session.client_id] = {
            count: 0,
            lastActivityDate: session.date, // First one is the most recent due to ordering
          };
        }
        activityData[session.client_id].count += 1;
      }

      return activityData;
    },
  });
}
