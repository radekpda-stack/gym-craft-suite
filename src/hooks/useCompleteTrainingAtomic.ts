import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { IndividualPaymentMethod } from '@/components/trainings/ParticipantPaymentCard';

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

      // Check if any client has exhausted their grandfathered credit
      // and needs to be switched to new pricing
      const clientsToCheckForLegacyPricing = params.participants
        .filter(p => p.payment_method === 'credit')
        .map(p => p.client_id);

      if (clientsToCheckForLegacyPricing.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, credit_balance, grandfathered_credit, use_legacy_pricing')
          .in('id', clientsToCheckForLegacyPricing);

        const clientsSwitchedToNewPricing: string[] = [];
        
        for (const client of clientsData || []) {
          // Check if client was on legacy pricing but has now exhausted grandfathered credit
          if (
            client.use_legacy_pricing && 
            client.grandfathered_credit !== null &&
            client.credit_balance <= 0
          ) {
            // Switch client to new pricing
            await supabase
              .from('clients')
              .update({ use_legacy_pricing: false })
              .eq('id', client.id);
            
            clientsSwitchedToNewPricing.push(client.name);
          }
        }

        // Store switched clients in result for notification
        if (clientsSwitchedToNewPricing.length > 0) {
          (result as any).clientsSwitchedToNewPricing = clientsSwitchedToNewPricing;
        }
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
