import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { getClientDisplayName } from '@/lib/anonymousNames';

export interface AvailableChallenger {
  client_id: string;
  display_name: string;
  is_anonymous: boolean;
  is_trainer?: boolean;
}

/**
 * Fetch available challengers (other clients of the same trainer + trainer)
 * Respects privacy settings - shows nickname or anonymous name for hidden clients
 * Shows real name for visible clients without nickname
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
      
      // Get client names
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds.length > 0 ? clientIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('is_archived', false);

      if (clientsError) throw clientsError;

      const clientNameMap = new Map((clients || []).map(c => [c.id, c.name]));
      const activeClientIds = new Set((clients || []).map(c => c.id));

      // Get leaderboard settings for privacy
      const { data: settings, error: settingsError } = await supabase
        .from('client_leaderboard_settings')
        .select('client_id, leaderboard_visible, leaderboard_nickname')
        .in('client_id', clientIds.length > 0 ? clientIds : ['00000000-0000-0000-0000-000000000000']);

      if (settingsError) throw settingsError;

      const settingsMap = new Map(settings?.map(s => [s.client_id, s]) || []);

      // Build list with display names (only for non-archived clients)
      const challengers: AvailableChallenger[] = clientIds
        .filter(id => activeClientIds.has(id))
        .map(id => {
          const setting = settingsMap.get(id);
          const isVisible = setting?.leaderboard_visible === true;
          const realName = clientNameMap.get(id);
          
          // If visible, show nickname or real name. If hidden, show anonymous name
          let displayName: string;
          if (isVisible) {
            displayName = setting?.leaderboard_nickname || realName || getClientDisplayName(id, false, null);
          } else {
            displayName = getClientDisplayName(id, false, null);
          }
          
          return {
            client_id: id,
            display_name: displayName,
            is_anonymous: !isVisible,
          };
        });

      // Add trainer as challenger option
      // Find the trainer's client record (the one named "Trenér Radek" or similar)
      const { data: trainerClient } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', trainerId)
        .eq('is_archived', false)
        .limit(1)
        .maybeSingle();

      if (trainerClient && trainerClient.id !== clientId) {
        challengers.unshift({
          client_id: trainerClient.id,
          display_name: '⭐ Trenér',
          is_anonymous: false,
          is_trainer: true,
        });
      }

      // Sort: trainer first, then visible users, then anonymous alphabetically
      challengers.sort((a, b) => {
        if (a.is_trainer && !b.is_trainer) return -1;
        if (!a.is_trainer && b.is_trainer) return 1;
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
