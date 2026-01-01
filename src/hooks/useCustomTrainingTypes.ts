import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CustomTrainingType {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export function useCustomTrainingTypes() {
  return useQuery({
    queryKey: ["custom-training-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_training_types")
        .select("*")
        .order("name");

      if (error) throw error;
      return (data || []) as CustomTrainingType[];
    },
  });
}

export function useCreateCustomTrainingType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color = "bg-gray-500" }: { name: string; color?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("custom_training_types")
        .insert({ 
          name: name.trim(), 
          color,
          user_id: user.id 
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Tento typ tréninku již existuje");
        }
        throw error;
      }
      return data as CustomTrainingType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-training-types"] });
      toast({
        title: "Typ tréninku přidán",
        description: "Nový typ tréninku byl úspěšně vytvořen.",
      });
    },
    onError: (error) => {
      console.error("Error creating custom training type:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodařilo se vytvořit typ tréninku.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteCustomTrainingType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_training_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-training-types"] });
      toast({
        title: "Typ tréninku smazán",
      });
    },
    onError: (error) => {
      console.error("Error deleting custom training type:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat typ tréninku.",
        variant: "destructive",
      });
    },
  });
}
