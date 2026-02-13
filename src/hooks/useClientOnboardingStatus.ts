import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export interface OnboardingStatus {
  hasAnonymousBenchmarks: boolean;
  hasMeasurement: boolean;
  hasTrackedExercise: boolean;
  hasNutritionEntry: boolean;
  isComplete: boolean;
}

export function useClientOnboardingStatus() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['client-onboarding-status', clientId],
    queryFn: async (): Promise<OnboardingStatus> => {
      if (!clientId) {
        return {
          hasAnonymousBenchmarks: false,
          hasMeasurement: false,
          hasTrackedExercise: false,
          hasNutritionEntry: false,
          isComplete: false,
        };
      }

      // Check anonymous benchmarks setting from clients table
      const { data: clientData } = await supabase
        .from('clients')
        .select('allow_anonymous_benchmarks')
        .eq('id', clientId)
        .maybeSingle();

      const hasAnonymousBenchmarks = clientData?.allow_anonymous_benchmarks ?? false;

      // Check if client has any measurements
      const { count: measurementCount } = await supabase
        .from('measurements')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .limit(1);

      const hasMeasurement = (measurementCount ?? 0) > 0;

      // Check if client has any tracked exercises
      const { count: trackedExerciseCount } = await supabase
        .from('client_tracked_exercises')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .limit(1);

      const hasTrackedExercise = (trackedExerciseCount ?? 0) > 0;

      // Check if client has any nutrition entries (from campaigns)
      const { count: nutritionCount } = await supabase
        .from('client_portal_activity')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('activity_type', 'campaign_entry')
        .limit(1);

      const hasNutritionEntry = (nutritionCount ?? 0) > 0;

      const isComplete = hasAnonymousBenchmarks && hasMeasurement && hasTrackedExercise && hasNutritionEntry;

      return {
        hasAnonymousBenchmarks,
        hasMeasurement,
        hasTrackedExercise,
        hasNutritionEntry,
        isComplete,
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
