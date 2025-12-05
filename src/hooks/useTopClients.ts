import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TopClient {
  id: string;
  name: string;
  trainingCount: number;
  lastTraining: string | null;
}

export function useTopClients(limit: number = 5) {
  return useQuery({
    queryKey: ["top-clients", limit],
    queryFn: async () => {
      // Get all training sessions with client info
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("client_id, date, status")
        .neq("status", "canceled");

      if (sessionsError) throw sessionsError;

      // Get all clients
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, name");

      if (clientsError) throw clientsError;

      // Aggregate sessions by client
      const clientStats = new Map<string, { count: number; lastDate: string | null }>();

      (sessions || []).forEach((session) => {
        const existing = clientStats.get(session.client_id) || { count: 0, lastDate: null };
        existing.count++;
        if (!existing.lastDate || session.date > existing.lastDate) {
          existing.lastDate = session.date;
        }
        clientStats.set(session.client_id, existing);
      });

      // Map to TopClient format and sort
      const topClients: TopClient[] = (clients || [])
        .map((client) => {
          const stats = clientStats.get(client.id) || { count: 0, lastDate: null };
          return {
            id: client.id,
            name: client.name,
            trainingCount: stats.count,
            lastTraining: stats.lastDate,
          };
        })
        .filter((c) => c.trainingCount > 0)
        .sort((a, b) => b.trainingCount - a.trainingCount)
        .slice(0, limit);

      return topClients;
    },
  });
}
