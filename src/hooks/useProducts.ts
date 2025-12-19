import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { featureTracker } from "@/hooks/useFeatureTracking";

export interface Product {
  id: string;
  name: string;
  price: number;
  purchase_price: number;
  category: string;
  is_active: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
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
  stock_quantity?: number;
  low_stock_threshold?: number;
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
          stock_quantity: input.stock_quantity ?? 0,
          low_stock_threshold: input.low_stock_threshold ?? 5,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"], exact: false });
      featureTracker.track('product_create', 'finance');
      toast({
        title: "Produkt vytvořen",
        description: "Nový produkt byl úspěšně přidán.",
      });
    },
    onError: (error: any) => {
      console.error("Error creating product:", error);
      toast({
        title: "Chyba",
        description: error?.message || "Nepodařilo se vytvořit produkt.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Product> & { id: string }) => {
      // Get current user to verify auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Uživatel není přihlášen");

      const { data, error } = await supabase
        .from("products")
        .update(input)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Update product error:", error);
        throw error;
      }
      
      if (!data) {
        throw new Error("Produkt nebyl nalezen nebo nemáte oprávnění k jeho úpravě");
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"], exact: false });
      toast({
        title: "Produkt aktualizován",
        description: "Změny byly úspěšně uloženy.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating product:", error);
      toast({
        title: "Chyba",
        description: error?.message || "Nepodařilo se aktualizovat produkt.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get current user to verify auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Uživatel není přihlášen");

      // IMPORTANT: delete with select so we can detect RLS no-op deletes
      const { data, error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Delete product error:", error);
        throw error;
      }

      if (!data) {
        throw new Error("Produkt nebyl smazán (nemáte oprávnění nebo už neexistuje)");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"], exact: false });
      toast({
        title: "Produkt smazán",
        description: "Produkt byl úspěšně odstraněn.",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting product:", error);
      toast({
        title: "Chyba",
        description: error?.message || "Nepodařilo se smazat produkt.",
        variant: "destructive",
      });
    },
  });
}
