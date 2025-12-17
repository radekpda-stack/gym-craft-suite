import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PaymentMethod, PaymentStatus } from "./useTrainingSessions";

export interface UnpaidTraining {
  id: string;
  client_id: string;
  client_name: string;
  date: string;
  final_price: number;
  participant_count: number;
  payment_status: PaymentStatus;
}

export function useUnpaidTrainings(clientId?: string) {
  return useQuery({
    queryKey: ["unpaid_trainings", clientId],
    queryFn: async () => {
      let query = supabase
        .from("training_sessions")
        .select(`
          id,
          client_id,
          date,
          final_price,
          participant_count,
          payment_status,
          clients!inner(name)
        `)
        .eq("status", "completed")
        .eq("payment_status", "pending")
        .order("date", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.id,
        client_id: item.client_id,
        client_name: item.clients?.name || 'Neznámý',
        date: item.date,
        final_price: item.final_price || 0,
        participant_count: item.participant_count || 1,
        payment_status: item.payment_status,
      })) as UnpaidTraining[];
    },
  });
}

export function useUnpaidTrainingsStats() {
  return useQuery({
    queryKey: ["unpaid_trainings_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, final_price")
        .eq("status", "completed")
        .eq("payment_status", "pending");

      if (error) throw error;

      const count = data?.length || 0;
      const total = data?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;

      return { count, total };
    },
  });
}

export function usePayTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trainingId,
      paymentMethod,
      deductCredit = false,
    }: {
      trainingId: string;
      paymentMethod: PaymentMethod;
      deductCredit?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get training details
      const { data: training, error: trainingError } = await supabase
        .from("training_sessions")
        .select("client_id, final_price, participant_count")
        .eq("id", trainingId)
        .single();

      if (trainingError) throw trainingError;

      const paymentStatus: PaymentStatus = paymentMethod === 'credit' ? 'paid_credit' :
        paymentMethod === 'cash' ? 'paid_cash' :
        paymentMethod === 'card' ? 'paid_card' :
        paymentMethod === 'bank' ? 'paid_bank' : 'paid_credit';

      // Update training payment status
      const { error: updateError } = await supabase
        .from("training_sessions")
        .update({
          payment_status: paymentStatus,
          payment_method: paymentMethod,
        })
        .eq("id", trainingId);

      if (updateError) throw updateError;

      // If paying from credit, deduct from balance (individual or shared)
      if (deductCredit && paymentMethod === 'credit' && training.final_price) {
        const price = training.final_price;

        // Detect shared budget group
        const { data: membership, error: membershipError } = await supabase
          .from('client_budget_members')
          .select('group_id')
          .eq('client_id', training.client_id)
          .maybeSingle();

        if (membershipError) throw membershipError;

        const groupId = membership?.group_id ?? null;

        // Create credit transaction
        const { error: txError } = await supabase
          .from('credit_transactions')
          .insert({
            client_id: training.client_id,
            amount: -price,
            type: 'training',
            description: 'Trénink - zpětná platba',
            training_session_id: trainingId,
            user_id: user.id,
            group_id: groupId,
          });

        if (txError) throw txError;

        if (groupId) {
          // Update shared balance
          const { data: group, error: groupError } = await supabase
            .from('client_budget_groups')
            .select('shared_balance')
            .eq('id', groupId)
            .single();

          if (groupError) throw groupError;

          const current = Math.round((group.shared_balance || 0) * 100);
          const next = (current - Math.round(price * 100)) / 100;

          const { error: updError } = await supabase
            .from('client_budget_groups')
            .update({ shared_balance: next })
            .eq('id', groupId);

          if (updError) throw updError;

          // Keep personal balance at 0 for shared-budget clients
          await supabase.from('clients').update({ credit_balance: 0 }).eq('id', training.client_id);
        } else {
          // Update individual balance
          const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('credit_balance')
            .eq('id', training.client_id)
            .single();

          if (clientError) throw clientError;

          const current = Math.round((client.credit_balance || 0) * 100);
          const next = (current - Math.round(price * 100)) / 100;

          const { error: updError } = await supabase
            .from('clients')
            .update({ credit_balance: next })
            .eq('id', training.client_id);

          if (updError) throw updError;
        }
      }

      return { trainingId, paymentMethod };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid_trainings"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid_trainings_stats"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      
      toast({
        title: "Platba zaznamenána",
        description: "Trénink byl označen jako zaplacený.",
      });
    },
    onError: (error) => {
      console.error("Error paying training:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se zaznamenat platbu.",
        variant: "destructive",
      });
    },
  });
}
