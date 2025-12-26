import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface FoodEntryInput {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  portion_size?: 'small' | 'medium' | 'large';
  quality?: 'good' | 'normal' | 'poor';
  satiation?: 'just_right' | 'still_hungry' | 'overate';
  feeling_after?: string;
  note?: string;
}

export interface DrinkEntryInput {
  drink_type: 'water' | 'sugary' | 'sports' | 'alcohol' | 'other';
  amount_ml?: number;
  drink_name?: string;
  note?: string;
}

export interface CoffeeEntryInput {
  coffee_type: 'espresso' | 'cappuccino' | 'energy' | 'other';
  count: number;
  sugar?: boolean;
  sugar_spoons?: number;
  milk?: 'none' | 'little' | 'normal' | 'much';
  note?: string;
}

export function useAddFoodEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      clientId, 
      entry,
      date 
    }: { 
      sessionId: string; 
      clientId: string; 
      entry: FoodEntryInput;
      date?: Date;
    }) => {
      const entryDate = format(date || new Date(), 'yyyy-MM-dd');
      const entryTime = format(new Date(), 'HH:mm');

      const { data, error } = await supabase
        .from('nutrition_food_entries')
        .insert({
          session_id: sessionId,
          client_id: clientId,
          entry_date: entryDate,
          entry_time: entryTime,
          description: entry.description,
          meal_type: entry.meal_type,
          portion_mode: 'portion_size',
          portion_size: entry.portion_size || 'medium',
          quality: entry.quality,
          satiation: entry.satiation,
          feeling_after: entry.feeling_after,
          note: entry.note,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sessionId, clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-campaign', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-today-nutrition', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-food-entries', sessionId] });
    },
  });
}

export function useAddDrinkEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      clientId, 
      entry,
      date 
    }: { 
      sessionId: string; 
      clientId: string; 
      entry: DrinkEntryInput;
      date?: Date;
    }) => {
      const entryDate = format(date || new Date(), 'yyyy-MM-dd');
      const entryTime = format(new Date(), 'HH:mm');

      const { data, error } = await supabase
        .from('nutrition_drink_entries')
        .insert({
          session_id: sessionId,
          client_id: clientId,
          entry_date: entryDate,
          entry_time: entryTime,
          drink_type: entry.drink_type,
          drink_name: entry.drink_name,
          amount_ml: entry.amount_ml,
          note: entry.note,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sessionId, clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-campaign', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-today-nutrition', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-drink-entries', sessionId] });
    },
  });
}

export function useAddCoffeeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      clientId, 
      entry,
      date 
    }: { 
      sessionId: string; 
      clientId: string; 
      entry: CoffeeEntryInput;
      date?: Date;
    }) => {
      const entryDate = format(date || new Date(), 'yyyy-MM-dd');
      const entryTime = format(new Date(), 'HH:mm');

      const { data, error } = await supabase
        .from('nutrition_coffee_entries')
        .insert({
          session_id: sessionId,
          client_id: clientId,
          entry_date: entryDate,
          entry_time: entryTime,
          coffee_type: entry.coffee_type,
          count: entry.count,
          sugar: entry.sugar || false,
          sugar_spoons: entry.sugar_spoons || 0,
          milk: entry.milk || 'none',
          note: entry.note,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sessionId, clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-campaign', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-today-nutrition', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-coffee-entries', sessionId] });
    },
  });
}

export function useQuickAddWater() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      clientId,
      amount = 300
    }: { 
      sessionId: string; 
      clientId: string;
      amount?: number;
    }) => {
      const entryDate = format(new Date(), 'yyyy-MM-dd');
      const entryTime = format(new Date(), 'HH:mm');

      const { data, error } = await supabase
        .from('nutrition_drink_entries')
        .insert({
          session_id: sessionId,
          client_id: clientId,
          entry_date: entryDate,
          entry_time: entryTime,
          drink_type: 'water',
          amount_ml: amount,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sessionId, clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-campaign', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-today-nutrition', clientId, sessionId] });
    },
  });
}

export function useUpdateFoodEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      entryId,
      sessionId, 
      clientId, 
      entry,
    }: { 
      entryId: string;
      sessionId: string; 
      clientId: string; 
      entry: Partial<FoodEntryInput>;
    }) => {
      const { data, error } = await supabase
        .from('nutrition_food_entries')
        .update({
          description: entry.description,
          meal_type: entry.meal_type,
          portion_size: entry.portion_size,
          quality: entry.quality,
          satiation: entry.satiation,
          feeling_after: entry.feeling_after,
          note: entry.note,
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sessionId, clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-campaign', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-today-nutrition', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-food-entries', sessionId] });
    },
  });
}

export function useUpdateDrinkEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      entryId,
      sessionId, 
      clientId, 
      entry,
    }: { 
      entryId: string;
      sessionId: string; 
      clientId: string; 
      entry: Partial<DrinkEntryInput>;
    }) => {
      const { data, error } = await supabase
        .from('nutrition_drink_entries')
        .update({
          drink_type: entry.drink_type,
          drink_name: entry.drink_name,
          amount_ml: entry.amount_ml,
          note: entry.note,
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sessionId, clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-campaign', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-today-nutrition', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-drink-entries', sessionId] });
    },
  });
}

export function useUpdateCoffeeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      entryId,
      sessionId, 
      clientId, 
      entry,
    }: { 
      entryId: string;
      sessionId: string; 
      clientId: string; 
      entry: Partial<CoffeeEntryInput>;
    }) => {
      const { data, error } = await supabase
        .from('nutrition_coffee_entries')
        .update({
          coffee_type: entry.coffee_type,
          count: entry.count,
          sugar: entry.sugar,
          sugar_spoons: entry.sugar_spoons,
          milk: entry.milk,
          note: entry.note,
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sessionId, clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-campaign', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-today-nutrition', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-coffee-entries', sessionId] });
    },
  });
}

export function useDeleteNutritionEntryPortal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      type,
      entryId,
      sessionId, 
      clientId,
    }: { 
      type: 'food' | 'drink' | 'coffee';
      entryId: string;
      sessionId: string; 
      clientId: string;
    }) => {
      const table = type === 'food' 
        ? 'nutrition_food_entries' 
        : type === 'drink' 
          ? 'nutrition_drink_entries' 
          : 'nutrition_coffee_entries';

      const { error } = await supabase.from(table).delete().eq('id', entryId);
      if (error) throw error;
      return { type, sessionId, clientId };
    },
    onSuccess: ({ type, sessionId, clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-campaign', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-today-nutrition', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: [`nutrition-${type}-entries`, sessionId] });
    },
  });
}
