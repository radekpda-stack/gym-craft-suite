import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrainingSessionParticipant {
  id: string;
  training_session_id: string;
  client_id: string;
  created_at: string;
}

export function useTrainingSessionParticipants(trainingSessionId?: string) {
  return useQuery({
    queryKey: ["training-session-participants", trainingSessionId],
    queryFn: async () => {
      if (!trainingSessionId) return [];
      
      const { data, error } = await supabase
        .from("training_session_participants")
        .select("*, clients(id, name)")
        .eq("training_session_id", trainingSessionId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!trainingSessionId,
  });
}

export function useAddTrainingSessionParticipants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      trainingSessionId, 
      clientIds 
    }: { 
      trainingSessionId: string; 
      clientIds: string[] 
    }) => {
      if (clientIds.length === 0) return [];

      const inserts = clientIds.map(clientId => ({
        training_session_id: trainingSessionId,
        client_id: clientId,
      }));

      const { data, error } = await supabase
        .from("training_session_participants")
        .insert(inserts)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["training-session-participants", variables.trainingSessionId] 
      });
    },
  });
}

export function useRemoveTrainingSessionParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      trainingSessionId, 
      clientId 
    }: { 
      trainingSessionId: string; 
      clientId: string 
    }) => {
      const { error } = await supabase
        .from("training_session_participants")
        .delete()
        .eq("training_session_id", trainingSessionId)
        .eq("client_id", clientId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["training-session-participants", variables.trainingSessionId] 
      });
    },
  });
}
