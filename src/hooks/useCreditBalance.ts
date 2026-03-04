import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreditRealtime, useCreditRealtimeGroup } from './useCreditRealtime';
import { useCallback, useMemo } from 'react';

/**
 * Unified Credit Balance Hook (v2)
 * 
 * This hook provides a single source of truth for credit balance,
 * using the running balance from the latest transaction.
 * 
 * Features:
 * - O(1) balance lookup (reads balance_after from latest transaction)
 * - Real-time updates via WebSocket subscription
 * - Works for both individual clients and budget group members
 * - Used by both Admin UI and Client Portal
 */

export interface CreditBalanceData {
  /** Current balance (always from ledger) */
  balance: number;
  /** Whether client is part of a shared budget group */
  isShared: boolean;
  /** Group ID if part of a group */
  groupId: string | null;
  /** Group name if part of a group */
  groupName: string | null;
  /** Is balance zero or negative */
  isExhausted: boolean;
  /** Is balance negative */
  isNegative: boolean;
  /** Timestamp of last transaction */
  lastUpdated: string | null;
}

interface UseCreditBalanceOptions {
  /** Disable the query and realtime subscription */
  enabled?: boolean;
  /** Callback when balance changes via realtime */
  onBalanceChange?: (newBalance: number, delta: number) => void;
}

/**
 * Get credit balance for a client with real-time updates.
 * 
 * This is the PRIMARY hook for reading credit balance in the application.
 * It reads directly from the latest transaction's balance_after field,
 * ensuring O(1) performance and 100% accuracy.
 */
