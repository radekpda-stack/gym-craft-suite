import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientLoyalty } from '@/hooks/useClientLoyalty';
import { toast } from 'sonner';

export function useRedeemReward() {
  const { clientId, clientAccount } = useClientPortal();
  const { data: loyalty } = useClientLoyalty(clientId ?? undefined);
  const queryClient = useQueryClient();

  const redeemMutation = useMutation({
    mutationFn: async ({ rewardId, lpCost, rewardName }: { 
      rewardId: string; 
      lpCost: number;
      rewardName: string;
    }) => {
      if (!clientId || !clientAccount?.trainer_id) {
        throw new Error('Not authenticated');
      }

      const currentBalance = loyalty?.points_balance ?? 0;
      if (currentBalance < lpCost) {
        throw new Error('Nedostatek věrnostních bodů');
      }

      // Create redemption record
      const { data: redemption, error: redemptionError } = await supabase
        .from('reward_redemptions')
        .insert({
          client_id: clientId,
          reward_id: rewardId,
          trainer_id: clientAccount.trainer_id,
          lp_spent: lpCost,
          status: 'pending',
        })
        .select()
        .single();

      if (redemptionError) throw redemptionError;

      // Deduct LP from balance
      const { error: balanceError } = await supabase
        .from('loyalty_balance')
        .update({
          points_balance: currentBalance - lpCost,
        })
        .eq('client_id', clientId);

      if (balanceError) {
        // Rollback redemption if balance update fails
        await supabase.from('reward_redemptions').delete().eq('id', redemption.id);
        throw balanceError;
      }

      // Log to ledger
      await supabase.from('loyalty_ledger').insert({
        client_id: clientId,
        points: -lpCost,
        source_type: 'reward_redemption',
        source_id: redemption.id,
        meta: { reward_name: rewardName },
      });

      // Increment quantity_redeemed on the reward
      const { data: rewardData } = await supabase
        .from('trainer_rewards')
        .select('quantity_redeemed')
        .eq('id', rewardId)
        .single();

      if (rewardData) {
        await supabase
          .from('trainer_rewards')
          .update({ quantity_redeemed: (rewardData.quantity_redeemed || 0) + 1 })
          .eq('id', rewardId);
      }

      // Create notification for trainer about the redemption
      // (trainer will see this in their dashboard)

      return redemption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-loyalty'] });
      queryClient.invalidateQueries({ queryKey: ['my-redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['available-rewards'] });
      toast.success('Odměna úspěšně vyměněna! Trenér bude informován.');
    },
    onError: (error: Error) => {
      console.error('Error redeeming reward:', error);
      toast.error(error.message || 'Nepodařilo se vyměnit odměnu');
    },
  });

  return {
    redeemReward: redeemMutation.mutate,
    isRedeeming: redeemMutation.isPending,
    canAfford: (lpCost: number) => (loyalty?.points_balance ?? 0) >= lpCost,
  };
}
