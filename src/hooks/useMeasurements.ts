import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { featureTracker } from "@/hooks/useFeatureTracking";

export interface Measurement {
  id: string;
  client_id: string;
  date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  basal_metabolism: number | null;
  visceral_fat: number | null;
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
  source_file_url: string | null;
}

export interface CreateMeasurementInput {
  client_id: string;
  date?: string;
  weight?: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  basal_metabolism?: number;
  visceral_fat?: number;
  bmi?: number;
  water_percent?: number;
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
  source_file_url?: string | null;
}

export interface UpdateMeasurementInput extends CreateMeasurementInput {
  id: string;
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
          visceral_fat: input.visceral_fat || null,
          bmi: input.bmi || null,
          water_percent: input.water_percent || null,
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
          source_file_url: input.source_file_url || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      queryClient.invalidateQueries({ queryKey: ["measurements", variables.client_id] });
      featureTracker.track('measurement_create', 'measurements');
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

export function useUpdateMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMeasurementInput) => {
      const { data, error } = await supabase
        .from("measurements")
        .update({
          date: input.date,
          weight: input.weight || null,
          body_fat_percentage: input.body_fat_percentage || null,
          muscle_mass: input.muscle_mass || null,
          basal_metabolism: input.basal_metabolism || null,
          visceral_fat: input.visceral_fat || null,
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
          source_file_url: input.source_file_url,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      queryClient.invalidateQueries({ queryKey: ["measurements", variables.client_id] });
      featureTracker.track('measurement_update', 'measurements');
      toast({
        title: "Měření aktualizováno",
        description: "Měření bylo úspěšně upraveno.",
      });
    },
    onError: (error) => {
      console.error("Error updating measurement:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se upravit měření.",
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
      featureTracker.track('measurement_delete', 'measurements');
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

// Check for existing measurement on same date for client
export function useFindDuplicateMeasurement() {
  return useMutation({
    mutationFn: async ({ clientId, date }: { clientId: string; date: string }) => {
      const { data, error } = await supabase
        .from("measurements")
        .select("*")
        .eq("client_id", clientId)
        .eq("date", date)
        .maybeSingle();

      if (error) throw error;
      return data as Measurement | null;
    },
  });
}

// Merge measurements (only update non-null values)
export function useMergeMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ existingId, newData }: { existingId: string; newData: CreateMeasurementInput }) => {
      // Get existing measurement
      const { data: existing, error: fetchError } = await supabase
        .from("measurements")
        .select("*")
        .eq("id", existingId)
        .single();

      if (fetchError) throw fetchError;

      // Merge: only update if new value exists and existing is null
      const merged = {
        weight: newData.weight ?? existing.weight,
        body_fat_percentage: newData.body_fat_percentage ?? existing.body_fat_percentage,
        muscle_mass: newData.muscle_mass ?? existing.muscle_mass,
        basal_metabolism: newData.basal_metabolism ?? existing.basal_metabolism,
        visceral_fat: newData.visceral_fat ?? existing.visceral_fat,
        chest: newData.chest ?? existing.chest,
        waist: newData.waist ?? existing.waist,
        hips: newData.hips ?? existing.hips,
        bicep_left: newData.bicep_left ?? existing.bicep_left,
        bicep_right: newData.bicep_right ?? existing.bicep_right,
        thigh_left: newData.thigh_left ?? existing.thigh_left,
        thigh_right: newData.thigh_right ?? existing.thigh_right,
        calf_left: newData.calf_left ?? existing.calf_left,
        calf_right: newData.calf_right ?? existing.calf_right,
        mental_state: newData.mental_state ?? existing.mental_state,
        notes: newData.notes || existing.notes,
        source_file_url: newData.source_file_url ?? existing.source_file_url,
      };

      const { data, error } = await supabase
        .from("measurements")
        .update(merged)
        .eq("id", existingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      toast({
        title: "Měření sloučeno",
        description: "Hodnoty byly úspěšně sloučeny s existujícím záznamem.",
      });
    },
    onError: (error) => {
      console.error("Error merging measurement:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se sloučit měření.",
        variant: "destructive",
      });
    },
  });
}
