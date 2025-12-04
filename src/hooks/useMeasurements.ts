import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Measurement {
  id: string;
  client_id: string;
  date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  basal_metabolism: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  bicep_left: number | null;
  bicep_right: number | null;
  thigh_left: number | null;
  thigh_right: number | null;
  calf_left: number | null;
  calf_right: number | null;
  mental_state: number | null;
  notes: string;
  created_at: string;
  user_id: string | null;
}

export interface CreateMeasurementInput {
  client_id: string;
  date?: string;
  weight?: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  basal_metabolism?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  bicep_left?: number;
  bicep_right?: number;
  thigh_left?: number;
  thigh_right?: number;
  calf_left?: number;
  calf_right?: number;
  mental_state?: number;
  notes?: string;
}

export function useMeasurements(clientId?: string) {
  return useQuery({
    queryKey: ["measurements", clientId],
    queryFn: async () => {
      let query = supabase
        .from("measurements")
        .select("*")
        .order("date", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Measurement[];
    },
  });
}

export function useCreateMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMeasurementInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("measurements")
        .insert({
          client_id: input.client_id,
          date: input.date || new Date().toISOString().split('T')[0],
          weight: input.weight || null,
          body_fat_percentage: input.body_fat_percentage || null,
          muscle_mass: input.muscle_mass || null,
          basal_metabolism: input.basal_metabolism || null,
          chest: input.chest || null,
          waist: input.waist || null,
          hips: input.hips || null,
          bicep_left: input.bicep_left || null,
          bicep_right: input.bicep_right || null,
          thigh_left: input.thigh_left || null,
          thigh_right: input.thigh_right || null,
          calf_left: input.calf_left || null,
          calf_right: input.calf_right || null,
          mental_state: input.mental_state || null,
          notes: input.notes || "",
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      queryClient.invalidateQueries({ queryKey: ["measurements", variables.client_id] });
      toast({
        title: "Měření uloženo",
        description: "Nové měření bylo úspěšně přidáno.",
      });
    },
    onError: (error) => {
      console.error("Error creating measurement:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit měření.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("measurements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      toast({
        title: "Měření smazáno",
        description: "Měření bylo úspěšně odstraněno.",
      });
    },
    onError: (error) => {
      console.error("Error deleting measurement:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat měření.",
        variant: "destructive",
      });
    },
  });
}
