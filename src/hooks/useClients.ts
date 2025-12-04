import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ClientFormValues } from "@/lib/validations/client";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  training_goals: string[];
  notes: string;
  health_restrictions: string;
  created_at: string;
  updated_at: string;
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: values.name,
          email: values.email,
          phone: values.phone || null,
          training_goals: values.trainingGoals,
          notes: values.notes || "",
          health_restrictions: values.healthRestrictions || "",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
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
