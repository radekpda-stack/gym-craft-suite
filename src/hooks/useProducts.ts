import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Product {
  id: string;
  name: string;
  price: number;
  purchase_price: number;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export interface CreateProductInput {
  name: string;
  price: number;
  purchase_price?: number;
  category?: string;
  is_active?: boolean;
}

export function useProducts(activeOnly = false) {
  return useQuery({
    queryKey: ["products", activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .order("name");

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("products")
        .insert({
          name: input.name,
          price: input.price,
          purchase_price: input.purchase_price || 0,
          category: input.category || "supplement",
          is_active: input.is_active ?? true,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Produkt vytvořen",
        description: "Nový produkt byl úspěšně přidán.",
      });
    },
    onError: (error) => {
      console.error("Error creating product:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit produkt.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from("products")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Produkt aktualizován",
        description: "Změny byly úspěšně uloženy.",
      });
    },
    onError: (error) => {
      console.error("Error updating product:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat produkt.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Produkt smazán",
        description: "Produkt byl úspěšně odstraněn.",
      });
    },
    onError: (error) => {
      console.error("Error deleting product:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat produkt.",
        variant: "destructive",
      });
    },
  });
}
