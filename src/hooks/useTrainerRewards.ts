import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { toast } from 'sonner';

export interface TrainerReward {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  lp_cost: number;
  icon_key: string;
  is_active: boolean;
  quantity_available: number | null;
  quantity_redeemed: number;
  valid_from: string | null;
  valid_until: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface RewardRedemption {
  id: string;
  client_id: string;
  reward_id: string;
  trainer_id: string;
  lp_spent: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  redeemed_at: string;
  fulfilled_at: string | null;
  notes: string | null;
  reward?: TrainerReward;
}

// Hook for trainers to manage their rewards
export function useTrainerRewardsManagement(trainerId?: string) {
  const queryClient = useQueryClient();

  const rewardsQuery = useQuery({
    queryKey: ['trainer-rewards', trainerId],
    queryFn: async (): Promise<TrainerReward[]> => {
      if (!trainerId) return [];

      const { data, error } = await supabase
        .from('trainer_rewards')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as TrainerReward[];
    },
    enabled: !!trainerId,
  });

  const createReward = useMutation({
    mutationFn: async (reward: Partial<TrainerReward>) => {
      const { data, error } = await supabase
        .from('trainer_rewards')
        .insert({
          trainer_id: trainerId,
          name: reward.name,
          description: reward.description,
          lp_cost: reward.lp_cost,
          icon_key: reward.icon_key || 'gift',
          is_active: reward.is_active ?? true,
          quantity_available: reward.quantity_available,
          valid_from: reward.valid_from,
          valid_until: reward.valid_until,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-rewards', trainerId] });
      toast.success('Odměna vytvořena');
    },
    onError: (error) => {
      console.error('Error creating reward:', error);
      toast.error('Nepodařilo se vytvořit odměnu');
    },
  });

  const updateReward = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainerReward> & { id: string }) => {
      const { data, error } = await supabase
        .from('trainer_rewards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-rewards', trainerId] });
      toast.success('Odměna aktualizována');
    },
    onError: (error) => {
      console.error('Error updating reward:', error);
      toast.error('Nepodařilo se aktualizovat odměnu');
    },
  });

  const deleteReward = useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase
        .from('trainer_rewards')
        .delete()
        .eq('id', rewardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-rewards', trainerId] });
      toast.success('Odměna smazána');
    },
    onError: (error) => {
      console.error('Error deleting reward:', error);
      toast.error('Nepodařilo se smazat odměnu');
    },
  });

  return {
    rewards: rewardsQuery.data ?? [],
    isLoading: rewardsQuery.isLoading,
    createReward,
    updateReward,
    deleteReward,
  };
}

// Hook for clients to view available rewards from their trainer
export function useAvailableRewards() {
  const { clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useQuery({
    queryKey: ['available-rewards', trainerId],
    queryFn: async (): Promise<TrainerReward[]> => {
      if (!trainerId) return [];

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('trainer_rewards')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('is_active', true)
        .or(`valid_from.is.null,valid_from.lte.${now}`)
        .or(`valid_until.is.null,valid_until.gte.${now}`)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Filter out rewards that have reached their quantity limit
      return ((data ?? []) as TrainerReward[]).filter(reward => {
        if (reward.quantity_available === null) return true;
        return reward.quantity_redeemed < reward.quantity_available;
      });
    },
    enabled: !!trainerId,
  });
}

// Hook for clients to view their redemption history
export function useMyRedemptions() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['my-redemptions', clientId],
    queryFn: async (): Promise<RewardRedemption[]> => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('reward_redemptions')
        .select(`
          *,
          reward:trainer_rewards(*)
        `)
        .eq('client_id', clientId)
        .order('redeemed_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as RewardRedemption[];
    },
    enabled: !!clientId,
  });
}

// Hook for trainers to view pending redemptions
export function usePendingRedemptions(trainerId?: string) {
  const queryClient = useQueryClient();

  const redemptionsQuery = useQuery({
    queryKey: ['pending-redemptions', trainerId],
    queryFn: async () => {
      if (!trainerId) return [];

      const { data, error } = await supabase
        .from('reward_redemptions')
        .select(`
          *,
          reward:trainer_rewards(*),
          client:clients(id, name, email)
        `)
        .eq('trainer_id', trainerId)
        .eq('status', 'pending')
        .order('redeemed_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!trainerId,
  });

  const fulfillRedemption = useMutation({
    mutationFn: async ({ redemptionId, notes }: { redemptionId: string; notes?: string }) => {
      const { error } = await supabase
        .from('reward_redemptions')
        .update({
          status: 'fulfilled',
          fulfilled_at: new Date().toISOString(),
          fulfilled_by: trainerId,
          notes,
        })
        .eq('id', redemptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-redemptions', trainerId] });
      toast.success('Odměna označena jako splněná');
    },
  });

  const cancelRedemption = useMutation({
    mutationFn: async ({ redemptionId, notes }: { redemptionId: string; notes?: string }) => {
      // Get the redemption details first
      const { data: redemption, error: fetchError } = await supabase
        .from('reward_redemptions')
        .select('lp_spent, client_id')
        .eq('id', redemptionId)
        .single();

      if (fetchError) throw fetchError;

      // Cancel the redemption
      const { error: updateError } = await supabase
        .from('reward_redemptions')
        .update({
          status: 'cancelled',
          notes,
        })
        .eq('id', redemptionId);

      if (updateError) throw updateError;

      // Get current balance and return LP
      const { data: balanceData } = await supabase
        .from('loyalty_balance')
        .select('points_balance')
        .eq('client_id', redemption.client_id)
        .single();

      if (balanceData) {
        await supabase
          .from('loyalty_balance')
          .update({
            points_balance: balanceData.points_balance + redemption.lp_spent,
          })
          .eq('client_id', redemption.client_id);
      }

      // Log the refund in ledger
      await supabase.from('loyalty_ledger').insert({
        client_id: redemption.client_id,
        points: redemption.lp_spent,
        source_type: 'reward_cancelled',
        source_id: redemptionId,
        meta: { description: 'Vrácení bodů za zrušenou výměnu' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-redemptions', trainerId] });
      toast.success('Výměna zrušena, body vráceny');
    },
  });

  return {
    redemptions: redemptionsQuery.data ?? [],
    isLoading: redemptionsQuery.isLoading,
    fulfillRedemption,
    cancelRedemption,
  };
}
