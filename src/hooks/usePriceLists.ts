import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const OLD_PRICE_LIST_ID = '00000000-0000-0000-0000-000000000001';
export const NEW_PRICE_LIST_ID = '00000000-0000-0000-0000-000000000002';

export interface PriceList {
  id: string;
  name: string;
  effective_from: string;
  is_active: boolean;
  created_at: string;
  user_id: string | null;
  description: string | null;
}

export interface PriceItem {
  id: string;
  price_list_id: string;
  service_id: string;
  unit_price_czk: number;
  created_at: string;
}

export interface PriceListWithItems extends PriceList {
  price_items: PriceItem[];
}

export interface UpcomingPriceList {
  id: string;
  name: string;
  effective_from: string;
  description: string | null;
  days_until: number;
}

/**
 * Get all price lists with their items
 */
export function usePriceLists() {
  return useQuery({
    queryKey: ['price_lists'],
    queryFn: async (): Promise<PriceListWithItems[]> => {
      const { data, error } = await supabase
        .from('price_lists')
        .select('*, price_items(*)')
        .order('effective_from', { ascending: false });

      if (error) throw error;
      return data as PriceListWithItems[];
    },
  });
}

/**
 * Get the currently active price list based on date
 */
export function useCurrentPriceList() {
  return useQuery({
    queryKey: ['current_price_list'],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.rpc('rpc_get_current_price_list');

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get upcoming (future) price list
 */
export function useUpcomingPriceList() {
  return useQuery({
    queryKey: ['upcoming_price_list'],
    queryFn: async (): Promise<UpcomingPriceList | null> => {
      const { data, error } = await supabase.rpc('rpc_get_upcoming_price_list');

      if (error) throw error;
      return data?.[0] || null;
    },
  });
}

/**
 * Get price for a specific service from a price list
 */
export function usePriceForService(priceListId: string | undefined, serviceId: string | undefined) {
  return useQuery({
    queryKey: ['price_for_service', priceListId, serviceId],
    queryFn: async (): Promise<number | null> => {
      if (!priceListId || !serviceId) return null;

      const { data, error } = await supabase.rpc('rpc_get_price_for_service', {
        p_price_list_id: priceListId,
        p_service_id: serviceId,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!priceListId && !!serviceId,
  });
}

/**
 * Get OLD and NEW price lists
 */
export function useOldAndNewPriceLists() {
  const { data: priceLists } = usePriceLists();
  
  const oldPriceList = priceLists?.find(pl => pl.id === OLD_PRICE_LIST_ID);
  const newPriceList = priceLists?.find(pl => pl.id === NEW_PRICE_LIST_ID);
  
  return {
    oldPriceList,
    newPriceList,
    oldPrices: oldPriceList?.price_items || [],
    newPrices: newPriceList?.price_items || [],
  };
}

/**
 * Get prices map from price items
 */
export function getPricesMap(priceItems: PriceItem[]): Record<string, number> {
  return priceItems.reduce((acc, item) => {
    acc[item.service_id] = item.unit_price_czk;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Create a new price list with prices
 */
export function useCreatePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      effectiveFrom,
      prices,
    }: {
      name: string;
      effectiveFrom: Date;
      prices: { PT_1: number; PT_2: number; PT_3P: number; first_training?: number };
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the price list
      const { data: priceList, error: plError } = await supabase
        .from('price_lists')
        .insert({
          name,
          effective_from: effectiveFrom.toISOString(),
          is_active: true,
          user_id: user.id,
        })
        .select()
        .single();

      if (plError) throw plError;

      // Create price items
      const priceItems = [
        { price_list_id: priceList.id, service_id: 'PT_1', unit_price_czk: prices.PT_1 },
        { price_list_id: priceList.id, service_id: 'PT_2', unit_price_czk: prices.PT_2 },
        { price_list_id: priceList.id, service_id: 'PT_3P', unit_price_czk: prices.PT_3P },
      ];

      const { error: piError } = await supabase
        .from('price_items')
        .insert(priceItems);

      if (piError) throw piError;

      return priceList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price_lists'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming_price_list'] });
    },
  });
}

/**
 * Delete a price list
 */
export function useDeletePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (priceListId: string) => {
      // Delete price items first
      const { error: piError } = await supabase
        .from('price_items')
        .delete()
        .eq('price_list_id', priceListId);

      if (piError) throw piError;

      // Delete price list
      const { error: plError } = await supabase
        .from('price_lists')
        .delete()
        .eq('id', priceListId);

      if (plError) throw plError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price_lists'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming_price_list'] });
    },
  });
}
