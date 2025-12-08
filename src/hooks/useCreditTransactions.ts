import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type TransactionType = 'payment' | 'training' | 'product' | 'manual' | 'canceled_training';
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

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // First, create the transaction
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
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Only update credit balance if not skipping (for cash payments)
      let newBalance: number | null = null;
      if (!input.skip_credit_update) {
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("credit_balance")
          .eq("id", input.client_id)
          .single();

        if (clientError) throw clientError;

        newBalance = (client.credit_balance || 0) + input.amount;

        const { error: updateError } = await supabase
          .from("clients")
          .update({ credit_balance: newBalance })
          .eq("id", input.client_id);

        if (updateError) throw updateError;
      }

      return { transaction, newBalance, skippedCredit: input.skip_credit_update };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", variables.client_id] });
      
      if (result.skippedCredit) {
        toast({
          title: "Prodej zaznamenán",
          description: `Platba hotově: ${Math.abs(variables.amount)} Kč (bez odečtení kreditu)`,
        });
      } else {
        const isPositive = variables.amount > 0;
        toast({
          title: isPositive ? "Platba přidána" : "Kredit odečten",
          description: isPositive 
            ? `Kredit navýšen o ${variables.amount} Kč`
            : `Kredit snížen o ${Math.abs(variables.amount)} Kč`,
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
      // Delete the transaction
      const { error: deleteError } = await supabase
        .from("credit_transactions")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      // Reverse the credit change
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Transakce smazána",
        description: "Transakce byla odstraněna a kredit byl upraven.",
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
      // Update the transaction payment method
      const { error: updateTransactionError } = await supabase
        .from("credit_transactions")
        .update({ payment_method: newPaymentMethod })
        .eq("id", id);

      if (updateTransactionError) throw updateTransactionError;

      // Get current client balance
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("credit_balance")
        .eq("id", clientId)
        .single();

      if (clientError) throw clientError;

      let newBalance = client.credit_balance || 0;
      const wasFromCredit = oldPaymentMethod === 'credit';
      const isNowFromCredit = newPaymentMethod === 'credit';

      // If changing from credit to cash: restore the credit
      if (wasFromCredit && !isNowFromCredit) {
        newBalance = newBalance - amount; // amount is negative for sales, so subtracting adds back
      }
      // If changing from cash to credit: deduct the credit
      else if (!wasFromCredit && isNowFromCredit) {
        newBalance = newBalance + amount; // amount is negative for sales, so adding deducts
      }

      // Only update if there's a change
      if (wasFromCredit !== isNowFromCredit) {
        const { error: updateError } = await supabase
          .from("clients")
          .update({ credit_balance: newBalance })
          .eq("id", clientId);

        if (updateError) throw updateError;
      }

      return { newBalance, changed: wasFromCredit !== isNowFromCredit };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Způsob platby změněn",
        description: result.changed 
          ? "Způsob platby a kredit klienta byly aktualizovány."
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
