/**
 * Hook for managing client habit settings (water goal, sleep time, caffeine cutoff)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClientHabitSettings {
  id: string;
  client_id: string;
  water_goal_ml: number;
  sleep_time: string | null;
  wake_time: string | null;
  caffeine_cutoff_minutes: number;
  sleep_time_last_set_by: 'client' | 'trainer' | 'system';
  sleep_time_last_set_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitSettingsInput {
  water_goal_ml?: number;
  sleep_time?: string | null;
  wake_time?: string | null;
  caffeine_cutoff_minutes?: number;
  sleep_time_last_set_by?: 'client' | 'trainer' | 'system';
}

const DEFAULT_SETTINGS: Omit<ClientHabitSettings, 'id' | 'client_id' | 'created_at' | 'updated_at' | 'sleep_time_last_set_at'> = {
  water_goal_ml: 2000,
  sleep_time: null,
  wake_time: null,
  caffeine_cutoff_minutes: 480, // 8 hours
  sleep_time_last_set_by: 'system',
};

/**
 * Fetch habit settings for a client
 */
export function useClientHabitSettings(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-habit-settings', clientId],
    queryFn: async (): Promise<ClientHabitSettings | null> => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('client_habit_settings')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching habit settings:', error);
        throw error;
      }

      return data as ClientHabitSettings | null;
    },
    enabled: !!clientId,
  });
}

/**
 * Get effective settings (with defaults if not set)
 */
export function useEffectiveHabitSettings(clientId: string | undefined) {
  const { data: settings, ...rest } = useClientHabitSettings(clientId);

  const effectiveSettings: Omit<ClientHabitSettings, 'id' | 'client_id' | 'created_at' | 'updated_at' | 'sleep_time_last_set_at'> = {
    water_goal_ml: settings?.water_goal_ml ?? DEFAULT_SETTINGS.water_goal_ml,
    sleep_time: settings?.sleep_time ?? DEFAULT_SETTINGS.sleep_time,
    wake_time: settings?.wake_time ?? DEFAULT_SETTINGS.wake_time,
    caffeine_cutoff_minutes: settings?.caffeine_cutoff_minutes ?? DEFAULT_SETTINGS.caffeine_cutoff_minutes,
    sleep_time_last_set_by: settings?.sleep_time_last_set_by ?? DEFAULT_SETTINGS.sleep_time_last_set_by,
  };

  return {
    settings: effectiveSettings,
    rawSettings: settings,
    ...rest,
  };
}

/**
 * Upsert habit settings for a client
 */
export function useUpsertHabitSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      settings,
      setBy = 'client',
    }: {
      clientId: string;
      settings: HabitSettingsInput;
      setBy?: 'client' | 'trainer';
    }) => {
      const updateData: Record<string, unknown> = {
        client_id: clientId,
        ...settings,
      };

      // If sleep_time is being updated, track who set it
      if (settings.sleep_time !== undefined) {
        updateData.sleep_time_last_set_by = setBy;
        updateData.sleep_time_last_set_at = new Date().toISOString();
      }

      // First check if settings exist
      const { data: existing } = await supabase
        .from('client_habit_settings')
        .select('id')
        .eq('client_id', clientId)
        .maybeSingle();

      let result;
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('client_habit_settings')
          .update(settings)
          .eq('client_id', clientId)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('client_habit_settings')
          .insert({ client_id: clientId, ...settings })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      return result as ClientHabitSettings;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-habit-settings', data.client_id] });
      toast.success('Nastavení uloženo');
    },
    onError: (error) => {
      console.error('Error saving habit settings:', error);
      toast.error('Nepodařilo se uložit nastavení');
    },
  });
}

/**
 * Calculate caffeine cutoff time based on sleep time and cutoff minutes
 */
export function calculateCaffeineCutoff(sleepTime: string | null, cutoffMinutes: number): string | null {
  if (!sleepTime) return null;

  const [hours, minutes] = sleepTime.split(':').map(Number);
  const sleepMinutes = hours * 60 + minutes;
  let cutoffTotalMinutes = sleepMinutes - cutoffMinutes;

  // Handle negative (next day sleep time)
  if (cutoffTotalMinutes < 0) {
    cutoffTotalMinutes += 24 * 60;
  }

  const cutoffHours = Math.floor(cutoffTotalMinutes / 60) % 24;
  const cutoffMins = cutoffTotalMinutes % 60;

  return `${cutoffHours.toString().padStart(2, '0')}:${cutoffMins.toString().padStart(2, '0')}`;
}

/**
 * Check if a given time is after the caffeine cutoff
 */
export function isCaffeineAfterCutoff(
  entryTime: string, // HH:MM format
  sleepTime: string | null,
  cutoffMinutes: number
): boolean {
  const cutoffTime = calculateCaffeineCutoff(sleepTime, cutoffMinutes);
  if (!cutoffTime || !sleepTime) return false;

  const [entryHours, entryMins] = entryTime.split(':').map(Number);
  const [cutoffHours, cutoffMins] = cutoffTime.split(':').map(Number);
  const [sleepHours, sleepMins] = sleepTime.split(':').map(Number);

  const entryTotalMins = entryHours * 60 + entryMins;
  const cutoffTotalMins = cutoffHours * 60 + cutoffMins;
  const sleepTotalMins = sleepHours * 60 + sleepMins;

  // If sleep time is after midnight (e.g., 01:00), handle wraparound
  if (sleepTotalMins < cutoffTotalMins) {
    // Sleep is after midnight
    // Entry is late if: after cutoff OR before sleep (next day)
    return entryTotalMins >= cutoffTotalMins || entryTotalMins < sleepTotalMins;
  }

  // Normal case: cutoff < sleep (same day)
  return entryTotalMins >= cutoffTotalMins && entryTotalMins < sleepTotalMins;
}
