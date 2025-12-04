import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ClientTag {
  id: string;
  client_id: string;
  tag_id: string;
  created_at: string;
  tag?: {
    id: string;
    name: string;
    color: string;
  };
}

export function useClientTags(clientId?: string) {
  return useQuery({
    queryKey: ["client_tags", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("client_tags")
        .select(`
          id,
          client_id,
          tag_id,
          created_at,
          tags:tag_id (
            id,
            name,
            color
          )
        `)
        .eq("client_id", clientId);

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        tag: item.tags as unknown as { id: string; name: string; color: string }
      }));
    },
    enabled: !!clientId,
  });
}

export function useAddClientTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, tagId }: { clientId: string; tagId: string }) => {
      const { data, error } = await supabase
        .from("client_tags")
        .insert({ client_id: clientId, tag_id: tagId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client_tags", variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Tag přidán",
        description: "Tag byl úspěšně přidán ke klientovi.",
      });
    },
    onError: (error) => {
      console.error("Error adding client tag:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat tag.",
        variant: "destructive",
      });
    },
  });
}

export function useRemoveClientTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, tagId }: { clientId: string; tagId: string }) => {
      const { error } = await supabase
        .from("client_tags")
        .delete()
        .eq("client_id", clientId)
        .eq("tag_id", tagId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client_tags", variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Tag odebrán",
        description: "Tag byl úspěšně odebrán od klienta.",
      });
    },
    onError: (error) => {
      console.error("Error removing client tag:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odebrat tag.",
        variant: "destructive",
      });
    },
  });
}

// Hook to get all clients with their tags for filtering
export function useClientsWithTags() {
  return useQuery({
    queryKey: ["clients_with_tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tags")
        .select(`
          client_id,
          tags:tag_id (
            id,
            name,
            color
          )
        `);

      if (error) throw error;
      
      // Group by client_id
      const clientTagsMap: Record<string, { id: string; name: string; color: string }[]> = {};
      
      (data || []).forEach(item => {
        const tag = item.tags as unknown as { id: string; name: string; color: string };
        if (!clientTagsMap[item.client_id]) {
          clientTagsMap[item.client_id] = [];
        }
        if (tag) {
          clientTagsMap[item.client_id].push(tag);
        }
      });
      
      return clientTagsMap;
    },
  });
}
