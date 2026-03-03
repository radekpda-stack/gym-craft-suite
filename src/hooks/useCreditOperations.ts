import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { featureTracker } from "@/hooks/useFeatureTracking";

// ==================== Types ====================
export type TransactionType = 'payment' | 'training' | 'product' | 'manual' | 'canceled_training' | 'transfer';
export type PaymentMethod = 'cash' | 'credit' | 'card' | 'bank' | null;

export interface CreditTransaction {
  id: string;
  client_id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  reference_id: string | null;
  training_session_id: string | null;
  product_id: string | null;
  payment_method: PaymentMethod | string | null;
  created_at: string;
  created_by: string | null;
  user_id: string | null;
  group_id?: string | null;
}

export type SourceType = 'training_session' | 'sales_order' | 'admin_panel' | 'undo' | 'system';

export interface CreateTransactionInput {
  client_id: string;
  amount: number;
  type: TransactionType;
  description?: string;
  training_session_id?: string;
  product_id?: string;
  payment_method?: PaymentMethod;
  skip_credit_update?: boolean;
  clearPersonalDebt?: boolean;
  /** Origin of the transaction for audit trail */
  source_type?: SourceType;
  /** Reference ID to source record (training_session.id, sales_order.id, etc.) */
  source_id?: string;
}

export interface SharedBudgetInfo {
  isShared: boolean;
  groupId: string | null;
  groupName: string | null;
  sharedBalance: number;
  displayBalance: number;
  isExhausted: boolean;
  isNegative: boolean;
  members: Array<{ id: string; name: string; membershipId: string }>;
}

export interface ApplyCreditDeltaResult {
  success: boolean;
  balance: number; // Alias for new_balance for backwards compatibility
  entity_type: 'client' | 'group';
  entity_id: string;
  new_balance: number;
  delta: number;
  client_id: string;
  group_id: string | null;
  error?: string;
}

// ==================== Core Credit Utility Functions ====================

/**
 * Get client's budget group ID (if any)
 */
export async function getClientGroupId(clientId: string): Promise<string | null> {
  const { data: membership, error } = await supabase
    .from('client_budget_members')
    .select('group_id')
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) throw error;
  return membership?.group_id ?? null;
}

/**
 * Get full budget group info for a client
 */
export async function getClientBudgetGroup(clientId: string) {
  const { data: membership, error } = await supabase
    .from("client_budget_members")
    .select("group_id, client_budget_groups(id, name, shared_balance)")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) throw error;
  return membership;
}

/**
 * Apply credit delta using ATOMIC RPC function
 * This is the ONLY way to update credit - prevents race conditions
 */
export async function applyCreditDelta(
  clientId: string,
  delta: number,
  reason?: string,
  refId?: string
): Promise<ApplyCreditDeltaResult> {
  const { data, error } = await supabase.rpc('rpc_apply_credit_delta', {
    p_client_id: clientId,
    p_delta: delta,
    p_reason: reason ?? null,
    p_ref_id: refId ?? null,
  });

  if (error) throw error;
  
  const rawResult = data as unknown as {
    success: boolean;
    entity_type: 'client' | 'group';
    entity_id: string;
    new_balance: number;
    delta: number;
    client_id: string;
    group_id: string | null;
    error?: string;
  };
  
  if (!rawResult.success) {
    throw new Error(rawResult.error || 'Failed to apply credit delta');
  }
  
  return {
    ...rawResult,
    balance: rawResult.new_balance, // Backwards compatibility
  };
}

/**
 * @deprecated Use applyCreditDelta instead - this is for backwards compatibility
 */
export async function updateSharedBalance(groupId: string, delta: number): Promise<number> {
  // Get any member of the group to use the RPC
  const { data: anyMember } = await supabase
    .from("client_budget_members")
    .select("client_id")
    .eq("group_id", groupId)
    .limit(1)
    .single();
    
  if (!anyMember) throw new Error("No members in group");
  
  const result = await applyCreditDelta(anyMember.client_id, delta);
  return result.new_balance;
}

/**
 * @deprecated Use applyCreditDelta instead - this is for backwards compatibility
 */
export async function updateClientBalance(clientId: string, delta: number): Promise<number> {
  const result = await applyCreditDelta(clientId, delta);
  return result.new_balance;
}

/**
 * Clear personal debt and transfer to shared budget
 */
