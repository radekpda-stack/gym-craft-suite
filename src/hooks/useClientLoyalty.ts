import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export interface LoyaltyBalance {
  client_id: string;
  points_balance: number;
  lifetime_points: number;
  updated_at: string;
}

export interface LoyaltyLedgerEntry {
  id: string;
  client_id: string;
  points: number;
  source_type: string;
  source_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

// LP Milestones for display
export const LP_MILESTONES = [
  { points: 100, name: 'Příznivec', icon: '⭐' },
  { points: 300, name: 'Supporter', icon: '🌟' },
  { points: 500, name: 'VIP', icon: '💎' },
  { points: 1000, name: 'Ambasador', icon: '👑' },
];

export function getNextMilestone(currentPoints: number) {
  for (const milestone of LP_MILESTONES) {
    if (currentPoints < milestone.points) {
      return {
        ...milestone,
        progress: (currentPoints / milestone.points) * 100,
        remaining: milestone.points - currentPoints,
      };
    }
  }
  return null; // All milestones achieved
}

export function getCurrentMilestone(lifetimePoints: number) {
  let current = null;
  for (const milestone of LP_MILESTONES) {
    if (lifetimePoints >= milestone.points) {
      current = milestone;
    }
  }
  return current;
}

export function useClientLoyalty(clientId?: string) {
  return useQuery({
    queryKey: ['client-loyalty', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('loyalty_balance')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      
      if (error) throw error;
      
      // Return default if no record
      if (!data) {
        return {
          client_id: clientId,
          points_balance: 0,
          lifetime_points: 0,
          updated_at: new Date().toISOString(),
        } as LoyaltyBalance;
      }
      
      return data as LoyaltyBalance;
    },
    enabled: !!clientId,
  });
}

export function useLoyaltyHistory(clientId?: string, limit = 20) {
  return useQuery({
    queryKey: ['loyalty-history', clientId, limit],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('loyalty_ledger')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as LoyaltyLedgerEntry[];
    },
    enabled: !!clientId,
  });
}

// Combined hook for portal usage
export function useMyLoyalty() {
  const { clientId } = useClientPortal();
  const loyalty = useClientLoyalty(clientId ?? undefined);
  const history = useLoyaltyHistory(clientId ?? undefined);
  
  return {
    loyalty: loyalty.data,
    history: history.data,
    isLoading: loyalty.isLoading || history.isLoading,
    error: loyalty.error || history.error,
  };
}
