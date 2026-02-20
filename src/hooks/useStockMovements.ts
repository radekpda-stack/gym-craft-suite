import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type MovementType = 'restock' | 'sale' | 'adjustment' | 'invoice_import' | 'inventura';

export interface StockMovement {
  id: string;
  product_id: string;
  user_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_price: number;
  note: string | null;
  source_ref: string | null;
  created_at: string;
  product_name?: string;
}

interface CreateMovementInput {
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_price?: number;
  note?: string;
  source_ref?: string;
}

export function useStockMovements(productId?: string) {
  return useQuery({
    queryKey: ['stock_movements', productId],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select('*, products!inner(name)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        product_id: row.product_id,
        user_id: row.user_id,
        movement_type: row.movement_type as MovementType,
        quantity: row.quantity,
        unit_price: Number(row.unit_price) || 0,
        note: row.note,
        source_ref: row.source_ref,
        created_at: row.created_at,
        product_name: row.products?.name || '',
      })) as StockMovement[];
    },
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMovementInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('stock_movements')
        .insert({
          product_id: input.product_id,
          user_id: user.id,
          movement_type: input.movement_type,
          quantity: input.quantity,
          unit_price: input.unit_price || 0,
          note: input.note || null,
          source_ref: input.source_ref || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
    },
  });
}
