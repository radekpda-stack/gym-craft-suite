import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { getClientDisplayName } from '@/lib/anonymousNames';

export interface AvailableChallenger {
  client_id: string;
  display_name: string;
  is_anonymous: boolean;
}

/**
 * Fetch available challengers (other clients of the same trainer)
 * Respects privacy settings - shows nickname or anonymous name
 */
export function useAvailableChallengers() {
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useQuery({
    queryKey: ['available-challengers', trainerId, clientId],
    queryFn: async () => {
      if (!trainerId || !clientId) return [];

      // Get all active clients of the trainer (excluding current user)
      const { data: accounts, error } = await supabase
        .from('client_accounts')
        .select('client_id')
        .eq('trainer_id', trainerId)
        .eq('is_active', true)
        .neq('client_id', clientId);

      if (error) throw error;

      const clientIds = accounts?.map(a => a.client_id) || [];
      if (clientIds.length === 0) return [];

      // Get leaderboard settings for privacy
      const { data: settings, error: settingsError } = await supabase
        .from('client_leaderboard_settings')
        .select('client_id, leaderboard_visible, leaderboard_nickname')
        .in('client_id', clientIds);

      if (settingsError) throw settingsError;

      const settingsMap = new Map(settings?.map(s => [s.client_id, s]) || []);

      // Build list with display names
      const challengers: AvailableChallenger[] = clientIds.map(id => {
        const setting = settingsMap.get(id);
        const isVisible = setting?.leaderboard_visible === true;
        
        return {
          client_id: id,
          display_name: getClientDisplayName(id, isVisible, setting?.leaderboard_nickname),
          is_anonymous: !isVisible,
        };
      });

      // Sort: visible users first, then alphabetically
      challengers.sort((a, b) => {
        if (a.is_anonymous !== b.is_anonymous) {
          return a.is_anonymous ? 1 : -1;
        }
        return a.display_name.localeCompare(b.display_name, 'cs');
      });

      return challengers;
    },
    enabled: !!trainerId && !!clientId,
  });
}
