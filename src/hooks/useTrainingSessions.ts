import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type TrainingStatus = 'scheduled' | 'completed' | 'canceled';

export interface TrainingSession {
  id: string;
  client_id: string;
  date: string;
  duration: number;
  notes: string;
  subjective_rating: number | null;
  status: TrainingStatus;
  canceled_at: string | null;
  is_late_cancellation: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingInput {
  client_id: string;
  date: string;
  duration?: number;
  notes?: string;
  subjective_rating?: number;
  status?: TrainingStatus;
}

export interface UpdateTrainingInput {
  date?: string;
  duration?: number;
  notes?: string;
  subjective_rating?: number;
  status?: TrainingStatus;
  canceled_at?: string;
  is_late_cancellation?: boolean;
}

export function useTrainingSessions(clientId?: string) {
  return useQuery({
    queryKey: ["training_sessions", clientId],
    queryFn: async () => {
      let query = supabase
        .from("training_sessions")
        .select("*")
        .order("date", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TrainingSession[];
    },
  });
}

export function useCreateTrainingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTrainingInput) => {
      const { data, error } = await supabase
        .from("training_sessions")
        .insert({
          client_id: input.client_id,
          date: input.date,
          duration: input.duration || 60,
          notes: input.notes || "",
          subjective_rating: input.subjective_rating || null,
          status: input.status || "scheduled",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["training_sessions", variables.client_id] });
      toast({
        title: "Trénink vytvořen",
        description: "Nový trénink byl úspěšně přidán.",
      });
    },
    onError: (error) => {
      console.error("Error creating training:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit trénink.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTrainingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTrainingInput }) => {
      const { data, error } = await supabase
        .from("training_sessions")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      toast({
        title: "Trénink aktualizován",
        description: "Změny byly úspěšně uloženy.",
      });
    },
    onError: (error) => {
      console.error("Error updating training:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat trénink.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTrainingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("training_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      toast({
        title: "Trénink smazán",
        description: "Trénink byl úspěšně odstraněn.",
      });
    },
    onError: (error) => {
      console.error("Error deleting training:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat trénink.",
        variant: "destructive",
      });
    },
  });
}

export function useCancelTrainingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isLateCancellation }: { id: string; isLateCancellation: boolean }) => {
      const { data, error } = await supabase
        .from("training_sessions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          is_late_cancellation: isLateCancellation,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      toast({
        title: "Trénink zrušen",
        description: "Trénink byl označen jako zrušený.",
      });
    },
    onError: (error) => {
      console.error("Error canceling training:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se zrušit trénink.",
        variant: "destructive",
      });
    },
  });
}
