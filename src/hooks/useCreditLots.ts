import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Price list UUIDs (defined in migration)
export const OLD_PRICE_LIST_ID = '00000000-0000-0000-0000-000000000001';
export const NEW_PRICE_LIST_ID = '00000000-0000-0000-0000-000000000002';

export interface CreditLot {
  id: string;
  client_id: string;
  price_list_id: string;
  purchased_at: string;
  balance_czk_original: number;
  balance_czk_remaining: number;
  source: 'purchase' | 'migration' | 'manual_adjustment';
  note: string | null;
  created_at: string;
  created_by: string | null;
  user_id: string;
  price_lists?: {
    id: string;
    name: string;
    effective_from: string;
  };
}

export interface CreditConsumption {
  id: string;
  client_id: string;
  training_session_id: string | null;
  lot_id: string;
  price_list_id: string;
  service_id: string;
  amount_czk: number;
  note: string | null;
  created_at: string;
  user_id: string;
  price_lists?: {
    name: string;
  };
  credit_lots?: {
    purchased_at: string;
  };
}

export interface CreditSummary {
  old_balance: number;
  new_balance: number;
  total_balance: number;
}

export interface DeductCreditResult {
  success: boolean;
  total_deducted?: number;
  consumptions?: Array<{
    lot_id: string;
    price_list_id: string;
    amount: number;
  }>;
  error?: string;
  required?: number;
  missing?: number;
}

export interface AddCreditLotResult {
  success: boolean;
  lot_id?: string;
  price_list_id?: string;
  amount?: number;
  error?: string;
}

export interface MigrateCreditResult {
  success: boolean;
  lot_id?: string;
  migrated?: number;
  price_list?: 'OLD' | 'NEW';
  error?: string;
  message?: string;
  existing_lots?: number;
}

/**
 * Get all credit lots for a client
 */
export function useClientCreditLots(clientId: string | undefined) {
  return useQuery({
    queryKey: ['credit_lots', clientId],
    queryFn: async (): Promise<CreditLot[]> => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('credit_lots')
        .select('*, price_lists(id, name, effective_from)')
        .eq('client_id', clientId)
        .order('purchased_at', { ascending: true });

      if (error) throw error;
      return data as CreditLot[];
    },
    enabled: !!clientId,
  });
}

/**
 * Get credit summary for a client (OLD vs NEW balance)
 */
export function useClientCreditSummary(clientId: string | undefined) {
  return useQuery({
    queryKey: ['credit_summary', clientId],
    queryFn: async (): Promise<CreditSummary | null> => {
      if (!clientId) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.rpc('rpc_get_client_credit_summary', {
        p_client_id: clientId,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data as unknown as CreditSummary;
    },
    enabled: !!clientId,
  });
}

/**
 * Get consumption history for a client
 */
export function useClientCreditConsumptions(clientId: string | undefined) {
  return useQuery({
    queryKey: ['credit_consumptions', clientId],
    queryFn: async (): Promise<CreditConsumption[]> => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('credit_consumptions')
        .select('*, price_lists(name), credit_lots(purchased_at)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CreditConsumption[];
    },
    enabled: !!clientId,
  });
}

/**
 * Add a new credit lot (for top-ups)
 */
export function useAddCreditLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      amountCzk, 
      source = 'purchase',
      note 
    }: { 
      clientId: string; 
      amountCzk: number; 
      source?: 'purchase' | 'manual_adjustment';
      note?: string;
    }): Promise<AddCreditLotResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Není přihlášený uživatel');

      const { data, error } = await supabase.rpc('rpc_add_credit_lot', {
        p_client_id: clientId,
        p_amount_czk: Math.round(amountCzk), // Ensure integer
        p_source: source,
        p_note: note || null,
        p_user_id: user.id,
      });

      if (error) throw error;
      
      // RPC returns {success: false, error: '...'} on failure
      const result = data as unknown as AddCreditLotResult;
      if (result && typeof result === 'object' && 'success' in result && result.success === false) {
        throw new Error((result as { error?: string }).error || 'Nepodařilo se přidat kredit');
      }
      
      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credit_lots', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['credit_summary', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit_transactions', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['shared_budget_balance'] });
      queryClient.invalidateQueries({ queryKey: ['shared_budget_balance', variables.clientId] });
    },
    onError: (error) => {
      // Do not toast here – UnifiedCreditModal already shows a toast.
      // Keeping the toast in both places causes duplicated error messages.
      const err = error as any;
      console.error('Error adding credit lot:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        raw: error,
      });
    },
  });
}

/**
 * Deduct credit using FIFO from lots
 */
export function useDeductCreditFifo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      trainingSessionId, 
      serviceId 
    }: { 
      clientId: string; 
      trainingSessionId: string;
      serviceId: 'PT_1' | 'PT_2' | 'PT_3P';
    }): Promise<DeductCreditResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Není přihlášený uživatel');

      const { data, error } = await supabase.rpc('rpc_deduct_credit_fifo', {
        p_client_id: clientId,
        p_training_session_id: trainingSessionId,
        p_service_id: serviceId,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data as unknown as DeductCreditResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credit_lots', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['credit_summary', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['credit_consumptions', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit_transactions', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['shared_budget_balance', variables.clientId] });
    },
  });
}

/**
 * Migrate existing credit to a lot
 */
export function useMigrateCreditToLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      useOldPriceList 
    }: { 
      clientId: string; 
      useOldPriceList: boolean;
    }): Promise<MigrateCreditResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Není přihlášený uživatel');

      const { data, error } = await supabase.rpc('rpc_migrate_credit_to_lot', {
        p_client_id: clientId,
        p_use_old_price_list: useOldPriceList,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data as unknown as MigrateCreditResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credit_lots', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['credit_summary', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients_price_status'] });
    },
  });
}

/**
 * Check if client has any credit lots
 */
export function useHasCreditLots(clientId: string | undefined) {
  const { data: lots } = useClientCreditLots(clientId);
  return (lots?.length || 0) > 0;
}

/**
 * Get service ID based on participant count
 */
export function getServiceIdForParticipants(participantCount: number): 'PT_1' | 'PT_2' | 'PT_3P' {
  if (participantCount >= 3) return 'PT_3P';
  if (participantCount === 2) return 'PT_2';
  return 'PT_1';
}
