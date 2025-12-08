import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TrainingParticipant {
  id: string;
  training_session_id: string;
  client_id: string;
  price_share: number;
  created_at: string;
  user_id: string | null;
}

export interface CreateParticipantsInput {
  training_session_id: string;
  participants: Array<{
    client_id: string;
    price_share: number;
  }>;
}

export function useTrainingParticipants(trainingSessionId?: string) {
  return useQuery({
    queryKey: ["training_participants", trainingSessionId],
    queryFn: async () => {
      if (!trainingSessionId) return [];
      
      const { data, error } = await supabase
        .from("training_participants")
        .select("*")
        .eq("training_session_id", trainingSessionId);
      
      if (error) throw error;
      return data as TrainingParticipant[];
    },
    enabled: !!trainingSessionId,
  });
}

export function useSaveTrainingParticipants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ training_session_id, participants }: CreateParticipantsInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // First, delete existing participants for this training
      const { error: deleteError } = await supabase
        .from("training_participants")
        .delete()
        .eq("training_session_id", training_session_id);

      if (deleteError) throw deleteError;

      // Insert new participants
      if (participants.length > 0) {
        const participantRecords = participants.map(p => ({
          training_session_id,
          client_id: p.client_id,
          price_share: p.price_share,
          user_id: user.id,
        }));

        const { error: insertError } = await supabase
          .from("training_participants")
          .insert(participantRecords);

        if (insertError) throw insertError;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["training_participants", variables.training_session_id] });
    },
    onError: (error) => {
      console.error("Error saving training participants:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit účastníky tréninku.",
        variant: "destructive",
      });
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

  if (error) {
    console.error("Error checking budget group:", error);
    return null;
  }
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

  const newBalance = (group.shared_balance || 0) + amount;

  const { error: updateError } = await supabase
    .from("client_budget_groups")
    .update({ shared_balance: newBalance })
    .eq("id", groupId);

  if (updateError) throw updateError;

  return newBalance;
}

export function useDeductParticipantsCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      training_session_id, 
      participants,
      description
    }: { 
      training_session_id: string;
      participants: Array<{ client_id: string; price_share: number }>;
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Group participants by their budget group to avoid duplicate deductions
      const processedGroups = new Set<string>();

      // Deduct credit from each participant
      for (const participant of participants) {
        if (participant.price_share <= 0) continue;

        // Check if client is in a shared budget group
        const budgetGroup = await getClientBudgetGroup(participant.client_id);
        const isSharedBudget = !!budgetGroup?.group_id;
        const groupId = budgetGroup?.group_id;

        // Create credit transaction
        const { error: transactionError } = await supabase
          .from("credit_transactions")
          .insert({
            client_id: participant.client_id,
            amount: -participant.price_share,
            type: "training",
            description: description || `Trénink${isSharedBudget ? ' (sdílený budget)' : ''}`,
            training_session_id,
            user_id: user.id,
            group_id: groupId || null,
          });

        if (transactionError) throw transactionError;

        if (isSharedBudget && groupId) {
          // For shared budgets, only deduct once per group
          if (!processedGroups.has(groupId)) {
            await updateSharedBudgetBalance(groupId, -participant.price_share);
            processedGroups.add(groupId);
          }
        } else {
          // Update individual client's credit balance
          const { data: client, error: clientError } = await supabase
            .from("clients")
            .select("credit_balance")
            .eq("id", participant.client_id)
            .single();

          if (clientError) throw clientError;

          const newBalance = (client.credit_balance || 0) - participant.price_share;

          const { error: updateError } = await supabase
            .from("clients")
            .update({ credit_balance: newBalance })
            .eq("id", participant.client_id);

          if (updateError) throw updateError;
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      queryClient.invalidateQueries({ queryKey: ["shared_budget_transactions"] });
    },
    onError: (error) => {
      console.error("Error deducting participant credits:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odečíst kredit účastníkům.",
        variant: "destructive",
      });
    },
  });
}
