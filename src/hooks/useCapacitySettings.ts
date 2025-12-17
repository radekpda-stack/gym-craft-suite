import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CapacitySettings {
  workingDays: boolean[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  workingHoursStart: string; // "06:00"
  workingHoursEnd: string; // "20:00"
  slotDurationMinutes: number; // 60
  includeBlockedTime: boolean; // Whether to count blocked time (vacation, etc.) as unavailable
}

const DEFAULT_SETTINGS: CapacitySettings = {
  workingDays: [true, true, true, true, true, true, true], // All 7 days
  workingHoursStart: '08:00',
  workingHoursEnd: '16:00', // 8 hours
  slotDurationMinutes: 60,
  includeBlockedTime: true,
};

const SETTINGS_KEY = 'capacity_settings';

export function useCapacitySettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings', SETTINGS_KEY],
    queryFn: async (): Promise<CapacitySettings | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', SETTINGS_KEY)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value && typeof data.value === 'object') {
        return data.value as unknown as CapacitySettings;
      }
      
      return null;
    },
  });

  const mutation = useMutation({
    mutationFn: async (newSettings: CapacitySettings) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', SETTINGS_KEY)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value: newSettings as any })
          .eq('key', SETTINGS_KEY)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert({
            key: SETTINGS_KEY,
            value: newSettings as any,
            description: 'Nastavení kapacity kalendáře',
            user_id: user.id,
          });
        if (error) throw error;
      }

      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings', SETTINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['capacity-utilization'] });
    },
  });

  return {
    settings: settings || DEFAULT_SETTINGS,
    isConfigured: !!settings,
    isLoading,
    saveSettings: mutation.mutate,
    isSaving: mutation.isPending,
  };
}
