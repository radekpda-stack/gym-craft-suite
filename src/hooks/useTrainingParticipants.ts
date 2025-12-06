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

// Helper function to sync budget group credit
async function syncBudgetGroupCredit(clientId: string, newBalance: number) {
  // Get the budget group for this client
  const { data: membership, error: memberError } = await supabase
    .from("client_budget_members")
    .select("group_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (memberError) {
    console.error("Error checking budget group:", memberError);
    return;
  }
  
  if (!membership) return; // Client not in a group

  // Get all other members in the group
  const { data: allMembers, error: membersError } = await supabase
    .from("client_budget_members")
    .select("client_id")
    .eq("group_id", membership.group_id)
    .neq("client_id", clientId);

  if (membersError) {
    console.error("Error getting group members:", membersError);
    return;
  }

  // Update credit balance for all group members
  if (allMembers && allMembers.length > 0) {
    const memberIds = allMembers.map(m => m.client_id);
    
    const { error: updateError } = await supabase
      .from("clients")
      .update({ credit_balance: newBalance })
      .in("id", memberIds);

    if (updateError) {
      console.error("Error syncing group credit:", updateError);
    }
  }
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

      // Deduct credit from each participant
      for (const participant of participants) {
        if (participant.price_share <= 0) continue;

        // Create credit transaction
        const { error: transactionError } = await supabase
          .from("credit_transactions")
          .insert({
            client_id: participant.client_id,
            amount: -participant.price_share,
            type: "training",
            description: description || `Trénink (sdílený)`,
            training_session_id,
            user_id: user.id,
          });

        if (transactionError) throw transactionError;

        // Update client's credit balance
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

        // Sync credit across budget group members
        await syncBudgetGroupCredit(participant.client_id, newBalance);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
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
