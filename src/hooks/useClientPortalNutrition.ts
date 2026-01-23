import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
export interface FoodEntryInput {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  portion_size?: 'small' | 'medium' | 'large';
  quality?: 'good' | 'normal' | 'poor';
  satiation?: 'just_right' | 'still_hungry' | 'overate';
  feeling_after?: string;
  note?: string;
  entry_time?: string; // Format "HH:mm"
}

export interface DrinkEntryInput {
  drink_type: 'water' | 'sugary' | 'sports' | 'alcohol' | 'other';
  amount_ml?: number;
  drink_name?: string;
  note?: string;
  entry_time?: string; // Format "HH:mm"
}

export interface CoffeeEntryInput {
  coffee_type: 'espresso' | 'cappuccino' | 'tea' | 'energy' | 'other';
  count: number;
  sugar?: boolean;
  sugar_spoons?: number;
  milk?: 'none' | 'little' | 'normal' | 'much';
  note?: string;
  entry_time?: string; // Format "HH:mm"
  is_caffeinated?: boolean; // Default true
  coffee_amount_ml?: number; // Optional volume in ml
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
      const entryTime = entry.entry_time || format(new Date(), 'HH:mm');
      
      // Calculate occurred_at timestamp
      const occurredAt = new Date(`${entryDate}T${entryTime}:00`).toISOString();

      const { data, error } = await supabase
        .from('nutrition_food_entries')
        .insert({
          session_id: sessionId,
          client_id: clientId,
          entry_date: entryDate,
          entry_time: entryTime,
          occurred_at: occurredAt,
          description: entry.description,
          meal_type: entry.meal_type,
          portion_mode: 'portion_size',
          portion_size: entry.portion_size || 'medium',
          quality: entry.quality,
          satiation: entry.satiation,
          feeling_after: entry.feeling_after,
          note: entry.note,
          created_from: 'web',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_, { sessionId, clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-campaign', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-today-nutrition', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-food-entries', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-by-date', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-completed-days', sessionId] });
      
      // Notify trainer about food entry (max 1x per day per client)
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Check if notification already sent today
        const { data: existingToday } = await supabase
          .from('notifications')
          .select('id')
          .eq('client_id', clientId)
          .eq('type', 'nutrition_entry_added')
          .gte('created_at', `${today}T00:00:00`)
          .maybeSingle();
          
        if (!existingToday) {
          // Get trainer_id and client name from session
          const { data: session } = await supabase
            .from('nutrition_log_sessions')
            .select('user_id, clients(name)')
            .eq('id', sessionId)
            .single();
          
          if (session?.user_id) {
            const clientName = (session.clients as { name?: string })?.name || 'Klient';
            await supabase.from('notifications').insert({
              user_id: session.user_id,
              client_id: clientId,
              type: 'nutrition_entry_added',
              title: 'Klient zapisuje stravu',
              message: `${clientName} dnes zapisuje stravu.`,
              entity_type: 'nutrition_session',
              entity_id: sessionId,
            });
          }
        }
      } catch (error) {
        console.error('[useAddFoodEntry] Failed to create notification:', error);
      }
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
      const entryTime = entry.entry_time || format(new Date(), 'HH:mm');
      
      // Calculate occurred_at timestamp
      const occurredAt = new Date(`${entryDate}T${entryTime}:00`).toISOString();

      const { data, error } = await supabase
        .from('nutrition_drink_entries')
        .insert({
          session_id: sessionId,
          client_id: clientId,
          entry_date: entryDate,
          entry_time: entryTime,
          occurred_at: occurredAt,
          drink_type: entry.drink_type,
          drink_name: entry.drink_name,
          amount_ml: entry.amount_ml,
          note: entry.note,
          created_from: 'web',
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
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-by-date', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-completed-days', sessionId] });
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
      const entryTime = entry.entry_time || format(new Date(), 'HH:mm');
      
      // Calculate occurred_at timestamp
      const occurredAt = new Date(`${entryDate}T${entryTime}:00`).toISOString();

      const { data, error } = await supabase
        .from('nutrition_coffee_entries')
        .insert({
          session_id: sessionId,
          client_id: clientId,
          entry_date: entryDate,
          entry_time: entryTime,
          occurred_at: occurredAt,
          coffee_type: entry.coffee_type,
          count: entry.count,
          sugar: entry.sugar || false,
          sugar_spoons: entry.sugar_spoons || 0,
          milk: entry.milk || 'none',
          note: entry.note,
          is_caffeinated: entry.is_caffeinated !== false, // Default true
          coffee_amount_ml: entry.coffee_amount_ml,
          created_from: 'web',
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
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-by-date', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-completed-days', sessionId] });
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
      const occurredAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('nutrition_drink_entries')
        .insert({
          session_id: sessionId,
          client_id: clientId,
          entry_date: entryDate,
          entry_time: entryTime,
          occurred_at: occurredAt,
          drink_type: 'water',
          amount_ml: amount,
          created_from: 'web',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sessionId, clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-campaign', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-today-nutrition', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-by-date', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-completed-days', sessionId] });
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
      // Invalidate both portal and trainer-side queries for consistency
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-campaign', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-today-nutrition', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: [`nutrition-${type}-entries`, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-by-date', clientId, sessionId] });
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-completed-days', sessionId] });
    },
  });
}

// Self-service: Client creates their own nutrition log session
export function useCreateClientNutritionSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      clientId,
      trainerId,
      clientName,
      durationDays = 7,
    }: { 
      clientId: string;
      trainerId: string;
      clientName: string;
      durationDays?: number;
    }) => {
      const startDate = new Date();
      const endDate = addDays(startDate, durationDays - 1);

      // Create the nutrition session with self-service flag
      const { data: session, error } = await supabase
        .from('nutrition_log_sessions')
        .insert({
          client_id: clientId,
          user_id: trainerId,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          status: 'active',
          is_self_service: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Notify trainer about client starting nutrition tracking
      await supabase
        .from('notifications')
        .insert({
          user_id: trainerId,
          client_id: clientId,
          type: 'client_nutrition_started',
          title: 'Klient začal sledovat stravu',
          message: `${clientName} si sám/sama aktivoval/a sledování stravy na ${durationDays} dní.`,
          entity_type: 'nutrition_session',
          entity_id: session.id,
        });

      return session;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-campaign', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-nutrition-sessions', clientId] });
    },
  });
}
