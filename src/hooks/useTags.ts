import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Tag[];
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      const { data, error } = await supabase
        .from("tags")
        .insert({ name, color: color || "#6366f1" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast({
        title: "Tag vytvořen",
        description: "Nový tag byl úspěšně přidán.",
      });
    },
    onError: (error) => {
      console.error("Error creating tag:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit tag.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string }) => {
      const { data, error } = await supabase
        .from("tags")
        .update({ name, color })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast({
        title: "Tag aktualizován",
        description: "Změny byly úspěšně uloženy.",
      });
    },
    onError: (error) => {
      console.error("Error updating tag:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat tag.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast({
        title: "Tag smazán",
        description: "Tag byl úspěšně odstraněn.",
      });
    },
    onError: (error) => {
      console.error("Error deleting tag:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat tag.",
        variant: "destructive",
      });
    },
  });
}
