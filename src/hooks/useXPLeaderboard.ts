import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export interface XPLeaderboardEntry {
  client_id: string;
  nickname: string;
  total_xp: number;
  level: number;
  rank: number;
  is_anonymous: boolean;
  gender: 'male' | 'female' | null;
}

export interface XPLeaderboardResult {
  leaderboard: XPLeaderboardEntry[];
  clientRank: number | null;
  clientPercentile: number | null;
  totalParticipants: number;
}

export function useXPLeaderboard() {
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useQuery({
    queryKey: ['xp-leaderboard', trainerId, clientId],
    queryFn: async (): Promise<XPLeaderboardResult> => {
      if (!trainerId || !clientId) {
        return { leaderboard: [], clientRank: null, clientPercentile: null, totalParticipants: 0 };
      }

      // Fetch all clients of this trainer with XP data
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          gender,
          client_leaderboard_settings (
            leaderboard_visible,
            leaderboard_nickname
          ),
          client_xp (
            total_xp,
            level
          )
        `)
        .eq('user_id', trainerId)
        .eq('is_archived', false);

      if (clientsError) throw clientsError;

      // Process and rank clients
      const entries: XPLeaderboardEntry[] = (clients || [])
        .filter(c => {
          // Include only visible clients or the current client
          const settings = c.client_leaderboard_settings?.[0];
          const isVisible = settings?.leaderboard_visible !== false;
          return isVisible || c.id === clientId;
        })
        .map(c => {
          const settings = c.client_leaderboard_settings?.[0];
          const xpData = c.client_xp?.[0];
          const isVisible = settings?.leaderboard_visible === true;
          
          // Only show nickname if client opted in AND has set a nickname
          // Never show real name - always use anonymous name as fallback
          let nickname: string;
          const hasNickname = isVisible && settings?.leaderboard_nickname;
          
          if (hasNickname) {
            nickname = settings.leaderboard_nickname!;
          } else {
            // Generate anonymous name
            const adjectives = ['Rychlý', 'Silný', 'Vytrvalý', 'Odhodlaný', 'Aktivní', 'Energický', 'Fit', 'Sportovní'];
            const animals = ['Lev', 'Orel', 'Vlk', 'Tygr', 'Medvěd', 'Sokol', 'Jelen', 'Panter'];
            const hash = c.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const adjective = adjectives[hash % adjectives.length];
            const animal = animals[(hash * 7) % animals.length];
            nickname = `${adjective} ${animal}`;
          }

          return {
            client_id: c.id,
            nickname,
            total_xp: xpData?.total_xp || 0,
            level: xpData?.level || 1,
            rank: 0, // Will be set after sorting
            is_anonymous: !hasNickname,
            gender: c.gender as 'male' | 'female' | null,
          };
        })
        .sort((a, b) => b.total_xp - a.total_xp);

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      // Find client's rank
      const clientEntry = entries.find(e => e.client_id === clientId);
      const clientRank = clientEntry?.rank || null;
      const totalParticipants = entries.length;
      const clientPercentile = clientRank && totalParticipants > 1
        ? ((totalParticipants - clientRank) / (totalParticipants - 1)) * 100
        : null;

      return {
        leaderboard: entries,
        clientRank,
        clientPercentile,
        totalParticipants,
      };
    },
    enabled: !!trainerId && !!clientId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
