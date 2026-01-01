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
 */
export function useCompleteTrainingAtomic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AtomicCompleteParams): Promise<RpcResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Není přihlášený uživatel");

      // Generate idempotency key ONCE per completion attempt
      const idempotencyKey = crypto.randomUUID();

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
    onSuccess: (result) => {
      // Invalidate all relevant queries atomically
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["training_session"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["training_participants"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      
      if (result.idempotent) {
        toast({ 
          title: "Trénink již byl dokončen",
          description: "Žádné další změny nebyly provedeny.",
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
