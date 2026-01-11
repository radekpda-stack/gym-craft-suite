/**
 * Hook for fetching trainer's module settings from client portal perspective
 * This allows the client portal to check which modules the trainer has enabled
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ModuleSettings } from './useModuleSettings';

const DEFAULT_MODULES: ModuleSettings = {
  client_portal: true,
  nutrition: true,
  feedback: true,
  diagnostics: true,
  training_templates: true,
  pr_history: true,
  tests: true,
  sales: true,
  calendar: true,
  statistics: true,
  challenges: true,
  exercises: true,
  rewards_system: false, // Disabled by default
};

export function useTrainerModuleSettings(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['trainer-module-settings', trainerId],
    queryFn: async () => {
      if (!trainerId) return DEFAULT_MODULES;

      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('user_id', trainerId)
        .eq('key', 'module_settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching trainer module settings:', error);
        return DEFAULT_MODULES;
      }

      if (data?.value) {
        // Merge with defaults to ensure all keys exist
        return {
          ...DEFAULT_MODULES,
          ...(data.value as Partial<ModuleSettings>),
        };
      }

      return DEFAULT_MODULES;
    },
    enabled: !!trainerId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    placeholderData: DEFAULT_MODULES,
  });
}

export function useIsModuleEnabledForClient(
  trainerId: string | undefined,
  moduleName: keyof ModuleSettings
): boolean {
  const { data: settings } = useTrainerModuleSettings(trainerId);
  return settings?.[moduleName] ?? DEFAULT_MODULES[moduleName];
}
