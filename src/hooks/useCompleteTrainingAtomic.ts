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

      // Update individual participant payment methods in training_participants table.
      // IMPORTANT: This is a best-effort post-step; it must NOT fail the whole completion.
      const postUpdateErrors: Array<{ client_id: string; message: string }> = [];
      for (const participant of params.participants) {
        const { error: updateError } = await supabase
          .from('training_participants')
          .update({ payment_method: participant.payment_method })
          .eq('training_session_id', params.sessionId)
          .eq('client_id', participant.client_id);

        if (updateError) {
          console.warn('Post-RPC participant update failed:', {
            sessionId: params.sessionId,
            clientId: participant.client_id,
            updateError,
          });
          postUpdateErrors.push({
            client_id: participant.client_id,
            message: updateError.message || 'Unknown error',
          });
        }
      }

      if (postUpdateErrors.length > 0) {
        (result as any).postUpdateErrors = postUpdateErrors;
      }

      // NEW: Use FIFO credit lot deduction for credit payments (only if client has credit lots)
      const creditParticipants = params.participants.filter(p => p.payment_method === 'credit');
      const participantCount = params.participants.length;
      const serviceId = getServiceIdForParticipants(participantCount);
      
      const clientsSwitchedToNewPricing: string[] = [];
      const fifoDeductionErrors: string[] = [];

      for (const participant of creditParticipants) {
        // First check if client has any credit lots - only use FIFO for clients with lots
        const { data: clientLots } = await supabase
          .from('credit_lots')
          .select('id')
          .eq('client_id', participant.client_id)
          .eq('user_id', user.id)
          .gt('balance_czk_remaining', 0)
          .limit(1);

        // Only call FIFO deduction if client has credit lots
        if (clientLots && clientLots.length > 0) {
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
        }
        // If client has no lots, credit deduction was already handled by main RPC

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
      
      // Check for training milestones for each participant
      for (const participant of params.participants) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('name')
          .eq('id', participant.client_id)
          .single();
        
        if (clientData?.name) {
          checkTrainingStreak(user.id, participant.client_id, clientData.name);
        }
      }

      // Auto-sync workout entries to exercise_entries for all participants
      // This ensures exercise history is recorded for each participant individually
      try {
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
      } catch (syncError) {
        console.warn('Auto-sync workout entries failed:', syncError);
        // Don't fail the completion - sync can be done manually
      }
      
      return result;
    },
    onSuccess: (result, params) => {
      // CRITICAL: Granulární invalidace pro každého účastníka tréninku
      // Toto zajistí okamžitou aktualizaci zůstatků a PRs v UI
      for (const participant of params.participants) {
        queryClient.invalidateQueries({ 
          queryKey: ["clients", participant.client_id],
          refetchType: 'all',
        });
        queryClient.invalidateQueries({ 
          queryKey: ["credit_transactions", participant.client_id],
          refetchType: 'all',
        });
        queryClient.invalidateQueries({ 
          queryKey: ["shared_budget_balance", participant.client_id],
          refetchType: 'all',
        });
        // Invalidovat PRs pro každého účastníka
        queryClient.invalidateQueries({ 
          queryKey: ["client-exercise-prs", participant.client_id],
          refetchType: 'all',
        });
      }
      
      // Invalidate all relevant queries atomically with refetchType
      queryClient.invalidateQueries({ queryKey: ["training_sessions"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["training_session"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["clients"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["training_participants"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["shared_budget"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["unpaid-trainings"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["today-alerts"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["credit-signal-stats"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["clients_price_status"], refetchType: 'all' });
      
      // Invalidate credit lots queries
      queryClient.invalidateQueries({ queryKey: ["credit_lots"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["credit_consumptions"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["credit_summary"], refetchType: 'all' });
      
      // Globální invalidace PRs
      queryClient.invalidateQueries({ queryKey: ["client-exercise-prs"], refetchType: 'all' });

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

      // Warn about post-RPC participant update issues (non-blocking)
      const postUpdateErrors = (result as any).postUpdateErrors as Array<{ client_id: string; message: string }> | undefined;
      if (postUpdateErrors && postUpdateErrors.length > 0) {
        toast({
          title: 'Trénink dokončen (s varováním)',
          description: `Nepodařilo se uložit platbu u ${postUpdateErrors.length} účastníků.`,
          variant: 'destructive',
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
        description: error.message || 'Neznámá chyba',
        variant: "destructive",
      });
    },
  });
}
