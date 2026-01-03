import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AtomicCompleteParams {
  sessionId: string;
  participants: Array<{ client_id: string; price_share: number }>;
  paymentMethod: 'credit' | 'cash' | 'card' | 'bank' | 'pending';
  totalPrice: number;
  trainerSummary?: {
    trainer_went_well?: string;
    trainer_problems?: string;
    trainer_recommendations?: string;
    pain_reported?: boolean;
    pain_notes?: string;
  };
  subjectiveRating?: number | null;
  notes?: string;
  // Hybrid payment support
  usePartialCredit?: boolean;
  partialCreditAmount?: number;
  partialPaymentMethod?: 'cash' | 'card' | 'bank' | 'pending';
  partialAmountPending?: number; // Amount to be paid later
}

interface RpcResult {
  success: boolean;
  idempotent?: boolean;
  message?: string;
  error?: string;
  session_id?: string;
  participant_count?: number;
  total_price?: number;
  deductions?: Array<{
    client_id: string;
    price_share: number;
    deducted: boolean;
    new_balance?: number;
    group_id?: string;
    reason?: string;
  }>;
}

/**
 * Atomický hook pro dokončení multi-client tréninku.
 * Používá RPC funkci, která provede vše v jedné transakci:
 * - Zamkne session row
 * - Ověří idempotenci
 * - Uloží účastníky
 * - Vytvoří credit transakce
 * - Odečte kredity
 * - Aktualizuje session status
 * - Vytvoří audit log
 * 
 * Podporuje hybridní platbu (částečný kredit + doplatek)
 */
export function useCompleteTrainingAtomic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AtomicCompleteParams): Promise<RpcResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Není přihlášený uživatel");

      // Generate idempotency key ONCE per completion attempt
      const idempotencyKey = crypto.randomUUID();

      // If using partial credit, we need to handle it specially
      if (params.usePartialCredit && params.partialCreditAmount && params.partialCreditAmount > 0) {
        // First, call RPC with credit payment for the partial amount
        const creditParticipants = params.participants.map(p => ({
          client_id: p.client_id,
          price_share: Math.min(params.partialCreditAmount!, p.price_share),
        }));

        const { data, error } = await supabase.rpc('rpc_complete_training_session', {
          p_session_id: params.sessionId,
          p_trainer_id: user.id,
          p_idempotency_key: idempotencyKey,
          p_payment_method: 'credit', // Credit part
          p_total_price: params.partialCreditAmount,
          p_participants: creditParticipants,
          p_trainer_summary: params.trainerSummary || null,
          p_subjective_rating: params.subjectiveRating || null,
          p_notes: params.notes || null,
        });

        if (error) {
          console.error('RPC error:', error);
          throw new Error(error.message || 'Chyba při dokončování tréninku');
        }

        const result = data as unknown as RpcResult;
        
        if (!result.success && !result.idempotent) {
          throw new Error(result.error || 'Nepodařilo se dokončit trénink');
        }

        // Now update the payment status based on partial payment method
        const remainingAmount = params.totalPrice - (params.partialCreditAmount || 0);
        
        if (remainingAmount > 0) {
          // Determine final payment status
          const paymentStatus = params.partialPaymentMethod === 'pending' 
            ? 'pending' 
            : params.partialPaymentMethod === 'cash' 
              ? 'paid_cash'
              : params.partialPaymentMethod === 'card'
                ? 'paid_card'
                : params.partialPaymentMethod === 'bank'
                  ? 'paid_bank'
                  : 'pending';

          // Update training with partial payment info
          const { error: updateError } = await supabase
            .from('training_sessions')
            .update({
              payment_status: paymentStatus,
              payment_method: params.partialPaymentMethod === 'pending' ? null : params.partialPaymentMethod,
              // Store pending amount in notes or a custom field if "later"
              notes: params.partialPaymentMethod === 'pending' 
                ? `${params.notes || ''}\n💰 Nedoplatek: ${remainingAmount} Kč (z kreditu: ${params.partialCreditAmount} Kč)`.trim()
                : params.notes || null,
            })
            .eq('id', params.sessionId);

          if (updateError) {
            console.error('Update error:', updateError);
          }
        }

        return result;
      }

      // Standard flow (no partial credit)
      const { data, error } = await supabase.rpc('rpc_complete_training_session', {
        p_session_id: params.sessionId,
        p_trainer_id: user.id,
        p_idempotency_key: idempotencyKey,
        p_payment_method: params.paymentMethod,
        p_total_price: params.totalPrice,
        p_participants: params.participants,
        p_trainer_summary: params.trainerSummary || null,
        p_subjective_rating: params.subjectiveRating || null,
        p_notes: params.notes || null,
      });

      if (error) {
        console.error('RPC error:', error);
        throw new Error(error.message || 'Chyba při dokončování tréninku');
      }

      const result = data as unknown as RpcResult;
      
      if (!result.success && !result.idempotent) {
        throw new Error(result.error || 'Nepodařilo se dokončit trénink');
      }
      
      return result;
    },
    onSuccess: (result, params) => {
      // Invalidate all relevant queries atomically
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["training_session"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["training_participants"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-trainings"] });
      queryClient.invalidateQueries({ queryKey: ["today-alerts"] });
      
      if (result.idempotent) {
        toast({ 
          title: "Trénink již byl dokončen",
          description: "Žádné další změny nebyly provedeny.",
        });
      } else if (params.usePartialCredit) {
        const remainingAmount = params.totalPrice - (params.partialCreditAmount || 0);
        const isPending = params.partialPaymentMethod === 'pending';
        
        toast({ 
          title: "Trénink dokončen",
          description: isPending 
            ? `Z kreditu: ${params.partialCreditAmount} Kč, zbývá doplatit: ${remainingAmount} Kč`
            : `Z kreditu: ${params.partialCreditAmount} Kč, doplaceno: ${remainingAmount} Kč`,
        });
      } else {
        const deductedCount = result.deductions?.filter(d => d.deducted).length || 0;
        toast({ 
          title: "Trénink dokončen",
          description: deductedCount > 0 
            ? `Odečteno od ${deductedCount} účastníků`
            : "Žádné kredity nebyly odečteny",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Complete training atomic error:', error);
      toast({
        title: "Chyba při dokončování",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