export function useCreditBalance(
  clientId: string | undefined,
  options: UseCreditBalanceOptions = {}
) {
  const { enabled = true, onBalanceChange } = options;
  const queryClient = useQueryClient();

  // Query for balance and group membership
  const query = useQuery({
    queryKey: ['credit_balance_v2', clientId],
    queryFn: async (): Promise<CreditBalanceData> => {
      if (!clientId) {
        return {
          balance: 0,
          isShared: false,
          groupId: null,
          groupName: null,
          isExhausted: true,
          isNegative: false,
          lastUpdated: null,
        };
      }

      // Check if client is in a budget group
      const { data: membership, error: membershipError } = await supabase
        .from('client_budget_members')
        .select('group_id, client_budget_groups(id, name)')
        .eq('client_id', clientId)
        .maybeSingle();

      if (membershipError) throw membershipError;

      const group = membership?.client_budget_groups as { id: string; name: string } | null;
      const groupId = group?.id ?? null;
      const isShared = !!groupId;

      let balance = 0;
      let lastUpdated: string | null = null;

      if (groupId) {
        // Always read from the ledger view (computed fresh, never stale)
        const { data: ledger, error: ledgerError } = await supabase
          .from('vw_group_ledger_balances')
          .select('ledger_balance')
          .eq('group_id', groupId)
          .maybeSingle();

        if (ledgerError) throw ledgerError;
        balance = ledger?.ledger_balance ?? 0;
      } else {
        // Always read from the ledger view (computed fresh, never stale)
        const { data: ledger, error: ledgerError } = await supabase
          .from('vw_client_ledger_balances')
          .select('ledger_balance')
          .eq('client_id', clientId)
          .maybeSingle();

        if (ledgerError) throw ledgerError;
        balance = ledger?.ledger_balance ?? 0;
      }

      return {
        balance,
        isShared,
        groupId,
        groupName: group?.name ?? null,
        isExhausted: balance <= 0,
        isNegative: balance < 0,
        lastUpdated,
      };
    },
    enabled: enabled && !!clientId,
    staleTime: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Get groupId from query result for realtime subscription
  const groupId = query.data?.groupId;

  // Subscribe to real-time updates for individual client
  useCreditRealtime(
    groupId ? undefined : clientId, // Only subscribe if not in a group
    {
      enabled: enabled && !!clientId && !groupId,
      onTransaction: (tx) => {
        if (tx.balance_after !== null && onBalanceChange) {
          const oldBalance = query.data?.balance ?? 0;
          onBalanceChange(tx.balance_after, tx.amount);
        }
        // Invalidate to refresh all data
        queryClient.invalidateQueries({ queryKey: ['credit_balance_v2', clientId] });
      },
    }
  );

  // Subscribe to real-time updates for group
  useCreditRealtimeGroup(
    groupId ?? undefined,
    {
      enabled: enabled && !!groupId,
      onTransaction: (tx) => {
        if (tx.balance_after !== null && onBalanceChange) {
          onBalanceChange(tx.balance_after, tx.amount);
        }
        queryClient.invalidateQueries({ queryKey: ['credit_balance_v2', clientId] });
      },
    }
  );

  // Memoized refetch function
  const refetch = useCallback(() => {
    return query.refetch();
  }, [query]);

  return {
    ...query.data,
    balance: query.data?.balance ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch,
  };
}

/**
 * Hook to get running balance directly from cache or latest transaction.
 * Lightweight version for components that only need the number.
 */
export function useCreditBalanceValue(clientId: string | undefined): number {
  const { balance } = useCreditBalance(clientId);
  return balance;
}

/**
 * Unified credit API operations.
 * Wraps the new RPC functions for consistent usage.
 */
export function useCreditOperationsV2() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback((clientId: string) => {
    queryClient.invalidateQueries({ queryKey: ['credit_balance_v2', clientId] });
    queryClient.invalidateQueries({ queryKey: ['credit_transactions', clientId] });
    queryClient.invalidateQueries({ queryKey: ['shared_budget_balance', clientId] });
    queryClient.invalidateQueries({ queryKey: ['clients'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['clients', clientId] });
    queryClient.invalidateQueries({ queryKey: ['pending_payments'] });
  }, [queryClient]);

  const addCredit = useCallback(async (
    clientId: string,
    amount: number,
    paymentMethod: string = 'cash',
    description?: string,
    idempotencyKey?: string
  ) => {
    const { data, error } = await supabase.rpc('rpc_credit_add', {
      p_client_id: clientId,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_description: description ?? null,
      p_idempotency_key: idempotencyKey ?? null,
    });

    if (error) throw error;
    
    const result = data as {
      success: boolean;
      transaction_id: string;
      balance: { new_balance: number; delta: number };
      message: string;
      error?: string;
    };

    if (!result.success) {
      throw new Error(result.error || 'Failed to add credit');
    }

    invalidateAll(clientId);
    return result;
  }, [invalidateAll]);

  const deductCredit = useCallback(async (
    clientId: string,
    amount: number,
    sourceType: 'training_session' | 'sales_order' | 'admin_panel' | 'system',
    sourceId?: string,
    description?: string,
    idempotencyKey?: string
  ) => {
    const { data, error } = await supabase.rpc('rpc_credit_deduct', {
      p_client_id: clientId,
      p_amount: amount,
      p_source_type: sourceType,
      p_source_id: sourceId ?? null,
      p_description: description ?? null,
      p_idempotency_key: idempotencyKey ?? null,
    });

    if (error) throw error;
    
    const result = data as {
      success: boolean;
      transaction_id: string;
      balance: { new_balance: number; delta: number };
      message: string;
      error?: string;
    };

    if (!result.success) {
      throw new Error(result.error || 'Failed to deduct credit');
    }

    invalidateAll(clientId);
    return result;
  }, [invalidateAll]);

  const refundTransaction = useCallback(async (
    originalTransactionId: string,
    reason: string = 'Vratka'
  ) => {
    const { data, error } = await supabase.rpc('rpc_credit_refund', {
      p_original_transaction_id: originalTransactionId,
      p_reason: reason,
    });

    if (error) throw error;
    
    const result = data as {
      success: boolean;
      transaction_id: string;
      balance: { entity_id: string; new_balance: number };
      error?: string;
    };

    if (!result.success) {
      throw new Error(result.error || 'Failed to refund transaction');
    }

    // Invalidate all credit queries
    queryClient.invalidateQueries({ queryKey: ['credit_balance_v2'] });
    queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
    queryClient.invalidateQueries({ queryKey: ['pending_payments'] });

    return result;
  }, [queryClient]);

  const transferCredit = useCallback(async (
    fromClientId: string,
    toClientId: string,
    amount: number,
    reason: string = 'Převod'
  ) => {
    const { data, error } = await supabase.rpc('rpc_credit_transfer', {
      p_from_client_id: fromClientId,
      p_to_client_id: toClientId,
      p_amount: amount,
      p_reason: reason,
    });

    if (error) throw error;
    
    const result = data as {
      success: boolean;
      from_balance: { new_balance: number };
      to_balance: { new_balance: number };
      error?: string;
    };

    if (!result.success) {
      throw new Error(result.error || 'Failed to transfer credit');
    }

    invalidateAll(fromClientId);
    invalidateAll(toClientId);

    return result;
  }, [invalidateAll]);

  return {
    addCredit,
    deductCredit,
    refundTransaction,
    transferCredit,
  };
}
