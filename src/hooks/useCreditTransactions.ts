import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type TransactionType = 'payment' | 'training' | 'product' | 'manual' | 'canceled_training' | 'transfer';
export type PaymentMethod = 'cash' | 'credit' | 'card';

export interface CreditTransaction {
  id: string;
  client_id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  reference_id: string | null;
  training_session_id: string | null;
  product_id: string | null;
  payment_method: PaymentMethod | null;
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
  // If true and client is in shared budget with personal debt, auto-transfer debt to shared budget
  clearPersonalDebt?: boolean;
}

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

// Helper function to check if client is in a shared budget group
async function getClientBudgetGroup(clientId: string) {
  const { data: membership, error } = await supabase
    .from("client_budget_members")
    .select("group_id, client_budget_groups(id, name, shared_balance)")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) throw error;
  return membership;
}

// Helper function to update shared budget balance
async function updateSharedBudgetBalance(groupId: string, amount: number) {
  const { data: group, error: getError } = await supabase
    .from("client_budget_groups")
    .select("shared_balance")
    .eq("id", groupId)
    .single();

  if (getError) throw getError;

  // Use integer math to avoid floating point issues
  const currentBalance = Math.round((group.shared_balance || 0) * 100);
  const amountCents = Math.round(amount * 100);
  const newBalance = (currentBalance + amountCents) / 100;

  const { error: updateError } = await supabase
    .from("client_budget_groups")
    .update({ shared_balance: newBalance })
    .eq("id", groupId);

  if (updateError) throw updateError;

  return newBalance;
}

