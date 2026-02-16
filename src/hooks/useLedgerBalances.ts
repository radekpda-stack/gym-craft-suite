import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Bulk-fetch ledger balances for all clients and groups from views.
 * Returns maps: clientId -> balance, groupId -> balance.
 * Used by the Clients list to ensure consistency with the detail view.
 */
export function useLedgerBalances() {
  return useQuery({
    queryKey: ['ledger_balances_bulk'],
    queryFn: async () => {
      const [clientRes, groupRes] = await Promise.all([
        supabase.from('vw_client_ledger_balances').select('client_id, ledger_balance'),
        supabase.from('vw_group_ledger_balances').select('group_id, ledger_balance'),
      ]);

      if (clientRes.error) throw clientRes.error;
      if (groupRes.error) throw groupRes.error;

      const clientBalances = new Map<string, number>();
      for (const row of clientRes.data ?? []) {
        clientBalances.set(row.client_id, row.ledger_balance ?? 0);
      }

      const groupBalances = new Map<string, number>();
      for (const row of groupRes.data ?? []) {
        groupBalances.set(row.group_id, row.ledger_balance ?? 0);
      }

      return { clientBalances, groupBalances };
    },
    staleTime: 5000,
    refetchOnMount: 'always',
  });
}
