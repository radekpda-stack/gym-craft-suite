import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type TransactionType = 'payment' | 'training' | 'product' | 'manual' | 'canceled_training';

export interface CreditTransaction {
  id: string;
  client_id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  reference_id: string | null;
  training_session_id: string | null;
  product_id: string | null;
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
          user_id: user.id,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Then, update the client's credit balance
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("credit_balance")
        .eq("id", input.client_id)
        .single();

      if (clientError) throw clientError;

      const newBalance = (client.credit_balance || 0) + input.amount;

      const { error: updateError } = await supabase
        .from("clients")
        .update({ credit_balance: newBalance })
        .eq("id", input.client_id);

      if (updateError) throw updateError;

      return { transaction, newBalance };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", variables.client_id] });
      
      const isPositive = variables.amount > 0;
      toast({
        title: isPositive ? "Platba přidána" : "Kredit odečten",
        description: isPositive 
          ? `Kredit navýšen o ${variables.amount} Kč`
          : `Kredit snížen o ${Math.abs(variables.amount)} Kč`,
      });
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
