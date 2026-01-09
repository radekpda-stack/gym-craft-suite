import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { IndividualPaymentMethod } from '@/components/trainings/ParticipantPaymentCard';
import { getServiceIdForParticipants } from '@/hooks/useCreditLots';

interface ParticipantWithPayment {
  client_id: string;
  price_share: number;
  payment_method: IndividualPaymentMethod;
}

interface AtomicCompleteParams {
  sessionId: string;
  participants: ParticipantWithPayment[];
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
 * Atomický hook pro dokončení multi-client tréninku s individuálními platbami.
 * 
 * Každý účastník může mít svůj vlastní způsob platby.
 * Používá RPC funkci, která provede vše v jedné transakci.
 */
export function useCompleteTrainingAtomic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AtomicCompleteParams): Promise<RpcResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Není přihlášený uživatel");

      // Generate idempotency key ONCE per completion attempt
      const idempotencyKey = crypto.randomUUID();

      // For now, the RPC still uses a single payment method per call
      // We need to group participants by payment method and process each group
      // Or use the most common payment method for the session
      
      // Group participants by payment method
      const groupedByMethod = params.participants.reduce((acc, p) => {
        if (!acc[p.payment_method]) {
          acc[p.payment_method] = [];
        }
        acc[p.payment_method].push(p);
        return acc;
      }, {} as Record<IndividualPaymentMethod, ParticipantWithPayment[]>);

      // Determine primary payment method (the one used by most participants or credit if present)
      const methods = Object.keys(groupedByMethod) as IndividualPaymentMethod[];
      const primaryMethod = methods.includes('credit') ? 'credit' : methods[0] || 'cash';

      // Prepare participants for RPC - format as JSON-serializable array
      const rpcParticipants = params.participants.map(p => ({
        client_id: p.client_id,
        price_share: p.price_share,
        payment_method: p.payment_method,
      }));

      // Call RPC with the participants (RPC will handle individual payment methods)
      const { data, error } = await supabase.rpc('rpc_complete_training_session', {
        p_session_id: params.sessionId,
        p_trainer_id: user.id,
        p_idempotency_key: idempotencyKey,
        p_payment_method: primaryMethod,
        p_total_price: params.totalPrice,
        p_participants: rpcParticipants,
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

      // Update individual participant payment methods in training_participants table
      // This is done after RPC to store individual payment methods
      for (const participant of params.participants) {
        await supabase
          .from('training_participants')
          .update({ payment_method: participant.payment_method })
          .eq('training_session_id', params.sessionId)
          .eq('client_id', participant.client_id);
      }

      // NEW: Use FIFO credit lot deduction for credit payments
      const creditParticipants = params.participants.filter(p => p.payment_method === 'credit');
      const participantCount = params.participants.length;
      const serviceId = getServiceIdForParticipants(participantCount);
      
      const clientsSwitchedToNewPricing: string[] = [];
      const fifoDeductionErrors: string[] = [];

      for (const participant of creditParticipants) {
        // Call the FIFO deduction RPC for each credit participant
        const { data: fifoResult, error: fifoError } = await supabase.rpc('rpc_deduct_credit_fifo', {
          p_client_id: participant.client_id,
          p_training_session_id: params.sessionId,
          p_service_id: serviceId,
          p_user_id: user.id,
        });

        if (fifoError) {
          console.error('FIFO deduction error:', fifoError);
          fifoDeductionErrors.push(participant.client_id);
        } else if (fifoResult && typeof fifoResult === 'object' && 'success' in fifoResult && !fifoResult.success) {
          console.warn('FIFO deduction failed:', (fifoResult as any).error);
          fifoDeductionErrors.push(participant.client_id);
        }

        // Check if client's OLD lot is now depleted and they should switch to new pricing
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name, price_lock_mode, locked_price_list_id')
          .eq('id', participant.client_id)
          .single();

        if (clientData?.price_lock_mode === 'lock_old_until_depleted') {
          // Check if OLD lots are depleted
          const { data: oldLots } = await supabase
            .from('credit_lots')
            .select('balance_czk_remaining')
            .eq('client_id', participant.client_id)
            .eq('price_list_id', '00000000-0000-0000-0000-000000000001') // OLD
            .gt('balance_czk_remaining', 0);

          if (!oldLots || oldLots.length === 0) {
            // All OLD lots depleted - switch to new pricing
            await supabase
              .from('clients')
              .update({ 
                price_lock_mode: 'none',
                locked_price_list_id: null,
              })
              .eq('id', participant.client_id);
            
            clientsSwitchedToNewPricing.push(clientData.name);
          }
        }
      }

      // Store switched clients in result for notification
      if (clientsSwitchedToNewPricing.length > 0) {
        (result as any).clientsSwitchedToNewPricing = clientsSwitchedToNewPricing;
      }
      
      if (fifoDeductionErrors.length > 0) {
        (result as any).fifoDeductionErrors = fifoDeductionErrors;
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
      queryClient.invalidateQueries({ queryKey: ["unpaid-trainings"] });
      queryClient.invalidateQueries({ queryKey: ["today-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      queryClient.invalidateQueries({ queryKey: ["credit-signal-stats"] });
      queryClient.invalidateQueries({ queryKey: ["clients_price_status"] });
      
      // Invalidate credit lots queries
      queryClient.invalidateQueries({ queryKey: ["credit_lots"] });
      queryClient.invalidateQueries({ queryKey: ["credit_consumptions"] });
      queryClient.invalidateQueries({ queryKey: ["credit_summary"] });

      // Notify about clients switched to new pricing
      const switchedClients = (result as any).clientsSwitchedToNewPricing as string[] | undefined;
      if (switchedClients && switchedClients.length > 0) {
        toast({ 
          title: "Přechod na nové ceny",
          description: `${switchedClients.join(', ')} vyčerpal/a předplacený kredit a přechází na nové ceny.`,
          variant: "default",
          duration: 8000,
        });
      }
      
      // Warn about FIFO deduction errors
      const fifoErrors = (result as any).fifoDeductionErrors as string[] | undefined;
      if (fifoErrors && fifoErrors.length > 0) {
        toast({ 
          title: "Varování: Chyba při FIFO stržení",
          description: `U ${fifoErrors.length} klientů se nepodařilo správně strhnout kredit.`,
          variant: "destructive",
        });
      }
      
      if (result.idempotent) {
        toast({ 
          title: "Trénink již byl dokončen",
          description: "Žádné další změny nebyly provedeny.",
        });
      } else {
        const deductedCount = result.deductions?.filter(d => d.deducted).length || 0;
        const creditTotal = params.participants
          .filter(p => p.payment_method === 'credit')
          .reduce((sum, p) => sum + p.price_share, 0);
        
        if (creditTotal > 0) {
          toast({ 
            title: "Trénink dokončen",
            description: `Z kreditu odečteno: ${creditTotal} Kč`,
          });
        } else {
          toast({ 
            title: "Trénink dokončen",
            description: "Žádné kredity nebyly odečteny",
          });
        }
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