export async function clearPersonalDebtToSharedBudget(
  clientId: string,
  groupId: string,
  userId: string
): Promise<number> {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("credit_balance, name")
    .eq("id", clientId)
    .single();

  if (clientError) throw clientError;

  const personalBalance = client.credit_balance || 0;
  
  // Only process if there's a negative balance (debt)
  if (personalBalance >= 0) return 0;

  const debtAmount = Math.abs(personalBalance);

  // Create TRANSFER transaction
  const { error: transferError } = await supabase
    .from("credit_transactions")
    .insert({
      client_id: clientId,
      amount: debtAmount,
      type: 'transfer',
      description: `Vyrovnání osobního dluhu do sdíleného budgetu`,
      user_id: userId,
      group_id: groupId,
    });

  if (transferError) throw transferError;

  // The transfer transaction above (positive amount on client's ledger) 
  // will cause the trigger to recalculate client's balance.
  // We also need a deduction transaction on the group ledger.
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  const { error: groupTxError } = await supabase
    .from("credit_transactions")
    .insert({
      client_id: clientId,
      amount: -debtAmount,
      type: 'transfer',
      description: 'Převod dluhu z osobního kreditu do sdíleného budgetu',
      user_id: authUser?.id ?? userId,
      group_id: groupId,
    });

  if (groupTxError) throw groupTxError;

  // Triggers automatically recalculate both client and group balances

  return debtAmount;
}

// ==================== Query Hooks ====================

