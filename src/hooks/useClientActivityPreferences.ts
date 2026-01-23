import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Detects if a client has started using optional features like:
 * - Own workout logging (not from trainer)
 * - Nutrition tracking
 * 
 * Used to show smart shortcuts on dashboard
 */
export function useClientActivityPreferences(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-activity-preferences', clientId],
    queryFn: async () => {
      if (!clientId) return { hasOwnWorkouts: false, hasNutritionEntries: false };

      // Check for own workouts (source = client_manual or similar client sources)
      const { count: ownWorkoutsCount } = await supabase
        .from('client_workout_logs')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .in('source', ['client_manual', 'client_portal', 'client'])
        .limit(1);

      // Check for any nutrition entries
      const { count: foodCount } = await supabase
        .from('nutrition_food_entries')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .limit(1);

      return {
        hasOwnWorkouts: (ownWorkoutsCount ?? 0) > 0,
        hasNutritionEntries: (foodCount ?? 0) > 0,
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000,
  });
}