// Helper to clear personal debt and transfer to shared budget
async function clearPersonalDebtToSharedBudget(
  clientId: string,
  groupId: string,
  userId: string
): Promise<number> {
  // Get client's personal balance
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

  // 1. Create a TRANSFER transaction to record the debt transfer
  const { error: transferError } = await supabase
    .from("credit_transactions")
    .insert({
      client_id: clientId,
      amount: debtAmount, // Positive amount to clear debt on personal side
      type: 'transfer',
      description: `Vyrovnání osobního dluhu do sdíleného budgetu`,
      user_id: userId,
      group_id: groupId,
    });

  if (transferError) throw transferError;

  // 2. Set client's personal balance to 0
  const { error: updateClientError } = await supabase
    .from("clients")
    .update({ credit_balance: 0 })
    .eq("id", clientId);

  if (updateClientError) throw updateClientError;

  // 3. Deduct the debt from shared budget
  await updateSharedBudgetBalance(groupId, -debtAmount);

  return debtAmount;
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if client is in a shared budget group
      const budgetGroup = await getClientBudgetGroup(input.client_id);
      const isSharedBudget = !!budgetGroup?.group_id;
      const groupId = budgetGroup?.group_id;

      let clearedDebt = 0;

      // If clearing personal debt is requested and client is in shared budget
      if (input.clearPersonalDebt && isSharedBudget && groupId) {
        clearedDebt = await clearPersonalDebtToSharedBudget(input.client_id, groupId, user.id);
      }

      // Create the transaction with group_id if applicable
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
          group_id: groupId || null,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Only update credit balance if not skipping (for cash payments)
      let newBalance: number | null = null;
      if (!input.skip_credit_update) {
        if (isSharedBudget && groupId) {
          // Update shared budget balance
          newBalance = await updateSharedBudgetBalance(groupId, input.amount);
        } else {
          // Update individual client balance
          const { data: client, error: clientError } = await supabase
            .from("clients")
            .select("credit_balance")
            .eq("id", input.client_id)
            .single();

          if (clientError) throw clientError;

          // Use integer math to avoid floating point issues
          const currentBalance = Math.round((client.credit_balance || 0) * 100);
          const amountCents = Math.round(input.amount * 100);
          newBalance = (currentBalance + amountCents) / 100;

          const { error: updateError } = await supabase
            .from("clients")
            .update({ credit_balance: newBalance })
            .eq("id", input.client_id);

          if (updateError) throw updateError;
        }
      }

      return { transaction, newBalance, skippedCredit: input.skip_credit_update, isSharedBudget, clearedDebt };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_transactions"] });
      
      if (result.skippedCredit) {
        toast({
          title: "Prodej zaznamenán",
          description: `Platba hotově: ${Math.abs(variables.amount)} Kč (bez odečtení kreditu)`,
        });
      } else {
        const isPositive = variables.amount > 0;
        const budgetType = result.isSharedBudget ? "Sdílený kredit" : "Kredit";
        let description = isPositive 
          ? `${budgetType} navýšen o ${variables.amount} Kč`
          : `${budgetType} snížen o ${Math.abs(variables.amount)} Kč`;
        
        if (result.clearedDebt > 0) {
          description += ` (vyrovnán dluh ${result.clearedDebt} Kč)`;
        }
        
        toast({
          title: isPositive ? "Platba přidána" : "Kredit odečten",
          description,
        });
      }
    },
    onError: (error) => {
      console.error("Error creating transaction:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit transakci.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId, amount }: { id: string; clientId: string; amount: number }) => {
      // Check if client is in a shared budget group
      const budgetGroup = await getClientBudgetGroup(clientId);
      const isSharedBudget = !!budgetGroup?.group_id;
      const groupId = budgetGroup?.group_id;

      // Delete the transaction
      const { error: deleteError } = await supabase
        .from("credit_transactions")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      // Reverse the credit change
      if (isSharedBudget && groupId) {
        // Update shared budget balance (reverse the amount)
        await updateSharedBudgetBalance(groupId, -amount);
      } else {
        // Update individual client balance
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("credit_balance")
          .eq("id", clientId)
          .single();

        if (clientError) throw clientError;

        const newBalance = (client.credit_balance || 0) - amount;

        const { error: updateError } = await supabase
          .from("clients")
          .update({ credit_balance: newBalance })
          .eq("id", clientId);

        if (updateError) throw updateError;
      }

      return { isSharedBudget };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_transactions"] });
      
      const budgetType = result.isSharedBudget ? "Sdílený kredit" : "Kredit";
      toast({
        title: "Transakce smazána",
        description: `Transakce byla odstraněna a ${budgetType.toLowerCase()} byl upraven.`,
      });
    },
    onError: (error) => {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat transakci.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTransactionPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      clientId, 
      amount, 
      oldPaymentMethod, 
      newPaymentMethod 
    }: { 
      id: string; 
      clientId: string; 
      amount: number; 
      oldPaymentMethod: PaymentMethod | null; 
      newPaymentMethod: PaymentMethod;
    }) => {
      // Check if client is in shared budget
      const budgetGroup = await getClientBudgetGroup(clientId);
      const isSharedBudget = !!budgetGroup?.group_id;
      const groupId = budgetGroup?.group_id;

      // Update the transaction payment method
      const { error: updateTransactionError } = await supabase
        .from("credit_transactions")
        .update({ payment_method: newPaymentMethod })
        .eq("id", id);

      if (updateTransactionError) throw updateTransactionError;

      const wasFromCredit = oldPaymentMethod === 'credit';
      const isNowFromCredit = newPaymentMethod === 'credit';

      // Only update balance if there's a change in credit usage
      if (wasFromCredit !== isNowFromCredit) {
        if (isSharedBudget && groupId) {
          // Update shared budget
          // If changing from credit to cash: add back (amount is negative for sales)
          // If changing from cash to credit: deduct
          const adjustment = wasFromCredit ? -amount : amount;
          await updateSharedBudgetBalance(groupId, adjustment);
        } else {
          // Update individual client balance
          const { data: client, error: clientError } = await supabase
            .from("clients")
            .select("credit_balance")
            .eq("id", clientId)
            .single();

          if (clientError) throw clientError;

          let newBalance = client.credit_balance || 0;
          // If changing from credit to cash: restore the credit
          if (wasFromCredit && !isNowFromCredit) {
            newBalance = newBalance - amount; // amount is negative for sales, so subtracting adds back
          }
          // If changing from cash to credit: deduct the credit
          else if (!wasFromCredit && isNowFromCredit) {
            newBalance = newBalance + amount; // amount is negative for sales, so adding deducts
          }

          const { error: updateError } = await supabase
            .from("clients")
            .update({ credit_balance: newBalance })
            .eq("id", clientId);

          if (updateError) throw updateError;
        }
      }

      return { changed: wasFromCredit !== isNowFromCredit, isSharedBudget };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      
      const budgetType = result.isSharedBudget ? "sdílený kredit" : "kredit";
      toast({
        title: "Způsob platby změněn",
        description: result.changed 
          ? `Způsob platby a ${budgetType} byly aktualizovány.`
          : "Způsob platby byl aktualizován.",
      });
    },
    onError: (error) => {
      console.error("Error updating payment method:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit způsob platby.",
        variant: "destructive",
      });
    },
  });
}

// Hook for fetching product sales specifically
export function useProductSales() {
  return useQuery({
    queryKey: ["product_sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select(`
          *,
          clients:client_id(name),
          products:product_id(name)
        `)
        .eq("type", "product")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}