export function useCreditTransactions(clientId?: string) {
  return useQuery({
    queryKey: ["credit_transactions", clientId],
    staleTime: 5 * 1000, // 5 seconds - critical for showing recent transactions
    queryFn: async () => {
      let query = supabase
        .from("credit_transactions")
        .select("id, client_id, amount, type, description, reference_id, training_session_id, product_id, payment_method, created_at, created_by, user_id, group_id")
        .order("created_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CreditTransaction[];
    },
  });
}

export function useProductSales() {
  return useQuery({
    queryKey: ["product_sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select(`*, clients:client_id(name), products:product_id(name)`)
        .eq("type", "product")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useSharedBudgetBalance(clientId?: string) {
  return useQuery({
    queryKey: ["shared_budget_balance", clientId],
    queryFn: async (): Promise<SharedBudgetInfo> => {
      if (!clientId) {
        return {
          isShared: false, groupId: null, groupName: null, sharedBalance: 0,
          displayBalance: 0, isExhausted: false, isNegative: false, members: [],
        };
      }

      const membership = await getClientBudgetGroup(clientId);

      if (!membership) {
        // FIXED: Use ledger_balance from view instead of cached credit_balance
        // This ensures we always display the actual calculated balance from transactions
        const { data: ledgerData, error: ledgerError } = await supabase
          .from("vw_client_ledger_balances")
          .select("ledger_balance")
          .eq("client_id", clientId)
          .maybeSingle();

        if (ledgerError) throw ledgerError;
        const balance = ledgerData?.ledger_balance ?? 0;
        return {
          isShared: false, groupId: null, groupName: null, sharedBalance: balance,
          displayBalance: balance, isExhausted: balance <= 0, isNegative: balance < 0, members: [],
        };
      }

      const group = membership.client_budget_groups as { id: string; name: string; shared_balance: number } | null;
      if (!group) {
        return {
          isShared: false, groupId: null, groupName: null, sharedBalance: 0,
          displayBalance: 0, isExhausted: true, isNegative: false, members: [],
        };
      }

      const { data: allMembers, error: membersError } = await supabase
        .from("client_budget_members")
        .select("id, client_id, clients(id, name)")
        .eq("group_id", group.id);

      if (membersError) throw membersError;

      const members = (allMembers || []).map(m => {
        const client = m.clients as { id: string; name: string } | null;
        return { id: client?.id || '', name: client?.name || '', membershipId: m.id };
      }).filter(m => m.id);

      // FIXED: Use ledger balance from view instead of cached shared_balance
      // This ensures consistency with individual client balances
      const { data: groupLedger, error: groupLedgerError } = await supabase
        .from("vw_group_ledger_balances")
        .select("ledger_balance")
        .eq("group_id", group.id)
        .maybeSingle();

      if (groupLedgerError) throw groupLedgerError;
      const sharedBalance = groupLedger?.ledger_balance ?? group.shared_balance ?? 0;
      
      return {
        isShared: true, groupId: group.id, groupName: group.name, sharedBalance,
        displayBalance: sharedBalance, isExhausted: sharedBalance <= 0, isNegative: sharedBalance < 0, members,
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 1000, // 5 seconds - critical for showing accurate balance after operations
  });
}

export function useSharedBudgetTransactions(groupId?: string | null) {
  return useQuery({
    queryKey: ["shared_budget_transactions", groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data: members, error: membersError } = await supabase
        .from("client_budget_members")
        .select("client_id")
        .eq("group_id", groupId);

      if (membersError) throw membersError;
      const clientIds = members.map(m => m.client_id);
      if (clientIds.length === 0) return [];

      const { data: transactions, error: transactionsError } = await supabase
        .from("credit_transactions")
        .select("*, clients:client_id(name)")
        .or(`client_id.in.(${clientIds.join(',')}),group_id.eq.${groupId}`)
        .order("created_at", { ascending: false });

      if (transactionsError) throw transactionsError;
      return transactions;
    },
    enabled: !!groupId,
  });
}

// ==================== Pending Payments Hook ====================

export interface PendingPaymentsData {
  individual: Array<{
    id: string;
    name: string;
    credit_balance: number;
    type: 'individual';
  }>;
  groups: Array<{
    id: string;
    name: string;
    shared_balance: number;
    type: 'group';
    members: Array<{ id: string; name: string }>;
  }>;
  total_individual_amount: number;
  total_group_amount: number;
}

export function usePendingPayments() {
  return useQuery({
    queryKey: ["pending_payments"],
    queryFn: async (): Promise<PendingPaymentsData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc('rpc_get_pending_payments', {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data as unknown as PendingPaymentsData;
    },
  });
}

// ==================== Mutation Hooks ====================

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const budgetGroup = await getClientBudgetGroup(input.client_id);
      const isSharedBudget = !!budgetGroup?.group_id;
      const groupId = budgetGroup?.group_id || null;

      let clearedDebt = 0;
      if (input.clearPersonalDebt && isSharedBudget && groupId) {
        clearedDebt = await clearPersonalDebtToSharedBudget(input.client_id, groupId, user.id);
      }

      // Determine source_type automatically if not provided
      let sourceType = input.source_type;
      let sourceId = input.source_id;
      
      if (!sourceType) {
        if (input.training_session_id) {
          sourceType = 'training_session';
          sourceId = input.training_session_id;
        } else if (input.product_id) {
          sourceType = 'sales_order';
        } else if (input.type === 'manual' || input.type === 'payment') {
          sourceType = 'admin_panel';
        }
      }

      const { data: transaction, error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          client_id: input.client_id,
          amount: input.amount,
          type: input.type,
          description: input.description || null,
          training_session_id: input.training_session_id || null,
          product_id: input.product_id || null,
          payment_method: input.payment_method || 'credit',
          user_id: user.id,
          group_id: groupId,
          source_type: sourceType || null,
          source_id: sourceId || null,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      /**
       * IMPORTANT:
       * We rely on DB triggers to keep cached balances in sync with the ledger.
       * Calling rpc_apply_credit_delta here would double-apply the same delta.
       */
      let newBalance: number | null = null;
      let entityType: 'client' | 'group' = 'client';

      // Fetch the updated balance for UI/toasts
      if (groupId) {
        entityType = 'group';
        const { data: group, error: groupError } = await supabase
          .from('client_budget_groups')
          .select('shared_balance')
          .eq('id', groupId)
          .maybeSingle();
        if (groupError) throw groupError;
        newBalance = group?.shared_balance ?? null;
      } else {
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('credit_balance')
          .eq('id', input.client_id)
          .maybeSingle();
        if (clientError) throw clientError;
        newBalance = client?.credit_balance ?? null;
      }

      return { 
        transaction, 
        newBalance, 
        skippedCredit: !!input.skip_credit_update,
        isSharedBudget, 
        clearedDebt,
        entityType,
        undoData: {
          transactionId: transaction.id,
          clientId: input.client_id,
          amount: input.amount,
        }
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["pending_payments"] });
      
      const trackType = variables.amount > 0 ? 'credit_add' : 'credit_deduct';
      featureTracker.track(trackType, 'finance', { 
        amount: variables.amount, 
        type: variables.type,
        isShared: result.isSharedBudget 
      });
      
      if (result.skippedCredit) {
        toast({ title: "Prodej zaznamenán", description: `Platba hotově: ${Math.abs(variables.amount)} Kč` });
      } else {
        const isPositive = variables.amount > 0;
        const budgetType = result.isSharedBudget ? "Sdílený kredit" : "Kredit";
        let description = isPositive 
          ? `${budgetType} navýšen o ${variables.amount} Kč`
          : `${budgetType} snížen o ${Math.abs(variables.amount)} Kč`;
        if (result.clearedDebt > 0) description += ` (vyrovnán dluh ${result.clearedDebt} Kč)`;
        toast({ title: isPositive ? "Platba přidána" : "Kredit odečten", description });
      }
    },
    onError: () => {
      toast({ title: "Chyba", description: "Nepodařilo se vytvořit transakci.", variant: "destructive" });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId, amount }: { id: string; clientId: string; amount: number }) => {
      const groupId = await getClientGroupId(clientId);

      const { error: deleteError } = await supabase
        .from("credit_transactions")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      // DB trigger (fn_sync_client_credit_balance) automatically recalculates
      // balance from SUM(amount) after DELETE. No manual delta needed.

      return { isSharedBudget: !!groupId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["pending_payments"] });
      
      const budgetType = result.isSharedBudget ? "Sdílený kredit" : "Kredit";
      toast({ title: "Transakce smazána", description: `Transakce odstraněna, ${budgetType.toLowerCase()} upraven.` });
    },
    onError: () => {
      toast({ title: "Chyba", description: "Nepodařilo se smazat transakci.", variant: "destructive" });
    },
  });
}

export function useUpdateTransactionPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, clientId, amount, oldPaymentMethod, newPaymentMethod 
    }: { 
      id: string; clientId: string; amount: number; 
      oldPaymentMethod: PaymentMethod | string | null; newPaymentMethod: PaymentMethod;
    }) => {
      const groupId = await getClientGroupId(clientId);

      const { error: updateTransactionError } = await supabase
        .from("credit_transactions")
        .update({ payment_method: newPaymentMethod })
        .eq("id", id);

      if (updateTransactionError) throw updateTransactionError;

      const wasFromCredit = oldPaymentMethod === 'credit';
      const isNowFromCredit = newPaymentMethod === 'credit';

      // DB trigger (fn_sync_client_credit_balance) recalculates balance from SUM.
      // Payment method change on an existing transaction doesn't change the amount,
      // so no balance adjustment is needed — the trigger handles it.

      return { changed: wasFromCredit !== isNowFromCredit, isSharedBudget: !!groupId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      queryClient.invalidateQueries({ queryKey: ["pending_payments"] });
      
      const budgetType = result.isSharedBudget ? "sdílený kredit" : "kredit";
      toast({
        title: "Způsob platby změněn",
        description: result.changed ? `Způsob platby a ${budgetType} aktualizovány.` : "Způsob platby aktualizován.",
      });
    },
    onError: () => {
      toast({ title: "Chyba", description: "Nepodařilo se změnit způsob platby.", variant: "destructive" });
    },
  });
}

export function useUpdateSharedBudgetBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, amount }: { groupId: string; amount: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get any member of the group for the transaction
      const { data: anyMember } = await supabase
        .from("client_budget_members")
        .select("client_id")
        .eq("group_id", groupId)
        .limit(1)
        .single();
        
      if (!anyMember) throw new Error("No members in group");
      
      // Insert a ledger transaction — trigger will sync cached balance
      const { error: txError } = await supabase
        .from("credit_transactions")
        .insert({
          client_id: anyMember.client_id,
          amount,
          type: 'manual',
          description: 'Ruční úprava sdíleného kreditu',
          user_id: user.id,
          group_id: groupId,
        });

      if (txError) throw txError;

      // Read updated balance
      const { data: gl } = await supabase
        .from('vw_group_ledger_balances')
        .select('ledger_balance')
        .eq('group_id', groupId)
        .maybeSingle();
      
      return gl?.ledger_balance ?? 0;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      queryClient.invalidateQueries({ queryKey: ["pending_payments"] });
    },
    onError: () => {
      toast({ title: "Chyba", description: "Nepodařilo se aktualizovat sdílený kredit.", variant: "destructive" });
    },
  });
}
