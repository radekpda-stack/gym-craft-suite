import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export interface ClientPreferences {
  id: string;
  client_id: string;
  weight_unit: 'kg' | 'lb';
  distance_unit: 'km' | 'mi';
  time_format: 'mm:ss' | 'hh:mm:ss';
  notify_water_reminder: boolean;
  notify_campaign_reminder: boolean;
  notify_new_challenge: boolean;
  notify_low_credit: boolean;
  onboarding_completed: boolean;
  onboarding_steps_done: string[];
}

export function useClientPreferences() {
  const { clientId } = useClientPortal();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['client-preferences', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('client_preferences')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      
      // Return data or default values
      if (!data) {
        return {
          client_id: clientId,
          weight_unit: 'kg' as const,
          distance_unit: 'km' as const,
          time_format: 'mm:ss' as const,
          notify_water_reminder: false,
          notify_campaign_reminder: false,
          notify_new_challenge: false,
          notify_low_credit: false,
          onboarding_completed: false,
          onboarding_steps_done: [],
        };
      }
      
      return data as ClientPreferences;
    },
    enabled: !!clientId,
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<ClientPreferences>) => {
      if (!clientId) throw new Error('No client ID');

      // Try to upsert preferences
      const { data, error } = await supabase
        .from('client_preferences')
        .upsert({
          client_id: clientId,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'client_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-preferences', clientId] });
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updatePreferences: mutation.mutate,
    updatePreferencesAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

// Hook for converting values based on preferences
export function useUnitConversion() {
  const { preferences } = useClientPreferences();

  const convertWeight = (kg: number): { value: number; unit: string } => {
    if (preferences?.weight_unit === 'lb') {
      return { value: Math.round(kg * 2.205 * 10) / 10, unit: 'lb' };
    }
    return { value: kg, unit: 'kg' };
  };

  const convertDistance = (km: number): { value: number; unit: string } => {
    if (preferences?.distance_unit === 'mi') {
      return { value: Math.round(km * 0.621 * 100) / 100, unit: 'mi' };
    }
    return { value: km, unit: 'km' };
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (preferences?.time_format === 'hh:mm:ss' || hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    convertWeight,
    convertDistance,
    formatTime,
    weightUnit: preferences?.weight_unit || 'kg',
    distanceUnit: preferences?.distance_unit || 'km',
    timeFormat: preferences?.time_format || 'mm:ss',
  };
}
