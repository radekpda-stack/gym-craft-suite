import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DiscrepancyItem {
  id: string;
  name: string;
  stored_balance: number;
  calculated_balance: number;
  discrepancy: number;
}

interface DiscrepanciesResult {
  groups: DiscrepancyItem[];
  clients: DiscrepancyItem[];
  total_group_discrepancies: number;
  total_client_discrepancies: number;
  timestamp: string;
}

interface RecalculateResult {
  success: boolean;
  groups_fixed: number;
  clients_fixed: number;
  transactions_linked: number;
  timestamp: string;
}

interface ClientRecalculateResult {
  success: boolean;
  client_id: string;
  old_balance: number;
  new_balance: number;
  in_group: boolean;
  group_id: string | null;
  difference: number;
}

interface GroupRecalculateResult {
  success: boolean;
  group_id: string;
  old_balance: number;
  new_balance: number;
  difference: number;
  transactions_linked: number;
}

/**
 * Hook to fetch balance discrepancies between stored values and transaction ledger
 */
export function useBalanceDiscrepancies() {
  return useQuery({
    queryKey: ['balance-discrepancies'],
    queryFn: async (): Promise<DiscrepanciesResult> => {
      const { data, error } = await supabase.rpc('rpc_get_balance_discrepancies');
      
      if (error) throw error;
      return data as unknown as DiscrepanciesResult;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to recalculate all balances (groups + individual clients)
 */
export function useRecalculateAllBalances() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (): Promise<RecalculateResult> => {
      const { data, error } = await supabase.rpc('rpc_recalculate_all_balances');
      
      if (error) throw error;
      return data as unknown as RecalculateResult;
    },
    onSuccess: (result) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      queryClient.invalidateQueries({ queryKey: ['budget-groups'] });
      queryClient.invalidateQueries({ queryKey: ['shared-budget'] });
      queryClient.invalidateQueries({ queryKey: ['balance-discrepancies'] });
      queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
      
      toast({
        title: 'Kredity přepočítány',
        description: `Opraveno ${result.groups_fixed} skupin a ${result.clients_fixed} klientů. Propojeno ${result.transactions_linked} transakcí.`,
      });
    },
    onError: (error) => {
      console.error('Failed to recalculate balances:', error);
      toast({
        title: 'Chyba při přepočtu',
        description: 'Nepodařilo se přepočítat kredity. Zkuste to znovu.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to recalculate a single client's balance
 */
export function useRecalculateClientBalance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string): Promise<ClientRecalculateResult> => {
      const { data, error } = await supabase.rpc('rpc_recalculate_client_balance', {
        p_client_id: clientId,
      });
      
      if (error) throw error;
      return data as unknown as ClientRecalculateResult;
    },
    onSuccess: (result, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['credit-transactions', clientId] });
      queryClient.invalidateQueries({ queryKey: ['balance-discrepancies'] });
      
      toast({
        title: 'Kredit přepočítán',
        description: `Nový zůstatek: ${result.new_balance} Kč`,
      });
    },
    onError: (error) => {
      console.error('Failed to recalculate client balance:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se přepočítat kredit klienta.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to recalculate a single group's balance
 */
export function useRecalculateGroupBalance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (groupId: string): Promise<GroupRecalculateResult> => {
      const { data, error } = await supabase.rpc('rpc_recalculate_group_balance', {
        p_group_id: groupId,
      });
      
      if (error) throw error;
      return data as unknown as GroupRecalculateResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['budget-groups'] });
      queryClient.invalidateQueries({ queryKey: ['shared-budget'] });
      queryClient.invalidateQueries({ queryKey: ['balance-discrepancies'] });
      
      toast({
        title: 'Kredit skupiny přepočítán',
        description: `Nový zůstatek: ${result.new_balance} Kč`,
      });
    },
    onError: (error) => {
      console.error('Failed to recalculate group balance:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se přepočítat kredit skupiny.',
        variant: 'destructive',
      });
    },
  });
}
