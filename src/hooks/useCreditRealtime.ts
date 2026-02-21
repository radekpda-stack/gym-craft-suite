import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

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

  // Store callbacks in refs to avoid effect re-runs
  const onTransactionRef = useRef(onTransaction);
  onTransactionRef.current = onTransaction;
  const showNotificationsRef = useRef(showNotifications);
  showNotificationsRef.current = showNotifications;
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!clientId || !enabled) return;

    const channelName = `credit-realtime:${clientId}`;

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
        (payload: { new: CreditTransaction }) => {
          const newTx = payload.new;
          
          // Prevent duplicate processing
          if (lastTxIdRef.current === newTx.id) return;
          lastTxIdRef.current = newTx.id;
          
          const qc = queryClientRef.current;
          
          // Update transactions list cache (prepend new transaction)
          qc.setQueryData(
            ['credit_transactions', clientId],
            (old: CreditTransaction[] | undefined) => {
              if (!old) return [newTx];
              if (old.some(tx => tx.id === newTx.id)) return old;
              return [newTx, ...old];
            }
          );

          // Update balance cache directly from balance_after (running balance)
          if (newTx.balance_after !== null) {
            qc.setQueryData(
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

            qc.setQueryData(
              ['credit_balance', clientId],
              newTx.balance_after
            );
            
            qc.setQueryData(
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
            
            if (showNotificationsRef.current && newTx.amount !== 0) {
              const isCredit = newTx.amount > 0;
              toast({
                title: isCredit ? '💰 Kredit navýšen' : '📉 Kredit odečten',
                description: `${Math.abs(newTx.amount).toLocaleString('cs-CZ')} Kč${newTx.description ? ` - ${newTx.description}` : ''}`,
                variant: isCredit ? 'default' : 'default',
              });
            }
          }

          qc.invalidateQueries({ queryKey: ['clients', clientId] });
          qc.invalidateQueries({ queryKey: ['pending_payments'] });

          onTransactionRef.current?.(newTx);
        }
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
  }, [clientId, enabled]);

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

  // Store callbacks in refs to avoid effect re-runs
  const onTransactionRef = useRef(onTransaction);
  onTransactionRef.current = onTransaction;
  const showNotificationsRef = useRef(showNotifications);
  showNotificationsRef.current = showNotifications;
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

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
        (payload: { new: CreditTransaction }) => {
          const newTx = payload.new;
          
          if (lastTxIdRef.current === newTx.id) return;
          lastTxIdRef.current = newTx.id;
          
          const qc = queryClientRef.current;
          
          qc.setQueryData(
            ['shared_budget_transactions', groupId],
            (old: CreditTransaction[] | undefined) => {
              if (!old) return [newTx];
              if (old.some(tx => tx.id === newTx.id)) return old;
              return [newTx, ...old];
            }
          );

          if (newTx.balance_after !== null) {
            qc.invalidateQueries({ 
              queryKey: ['shared_budget_balance'],
              refetchType: 'all'
            });
            
            qc.invalidateQueries({ 
              queryKey: ['credit_balance_v2'],
              refetchType: 'all'
            });

            qc.setQueryData(
              ['group_balance', groupId],
              newTx.balance_after
            );
            
            if (showNotificationsRef.current && newTx.amount !== 0) {
              const isCredit = newTx.amount > 0;
              toast({
                title: isCredit ? '💰 Skupinový kredit navýšen' : '📉 Skupinový kredit odečten',
                description: `${Math.abs(newTx.amount).toLocaleString('cs-CZ')} Kč${newTx.description ? ` - ${newTx.description}` : ''}`,
                variant: isCredit ? 'default' : 'default',
              });
            }
          }

          qc.invalidateQueries({ queryKey: ['budget_groups'] });
          qc.invalidateQueries({ queryKey: ['pending_payments'] });

          onTransactionRef.current?.(newTx);
        }
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
  }, [groupId, enabled]);

  return {
    isSubscribed: channelRef.current !== null,
  };
}
