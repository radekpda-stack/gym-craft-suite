import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ClientFormValues } from "@/lib/validations/client";
import { featureTracker } from "@/hooks/useFeatureTracking";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  training_goals: string[];
  notes: string;
  health_restrictions: string;
  credit_balance: number;
  birth_date: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  gender: 'male' | 'female' | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Client | null;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: values.name,
          email: values.email,
          phone: values.phone || null,
          training_goals: values.trainingGoals,
          notes: values.notes || "",
          health_restrictions: values.healthRestrictions || "",
          credit_balance: values.creditBalance || 0,
          birth_date: values.birthDate || null,
          gender: values.gender || null,
          handedness: values.handedness || null,
          occupation: values.occupation || null,
          sitting_hours_daily: values.sitting_hours_daily || null,
          sports_history: values.sports_history || null,
          current_activities: values.current_activities || null,
          sleep_hours: values.sleep_hours || null,
          stress_level: values.stress_level || null,
          dietary_restrictions: values.dietary_restrictions || null,
          supplements: values.supplements || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      featureTracker.track('client_create', 'clients');
      toast({
        title: "Klient vytvořen",
        description: "Nový klient byl úspěšně přidán.",
      });
    },
    onError: (error) => {
      console.error("Error creating client:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit klienta. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ClientFormValues }) => {
      const { data, error } = await supabase
        .from("clients")
        .update({
          name: values.name,
          email: values.email,
          phone: values.phone || null,
          training_goals: values.trainingGoals,
          notes: values.notes || "",
          health_restrictions: values.healthRestrictions || "",
          credit_balance: values.creditBalance || 0,
          birth_date: values.birthDate || null,
          gender: values.gender || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients", variables.id] });
      featureTracker.track('client_update', 'clients');
      toast({
        title: "Klient aktualizován",
        description: "Údaje klienta byly úspěšně uloženy.",
      });
    },
    onError: (error) => {
      console.error("Error updating client:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat klienta.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      featureTracker.track('client_delete', 'clients');
      toast({
        title: "Klient smazán",
        description: "Klient byl úspěšně odstraněn.",
      });
    },
    onError: (error) => {
      console.error("Error deleting client:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat klienta.",
        variant: "destructive",
      });
    },
  });
}

export function useArchiveClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_archived }: { id: string; is_archived: boolean }) => {
      const { data, error } = await supabase
        .from("clients")
        .update({ is_archived })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      featureTracker.track(data.is_archived ? 'client_archive' : 'client_unarchive', 'clients');
      toast({
        title: data.is_archived ? "Klient archivován" : "Klient obnoven",
        description: data.is_archived 
          ? "Klient byl přesunut do archivu." 
          : "Klient byl obnoven z archivu.",
      });
    },
    onError: (error) => {
      console.error("Error archiving client:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se archivovat klienta.",
        variant: "destructive",
      });
    },
  });
}
