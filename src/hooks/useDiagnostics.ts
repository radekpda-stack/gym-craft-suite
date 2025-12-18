import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type AreaType = 'joint' | 'muscle';

export interface Diagnostic {
  id: string;
  client_id: string;
  date: string;
  area_type: AreaType;
  area_name: string;
  findings: string;
  notes: string;
  created_at: string;
  user_id: string | null;
}

export interface CreateDiagnosticInput {
  client_id: string;
  date?: string;
  area_type: AreaType;
  area_name: string;
  findings: string;
  notes?: string;
}

export const JOINT_OPTIONS = [
  { value: 'ankle', label: 'Kotník' },
  { value: 'knee', label: 'Koleno' },
  { value: 'hip', label: 'Kyčel' },
  { value: 'pelvis', label: 'Pánev' },
  { value: 'si', label: 'SI kloub' },
  { value: 'l-spine', label: 'L-spine' },
  { value: 't-spine', label: 'T-spine' },
  { value: 'c-spine', label: 'C-spine' },
  { value: 'shoulder', label: 'Rameno' },
  { value: 'elbow', label: 'Loket' },
  { value: 'wrist', label: 'Zápěstí' },
];

export const MUSCLE_OPTIONS = [
  { value: 'chest', label: 'Hrudník' },
  { value: 'back', label: 'Záda' },
  { value: 'shoulders', label: 'Ramena' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'forearms', label: 'Předloktí' },
  { value: 'abs', label: 'Břicho' },
  { value: 'glutes', label: 'Hýždě' },
  { value: 'quadriceps', label: 'Quadriceps' },
  { value: 'hamstrings', label: 'Hamstringy' },
  { value: 'calves', label: 'Lýtka' },
  { value: 'hip-flexors', label: 'Flexory kyčle' },
];

export function useDiagnostics(clientId?: string) {
  return useQuery({
    queryKey: ["diagnostics", clientId],
    queryFn: async () => {
      let query = supabase
        .from("diagnostics")
        .select("*")
        .order("date", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        area_type: d.area_type as AreaType
      })) as Diagnostic[];
    },
  });
}

export function useCreateDiagnostic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDiagnosticInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("diagnostics")
        .insert({
          client_id: input.client_id,
          date: input.date || new Date().toISOString().split('T')[0],
          area_type: input.area_type,
          area_name: input.area_name,
          findings: input.findings,
          notes: input.notes || "",
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["diagnostics"] });
      queryClient.invalidateQueries({ queryKey: ["diagnostics", variables.client_id] });
      toast({
        title: "Diagnostika uložena",
        description: "Nový diagnostický záznam byl přidán.",
      });
    },
    onError: (error) => {
      console.error("Error creating diagnostic:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit diagnostiku.",
        variant: "destructive",
      });
    },
  });
}

export interface UpdateDiagnosticInput {
  id: string;
  findings?: string;
  notes?: string;
  area_type?: AreaType;
  area_name?: string;
  date?: string;
}

export function useUpdateDiagnostic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateDiagnosticInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("diagnostics")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagnostics"] });
      toast({
        title: "Diagnostika aktualizována",
        description: "Změny byly uloženy.",
      });
    },
    onError: (error) => {
      console.error("Error updating diagnostic:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit změny.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteDiagnostic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("diagnostics")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagnostics"] });
      toast({
        title: "Diagnostika smazána",
        description: "Záznam byl úspěšně odstraněn.",
      });
    },
    onError: (error) => {
      console.error("Error deleting diagnostic:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat diagnostiku.",
        variant: "destructive",
      });
    },
  });
}
