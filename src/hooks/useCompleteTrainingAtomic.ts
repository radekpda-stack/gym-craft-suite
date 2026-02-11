import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { IndividualPaymentMethod } from '@/components/trainings/ParticipantPaymentCard';
import { getServiceIdForParticipants } from '@/hooks/useCreditLots';
import { checkTrainingStreak } from '@/components/notifications/SmartNotificationEngine';
import { syncWorkoutEntriesToStats } from '@/hooks/useWorkoutEntries';

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

      // Determine primary payment method for session-level payment_status
      // IMPORTANT: If ANY participant pays cash, session should be 'pending' to require confirmation
      // This ensures the orange "confirm payment" button appears
      const methods = Object.keys(groupedByMethod) as IndividualPaymentMethod[];
      const hasCashPayment = methods.includes('cash');
      const primaryMethod = hasCashPayment ? 'cash' : (methods.includes('credit') ? 'credit' : methods[0] || 'cash');

      // Prepare participants for RPC - format as JSON-serializable array
      const rpcParticipants = params.participants.map(p => ({
        client_id: p.client_id,
        price_share: p.price_share,
        payment_method: p.payment_method,
      }));

      // Serialize trainer summary to JSON string for the RPC
      const trainerSummaryJson = params.trainerSummary 
        ? JSON.stringify(params.trainerSummary) 
        : null;

      // Call RPC with the participants (RPC will handle individual payment methods)
      const { data, error } = await supabase.rpc('rpc_complete_training_session', {
        p_session_id: params.sessionId,
        p_trainer_id: user.id,
        p_idempotency_key: idempotencyKey,
        p_payment_method: primaryMethod,
        p_total_price: params.totalPrice,
        p_participants: rpcParticipants,
        p_trainer_summary: trainerSummaryJson,
        p_subjective_rating: params.subjectiveRating || null,
        p_notes: params.notes || null,
      });

      if (error) {
        // Surface actionable diagnostics (message + code + details) for faster debugging.
        const details = [
          error.message,
          (error as any).code ? `code=${(error as any).code}` : null,
          (error as any).details ? `details=${(error as any).details}` : null,
          (error as any).hint ? `hint=${(error as any).hint}` : null,
        ].filter(Boolean).join(' | ');

        console.error('rpc_complete_training_session failed:', {
          sessionId: params.sessionId,
          primaryMethod,
          totalPrice: params.totalPrice,
          participantCount: params.participants.length,
          error,
        });

        throw new Error(details || 'Chyba při dokončování tréninku');
      }

      const result = data as unknown as RpcResult;
      
      if (!result.success && !result.idempotent) {
        throw new Error(result.error || 'Nepodařilo se dokončit trénink');
      }

      // ── FAST PATH: Return result immediately, run post-steps in background ──
      // All operations below are best-effort and must NOT block the UI.

      const backgroundTasks = async () => {
        try {
          // 1. Update participant payment methods in parallel
          await Promise.all(params.participants.map(async (participant) => {
            const { error: updateError } = await supabase
              .from('training_participants')
              .update({ payment_method: participant.payment_method })
              .eq('training_session_id', params.sessionId)
              .eq('client_id', participant.client_id);

            if (updateError) {
              console.warn('Post-RPC participant update failed:', participant.client_id, updateError.message);
            }
          }));

          // 2. FIFO credit deductions + price lock checks in parallel
          const creditParticipants = params.participants.filter(p => p.payment_method === 'credit');
          const participantCount = params.participants.length;
          const serviceId = getServiceIdForParticipants(participantCount);

          await Promise.all(creditParticipants.map(async (participant) => {
            // Check if client has credit lots
            const { data: clientLots } = await supabase
              .from('credit_lots')
              .select('id')
              .eq('client_id', participant.client_id)
              .eq('user_id', user.id)
              .gt('balance_czk_remaining', 0)
              .limit(1);

            if (clientLots && clientLots.length > 0) {
              const { error: fifoError } = await supabase.rpc('rpc_deduct_credit_fifo', {
                p_client_id: participant.client_id,
                p_training_session_id: params.sessionId,
                p_service_id: serviceId,
                p_user_id: user.id,
              });
              if (fifoError) console.error('FIFO deduction error:', fifoError);
            }

            // Check price lock mode
            const { data: clientData } = await supabase
              .from('clients')
              .select('id, name, price_lock_mode, locked_price_list_id')
              .eq('id', participant.client_id)
              .single();

            if (clientData?.price_lock_mode === 'lock_old_until_depleted') {
              const { data: oldLots } = await supabase
                .from('credit_lots')
                .select('balance_czk_remaining')
                .eq('client_id', participant.client_id)
                .eq('price_list_id', '00000000-0000-0000-0000-000000000001')
                .gt('balance_czk_remaining', 0);

              if (!oldLots || oldLots.length === 0) {
                await supabase
                  .from('clients')
                  .update({ price_lock_mode: 'none', locked_price_list_id: null })
                  .eq('id', participant.client_id);
              }
            }
          }));

          // 3. Training streak checks + workout sync in parallel
          await Promise.all([
            // Streak checks
            ...params.participants.map(async (participant) => {
              const { data: clientData } = await supabase
                .from('clients')
                .select('name')
                .eq('id', participant.client_id)
                .single();
              if (clientData?.name) {
                checkTrainingStreak(user.id, participant.client_id, clientData.name);
              }
            }),
            // Workout entries sync
            (async () => {
              const { data: sessionData } = await supabase
                .from('training_sessions')
                .select('client_id, date')
                .eq('id', params.sessionId)
                .single();
              if (sessionData) {
                await syncWorkoutEntriesToStats({
                  trainingSessionId: params.sessionId,
                  clientId: sessionData.client_id,
                  trainingDate: sessionData.date,
                });
              }
            })(),
          ]);
        } catch (bgError) {
          console.warn('Background post-completion tasks error:', bgError);
        }
      };

      // Fire and forget – don't await
      backgroundTasks();
      
      return result;
    },
    onSuccess: (result, params) => {
      // Invalidate per-participant caches
      for (const participant of params.participants) {
        queryClient.invalidateQueries({ queryKey: ["clients", participant.client_id], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ["credit_transactions", participant.client_id], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ["shared_budget_balance", participant.client_id], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ["client-exercise-prs", participant.client_id], refetchType: 'all' });
      }
      
      // Batch invalidate global queries
      const globalKeys = [
        "training_sessions", "training_session", "clients", "credit_transactions",
        "budget_groups", "training_participants", "shared_budget", "unpaid-trainings",
        "today-alerts", "shared_budget_balance", "credit-signal-stats", "clients_price_status",
        "credit_lots", "credit_consumptions", "credit_summary", "client-exercise-prs",
      ];
      for (const key of globalKeys) {
        queryClient.invalidateQueries({ queryKey: [key], refetchType: 'all' });
      }
      
      if (result.idempotent) {
        toast({ title: "Trénink již byl dokončen", description: "Žádné další změny nebyly provedeny." });
      } else {
        const creditTotal = params.participants
          .filter(p => p.payment_method === 'credit')
          .reduce((sum, p) => sum + p.price_share, 0);
        
        toast({ 
          title: "Trénink dokončen",
          description: creditTotal > 0 ? `Z kreditu odečteno: ${creditTotal} Kč` : "Žádné kredity nebyly odečteny",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Complete training atomic error:', error);
      toast({
        title: "Chyba při dokončování",
        description: error.message || 'Neznámá chyba',
        variant: "destructive",
      });
    },
  });
}
