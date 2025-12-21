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
 * Update shared budget balance atomically using SQL RPC
 * This prevents race conditions by performing a single atomic UPDATE
 */
export async function updateSharedBalance(groupId: string, delta: number): Promise<number> {
  // Use atomic RPC function to prevent race conditions
  const { data, error } = await supabase.rpc('update_shared_balance_atomic', {
    p_group_id: groupId,
    p_delta: delta,
  });

  if (error) throw error;
  return data as number;
}

/**
 * Update individual client credit balance atomically using SQL RPC
 * This prevents race conditions by performing a single atomic UPDATE
 */
export async function updateClientBalance(clientId: string, delta: number): Promise<number> {
  // Use atomic RPC function to prevent race conditions
  const { data, error } = await supabase.rpc('update_client_balance_atomic', {
    p_client_id: clientId,
    p_delta: delta,
  });

  if (error) throw error;
  return data as number;
}

/**
 * Apply credit delta - automatically detects shared vs individual budget
 */
export async function applyCreditDelta(
  clientId: string,
  delta: number
): Promise<{ balance: number; groupId: string | null }> {
  const groupId = await getClientGroupId(clientId);

  if (groupId) {
    const balance = await updateSharedBalance(groupId, delta);
    // Keep personal balance at 0 for shared-budget clients
    await supabase.from('clients').update({ credit_balance: 0 }).eq('id', clientId);
    return { balance, groupId };
  }

  const balance = await updateClientBalance(clientId, delta);
  return { balance, groupId: null };
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

  // Set client's personal balance to 0
  const { error: updateClientError } = await supabase
    .from("clients")
    .update({ credit_balance: 0 })
    .eq("id", clientId);

  if (updateClientError) throw updateClientError;

  // Deduct the debt from shared budget
  await updateSharedBalance(groupId, -debtAmount);

  return debtAmount;
}

// ==================== Query Hooks ====================

export function useCreditTransactions(clientId?: string) {
  return useQuery({
    queryKey: ["credit_transactions", clientId],
    queryFn: async () => {
      let query = supabase
        .from("credit_transactions")
        .select("*")
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
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("credit_balance")
          .eq("id", clientId)
          .single();

        if (clientError) throw clientError;
        const balance = client.credit_balance || 0;
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

      const sharedBalance = group.shared_balance || 0;
      return {
        isShared: true, groupId: group.id, groupName: group.name, sharedBalance,
        displayBalance: sharedBalance, isExhausted: sharedBalance <= 0, isNegative: sharedBalance < 0, members,
      };
    },
    enabled: !!clientId,
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
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      let newBalance: number | null = null;
      if (!input.skip_credit_update) {
        const { balance } = await applyCreditDelta(input.client_id, input.amount);
        newBalance = balance;
      }

      return { transaction, newBalance, skippedCredit: input.skip_credit_update, isSharedBudget, clearedDebt };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_transactions"] });
      
      // Track the action
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
    onError: (error) => {
      console.error("Error creating transaction:", error);
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

      // Reverse credit change
      await applyCreditDelta(clientId, -amount);

      return { isSharedBudget: !!groupId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      
      const budgetType = result.isSharedBudget ? "Sdílený kredit" : "Kredit";
      toast({ title: "Transakce smazána", description: `Transakce odstraněna, ${budgetType.toLowerCase()} upraven.` });
    },
    onError: (error) => {
      console.error("Error deleting transaction:", error);
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

      if (wasFromCredit !== isNowFromCredit) {
        // If changing from credit to cash: add back; from cash to credit: deduct
        const adjustment = wasFromCredit ? -amount : amount;
        await applyCreditDelta(clientId, adjustment);
      }

      return { changed: wasFromCredit !== isNowFromCredit, isSharedBudget: !!groupId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      
      const budgetType = result.isSharedBudget ? "sdílený kredit" : "kredit";
      toast({
        title: "Způsob platby změněn",
        description: result.changed ? `Způsob platby a ${budgetType} aktualizovány.` : "Způsob platby aktualizován.",
      });
    },
    onError: (error) => {
      console.error("Error updating payment method:", error);
      toast({ title: "Chyba", description: "Nepodařilo se změnit způsob platby.", variant: "destructive" });
    },
  });
}

export function useUpdateSharedBudgetBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, amount }: { groupId: string; amount: number }) => {
      return await updateSharedBalance(groupId, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
    },
    onError: (error) => {
      console.error("Error updating shared budget:", error);
      toast({ title: "Chyba", description: "Nepodařilo se aktualizovat sdílený kredit.", variant: "destructive" });
    },
  });
}
