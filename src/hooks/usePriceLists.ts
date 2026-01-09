import { useQuery } from "@tanstack/react-query";
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
