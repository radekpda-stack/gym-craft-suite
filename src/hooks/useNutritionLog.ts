import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';

export interface NutritionLogSession {
  id: string;
  client_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  token: string;
  status: 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface NutritionFoodEntry {
  id: string;
  session_id: string;
  client_id: string;
  entry_date: string;
  entry_time: string;
  description: string;
  portion_mode: 'grams' | 'portion_size' | 'units';
  grams?: number;
  portion_size?: 'small' | 'medium' | 'large';
  units_count?: number;
  units_label?: string;
  note?: string;
  photo_url?: string;
  created_at: string;
  // New quality/satiation/energy fields
  quality?: 'good' | 'normal' | 'poor';
  satiation?: 'just_right' | 'still_hungry' | 'overate';
  feeling_after?: 'ok' | 'heavy' | 'bloated' | 'sweet' | 'low_energy' | 'high_energy';
  energy_after?: 'low' | 'normal' | 'high';
}

export interface NutritionDrinkEntry {
  id: string;
  session_id: string;
  client_id: string;
  entry_date: string;
  entry_time: string;
  drink_type: string;
  drink_name?: string;
  amount_ml?: number;
  amount_container_type?: string;
  amount_container_count?: number;
  note?: string;
  created_at: string;
}

export interface NutritionCoffeeEntry {
  id: string;
  session_id: string;
  client_id: string;
  entry_date: string;
  entry_time: string;
  coffee_type: string;
  count: number;
  sugar: boolean;
  sugar_spoons: number;
  milk: 'none' | 'little' | 'normal' | 'much';
  note?: string;
  created_at: string;
}

// Container defaults in ml
export const CONTAINER_DEFAULTS = {
  glass: 250,
  mug: 300,
  bottle: 500,
  can: 330,
};

export function useNutritionLogSessions(clientId: string) {
  return useQuery({
    queryKey: ['nutrition-log-sessions', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_log_sessions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as NutritionLogSession[];
    },
    enabled: !!clientId,
  });
}

export function useNutritionLogSession(sessionId: string) {
  return useQuery({
    queryKey: ['nutrition-log-session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_log_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data as NutritionLogSession;
    },
    enabled: !!sessionId,
  });
}

export function useNutritionEntries(sessionId: string) {
  const foodQuery = useQuery({
    queryKey: ['nutrition-food-entries', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_food_entries')
        .select('*')
        .eq('session_id', sessionId)
        .order('entry_date', { ascending: true })
        .order('entry_time', { ascending: true });

      if (error) throw error;
      return data as NutritionFoodEntry[];
    },
    enabled: !!sessionId,
  });

  const drinkQuery = useQuery({
    queryKey: ['nutrition-drink-entries', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_drink_entries')
        .select('*')
        .eq('session_id', sessionId)
        .order('entry_date', { ascending: true })
        .order('entry_time', { ascending: true });

      if (error) throw error;
      return data as NutritionDrinkEntry[];
    },
    enabled: !!sessionId,
  });

  const coffeeQuery = useQuery({
    queryKey: ['nutrition-coffee-entries', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_coffee_entries')
        .select('*')
        .eq('session_id', sessionId)
        .order('entry_date', { ascending: true })
        .order('entry_time', { ascending: true });

      if (error) throw error;
      return data as NutritionCoffeeEntry[];
    },
    enabled: !!sessionId,
  });

  return {
    food: foodQuery.data || [],
    drinks: drinkQuery.data || [],
    coffee: coffeeQuery.data || [],
    isLoading: foodQuery.isLoading || drinkQuery.isLoading || coffeeQuery.isLoading,
  };
}

export function useCreateNutritionLogSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, startDate }: { clientId: string; startDate: Date }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const endDate = addDays(startDate, 6);

      const { data, error } = await supabase
        .from('nutrition_log_sessions')
        .insert({
          client_id: clientId,
          user_id: user.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
        })
        .select()
        .single();

      if (error) throw error;
      return data as NutritionLogSession;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-log-sessions', clientId] });
    },
  });
}

export function useUpdateNutritionLogSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: 'active' | 'completed' }) => {
      const { data, error } = await supabase
        .from('nutrition_log_sessions')
        .update({ status })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as NutritionLogSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-log-sessions', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-log-session', data.id] });
    },
  });
}

export function useRegenerateToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('nutrition_log_sessions')
        .update({ token: crypto.randomUUID() })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as NutritionLogSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-log-sessions', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-log-session', data.id] });
    },
  });
}

export function useDeleteNutritionEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, id, sessionId }: { type: 'food' | 'drink' | 'coffee'; id: string; sessionId: string }) => {
      const table = type === 'food' 
        ? 'nutrition_food_entries' 
        : type === 'drink' 
          ? 'nutrition_drink_entries' 
          : 'nutrition_coffee_entries';

      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { type, sessionId };
    },
    onSuccess: ({ type, sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [`nutrition-${type}-entries`, sessionId] });
    },
  });
}

export function useDeleteNutritionSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      // First delete all entries for this session (cascade)
      const [foodResult, drinkResult, coffeeResult] = await Promise.all([
        supabase.from('nutrition_food_entries').delete().eq('session_id', sessionId),
        supabase.from('nutrition_drink_entries').delete().eq('session_id', sessionId),
        supabase.from('nutrition_coffee_entries').delete().eq('session_id', sessionId),
      ]);

      if (foodResult.error) throw foodResult.error;
      if (drinkResult.error) throw drinkResult.error;
      if (coffeeResult.error) throw coffeeResult.error;

      // Then delete the session
      const { error } = await supabase
        .from('nutrition_log_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      return sessionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-nutrition-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-log-sessions'] });
    },
  });
}

export function useDeleteMultipleNutritionSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionIds: string[]) => {
      for (const sessionId of sessionIds) {
        await Promise.all([
          supabase.from('nutrition_food_entries').delete().eq('session_id', sessionId),
          supabase.from('nutrition_drink_entries').delete().eq('session_id', sessionId),
          supabase.from('nutrition_coffee_entries').delete().eq('session_id', sessionId),
        ]);

        const { error } = await supabase
          .from('nutrition_log_sessions')
          .delete()
          .eq('id', sessionId);

        if (error) throw error;
      }
      return sessionIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-nutrition-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-log-sessions'] });
    },
  });
}

export function calculateDrinkMl(entry: NutritionDrinkEntry): number {
  if (entry.amount_ml) return entry.amount_ml;
  if (entry.amount_container_type && entry.amount_container_count) {
    const containerMl = CONTAINER_DEFAULTS[entry.amount_container_type as keyof typeof CONTAINER_DEFAULTS] || 250;
    return containerMl * entry.amount_container_count;
  }
  return 0;
}
