import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, startOfMonth, endOfMonth, format, eachMonthOfInterval } from "date-fns";
import { cs } from "date-fns/locale";

export interface MonthlyTrainingData {
  month: string;
  fullMonth: string;
  count: number;
  completed: number;
  canceled: number;
}

export function useTrainingTrend() {
  return useQuery({
    queryKey: ["training-trend"],
    queryFn: async () => {
      const now = new Date();
      const twelveMonthsAgo = subMonths(now, 11);
      const startOfRange = startOfMonth(twelveMonthsAgo);

      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, date, status")
        .gte("date", startOfRange.toISOString())
        .lte("date", now.toISOString());

      if (error) throw error;

      const months = eachMonthOfInterval({ start: startOfRange, end: now });

      return months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthSessions = (data || []).filter((s) => {
          const sessionDate = new Date(s.date);
          return sessionDate >= monthStart && sessionDate <= monthEnd;
        });

        return {
          month: format(month, "LLL", { locale: cs }),
          fullMonth: format(month, "LLLL yyyy", { locale: cs }),
          count: monthSessions.length,
          completed: monthSessions.filter((s) => s.status === "completed").length,
          canceled: monthSessions.filter((s) => s.status === "canceled").length,
        };
      });
    },
    staleTime: 120000,
  });
}
