import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Tag types for categorization
export type TagType = "focus" | "body_part" | "intensity" | "goal" | "health" | "status" | "business";

export interface Tag {
  id: string;
  name: string;
  color: string;
  tag_type: TagType;
  is_system: boolean;
  affects_load: boolean;
  affects_credit: boolean;
  created_at: string;
  user_id: string | null;
}

export interface CreateTagParams {
  name: string;
  color?: string;
  tag_type?: TagType;
  is_system?: boolean;
  affects_load?: boolean;
  affects_credit?: boolean;
}

export interface UpdateTagParams {
  id: string;
  name?: string;
  color?: string;
  tag_type?: TagType;
  affects_load?: boolean;
  affects_credit?: boolean;
}

// Tag type labels in Czech
export const TAG_TYPE_LABELS: Record<TagType, string> = {
  focus: "Zaměření",
  body_part: "Partie těla",
  intensity: "Intenzita",
  goal: "Cíl",
  health: "Zdraví",
  status: "Status",
  business: "Finance",
};

// Colors for each tag type
export const TAG_TYPE_COLORS: Record<TagType, string> = {
  focus: "#f97316",
  body_part: "#8b5cf6",
  intensity: "#ef4444",
  goal: "#22c55e",
  health: "#ec4899",
  status: "#0ea5e9",
  business: "#eab308",
};

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("tag_type")
        .order("name");

      if (error) throw error;
      return (data || []).map(tag => ({
        ...tag,
        tag_type: tag.tag_type as TagType || "focus",
        is_system: tag.is_system ?? false,
        affects_load: tag.affects_load ?? true,
        affects_credit: tag.affects_credit ?? true,
      })) as Tag[];
    },
  });
}

// Hook to get tags grouped by type
export function useTagsByType() {
  const { data: tags = [], ...rest } = useTags();
  
  const groupedTags = tags.reduce((acc, tag) => {
    const type = tag.tag_type || "focus";
    if (!acc[type]) acc[type] = [];
    acc[type].push(tag);
    return acc;
  }, {} as Record<TagType, Tag[]>);

  return { data: groupedTags, tags, ...rest };
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      color, 
      tag_type = "focus",
      is_system = false,
      affects_load = true,
      affects_credit = true,
    }: CreateTagParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("tags")
        .insert({ 
          name, 
          color: color || "#6366f1", 
          tag_type,
          is_system,
          affects_load,
          affects_credit,
          user_id: user.id 
        })
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
    mutationFn: async ({ 
      id, 
      name, 
      color, 
      tag_type,
      affects_load,
      affects_credit,
    }: UpdateTagParams) => {
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (color !== undefined) updateData.color = color;
      if (tag_type !== undefined) updateData.tag_type = tag_type;
      if (affects_load !== undefined) updateData.affects_load = affects_load;
      if (affects_credit !== undefined) updateData.affects_credit = affects_credit;

      const { data, error } = await supabase
        .from("tags")
        .update(updateData)
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
      // First check if it's a system tag
      const { data: tag } = await supabase
        .from("tags")
        .select("is_system")
        .eq("id", id)
        .single();

      if (tag?.is_system) {
        throw new Error("Systémové tagy nelze smazat");
      }

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
        description: error instanceof Error ? error.message : "Nepodařilo se smazat tag.",
        variant: "destructive",
      });
    },
  });
}
