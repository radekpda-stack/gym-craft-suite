/**
 * Hooks for analyzing frequent nutrition entries
 * Used for quick-add suggestions based on user's history
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FrequentWaterAmount {
  amount: number;
  count: number;
  isTop: boolean;
}

interface FrequentDrinkType {
  type: string;
  count: number;
}

interface FrequentCoffeeType {
  type: string;
  count: number;
  isCaffeinated: boolean;
}

// Helper to count frequency in an array
function countFrequency<T>(items: T[]): Map<T, number> {
  const map = new Map<T, number>();
  for (const item of items) {
    map.set(item, (map.get(item) || 0) + 1);
  }
  return map;
}

// Get top N items from frequency map
function getTopN<T>(frequencyMap: Map<T, number>, n: number): { item: T; count: number }[] {
  return Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([item, count]) => ({ item, count }));
}

/**
 * Hook to get frequent water amounts from history
 * Returns top 4 most used water amounts, with fallback to defaults
 */
export function useFrequentWaterAmounts(clientId: string | undefined) {
  return useQuery({
    queryKey: ['frequent-water-amounts', clientId],
    queryFn: async () => {
      if (!clientId) return { amounts: [], hasHistory: false };

      const { data, error } = await supabase
        .from('nutrition_drink_entries')
        .select('amount_ml')
        .eq('client_id', clientId)
        .eq('drink_type', 'water')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { amounts: [], hasHistory: false };
      }

      const amounts = data.map(d => d.amount_ml).filter((a): a is number => a !== null);
      const frequencyMap = countFrequency(amounts);
      const topAmounts = getTopN(frequencyMap, 4);

      const result: FrequentWaterAmount[] = topAmounts.map((item, index) => ({
        amount: item.item,
        count: item.count,
        isTop: index === 0,
      }));

      return { amounts: result, hasHistory: true };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get frequent drink types (non-water) from history
 * Returns top 3 most used drink types
 */
export function useFrequentDrinkTypes(clientId: string | undefined) {
  return useQuery({
    queryKey: ['frequent-drink-types', clientId],
    queryFn: async () => {
      if (!clientId) return { types: [], hasHistory: false };

      const { data, error } = await supabase
        .from('nutrition_drink_entries')
        .select('drink_type')
        .eq('client_id', clientId)
        .neq('drink_type', 'water')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { types: [], hasHistory: false };
      }

      const types = data.map(d => d.drink_type).filter((t): t is string => t !== null);
      const frequencyMap = countFrequency(types);
      const topTypes = getTopN(frequencyMap, 3);

      const result: FrequentDrinkType[] = topTypes.map(item => ({
        type: item.item,
        count: item.count,
      }));

      return { types: result, hasHistory: true };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get frequent coffee/tea types from history
 * Returns top 4 most used coffee types with caffeine preference
 */
export function useFrequentCoffeeTypes(clientId: string | undefined) {
  return useQuery({
    queryKey: ['frequent-coffee-types', clientId],
    queryFn: async () => {
      if (!clientId) return { types: [], hasHistory: false, defaultCaffeinated: true };

      const { data, error } = await supabase
        .from('nutrition_coffee_entries')
        .select('coffee_type, is_caffeinated')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { types: [], hasHistory: false, defaultCaffeinated: true };
      }

      // Count coffee types
      const typeMap = new Map<string, { count: number; caffeinated: boolean[] }>();
      for (const entry of data) {
        if (!entry.coffee_type) continue;
        const existing = typeMap.get(entry.coffee_type);
        if (existing) {
          existing.count++;
          existing.caffeinated.push(entry.is_caffeinated ?? true);
        } else {
          typeMap.set(entry.coffee_type, {
            count: 1,
            caffeinated: [entry.is_caffeinated ?? true],
          });
        }
      }

      // Sort by frequency
      const sorted = Array.from(typeMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4);

      const result: FrequentCoffeeType[] = sorted.map(([type, info]) => ({
        type,
        count: info.count,
        // Most common caffeine setting for this type
        isCaffeinated: info.caffeinated.filter(Boolean).length >= info.caffeinated.length / 2,
      }));

      // Default caffeinated based on most common setting
      const allCaffeinated = data.map(d => d.is_caffeinated ?? true);
      const defaultCaffeinated = allCaffeinated.filter(Boolean).length >= allCaffeinated.length / 2;

      return { types: result, hasHistory: true, defaultCaffeinated };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}

// Export types for use in components
export type { FrequentWaterAmount, FrequentDrinkType, FrequentCoffeeType };
