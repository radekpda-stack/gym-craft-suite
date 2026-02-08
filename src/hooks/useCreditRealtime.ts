import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

/**
 * Real-time credit transaction subscription hook.
 * 
 * This hook subscribes to credit_transactions INSERT events via WebSocket
 * and immediately updates the React Query cache, providing instant UI updates
 * without polling or refetching.
 * 
 * The balance is read directly from `balance_after` field (running balance),
 * eliminating the need to recalculate sums.
 */

interface CreditTransaction {
  id: string;
  client_id: string;
  amount: number;
  type: string;
  description: string | null;
  payment_method: string | null;
  created_at: string;
  group_id: string | null;
  balance_after: number | null;
  source_type: string | null;
  source_id: string | null;
}

interface UseCreditRealtimeOptions {
  /** Called when a new transaction is received */
  onTransaction?: (tx: CreditTransaction) => void;
  /** Enable/disable the subscription */
  enabled?: boolean;
  /** Show toast notifications for balance changes */
  showNotifications?: boolean;
}

/**
 * Subscribe to real-time credit transaction updates for a specific client.
 * Updates React Query cache immediately when new transactions arrive.
 */
export function useCreditRealtime(
  clientId: string | undefined,
  options: UseCreditRealtimeOptions = {}
) {
  const { onTransaction, enabled = true, showNotifications = false } = options;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTxIdRef = useRef<string | null>(null);

  const handleNewTransaction = useCallback((payload: { new: CreditTransaction }) => {
    const newTx = payload.new;
    
    // Prevent duplicate processing
    if (lastTxIdRef.current === newTx.id) return;
    lastTxIdRef.current = newTx.id;
    
    // Update transactions list cache (prepend new transaction)
    queryClient.setQueryData(
      ['credit_transactions', clientId],
      (old: CreditTransaction[] | undefined) => {
        if (!old) return [newTx];
        // Avoid duplicates
        if (old.some(tx => tx.id === newTx.id)) return old;
        return [newTx, ...old];
      }
    );

    // Update balance cache directly from balance_after (running balance)
    if (newTx.balance_after !== null) {
      queryClient.setQueryData(
        ['shared_budget_balance', clientId],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            sharedBalance: newTx.balance_after,
            displayBalance: newTx.balance_after,
            isExhausted: (newTx.balance_after ?? 0) <= 0,
            isNegative: (newTx.balance_after ?? 0) < 0,
          };
        }
      );

      // Also update the unified credit_balance key
      queryClient.setQueryData(
        ['credit_balance', clientId],
        newTx.balance_after
      );
      
      // Update v2 balance cache
      queryClient.setQueryData(
        ['credit_balance_v2', clientId],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            balance: newTx.balance_after,
            isExhausted: (newTx.balance_after ?? 0) <= 0,
            isNegative: (newTx.balance_after ?? 0) < 0,
            lastUpdated: newTx.created_at,
          };
        }
      );
      
      // Show notification for external balance changes
      if (showNotifications && newTx.amount !== 0) {
        const isCredit = newTx.amount > 0;
        toast({
          title: isCredit ? '💰 Kredit navýšen' : '📉 Kredit odečten',
          description: `${Math.abs(newTx.amount).toLocaleString('cs-CZ')} Kč${newTx.description ? ` - ${newTx.description}` : ''}`,
          variant: isCredit ? 'default' : 'default',
        });
      }
    }

    // Invalidate related queries for full consistency
    queryClient.invalidateQueries({ queryKey: ['clients', clientId] });
    queryClient.invalidateQueries({ queryKey: ['pending_payments'] });

    // Call optional callback
    onTransaction?.(newTx);
  }, [clientId, queryClient, onTransaction, showNotifications]);

  useEffect(() => {
    if (!clientId || !enabled) return;

    // Create unique channel name
    const channelName = `credit-realtime:${clientId}`;

    // Subscribe to INSERT events for this client
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'credit_transactions',
          filter: `client_id=eq.${clientId}`,
        },
        handleNewTransaction
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[CreditRealtime] Subscribed to ${channelName}`);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`[CreditRealtime] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [clientId, enabled, handleNewTransaction]);

  return {
    isSubscribed: channelRef.current !== null,
  };
}

/**
 * Subscribe to real-time credit updates for a budget group.
 * Listens to all transactions where group_id matches.
 */
export function useCreditRealtimeGroup(
  groupId: string | undefined,
  options: UseCreditRealtimeOptions = {}
) {
  const { onTransaction, enabled = true, showNotifications = false } = options;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTxIdRef = useRef<string | null>(null);

  const handleNewTransaction = useCallback((payload: { new: CreditTransaction }) => {
    const newTx = payload.new;
    
    // Prevent duplicate processing
    if (lastTxIdRef.current === newTx.id) return;
    lastTxIdRef.current = newTx.id;
    
    // Update group transactions cache
    queryClient.setQueryData(
      ['shared_budget_transactions', groupId],
      (old: CreditTransaction[] | undefined) => {
        if (!old) return [newTx];
        if (old.some(tx => tx.id === newTx.id)) return old;
        return [newTx, ...old];
      }
    );

    // Update group balance if available
    if (newTx.balance_after !== null) {
      // Invalidate all members' balance queries
      queryClient.invalidateQueries({ 
        queryKey: ['shared_budget_balance'],
        refetchType: 'all'
      });
      
      // Invalidate v2 balance queries
      queryClient.invalidateQueries({ 
        queryKey: ['credit_balance_v2'],
        refetchType: 'all'
      });

      // Update group balance directly
      queryClient.setQueryData(
        ['group_balance', groupId],
        newTx.balance_after
      );
      
      // Show notification for external balance changes
      if (showNotifications && newTx.amount !== 0) {
        const isCredit = newTx.amount > 0;
        toast({
          title: isCredit ? '💰 Skupinový kredit navýšen' : '📉 Skupinový kredit odečten',
          description: `${Math.abs(newTx.amount).toLocaleString('cs-CZ')} Kč${newTx.description ? ` - ${newTx.description}` : ''}`,
          variant: isCredit ? 'default' : 'default',
        });
      }
    }

    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['budget_groups'] });
    queryClient.invalidateQueries({ queryKey: ['pending_payments'] });

    onTransaction?.(newTx);
  }, [groupId, queryClient, onTransaction, showNotifications]);

  useEffect(() => {
    if (!groupId || !enabled) return;

    const channelName = `credit-realtime-group:${groupId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'credit_transactions',
          filter: `group_id=eq.${groupId}`,
        },
        handleNewTransaction
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[CreditRealtime] Subscribed to group ${channelName}`);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`[CreditRealtime] Unsubscribing from group ${channelName}`);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [groupId, enabled, handleNewTransaction]);

  return {
    isSubscribed: channelRef.current !== null,
  };
}
