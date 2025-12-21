import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  getClientBudgetGroup, 
  updateSharedBalance, 
  updateClientBalance 
} from "./useCreditOperations";

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

interface ParticipantWithBudgetInfo {
  client_id: string;
  price_share: number;
  groupId: string | null;
  clientName?: string;
}

export function useDeductParticipantsCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      training_session_id, 
      participants,
      totalPrice,
      description
    }: { 
      training_session_id: string;
      participants: Array<{ client_id: string; price_share: number }>;
      totalPrice: number;
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Step 1: Get budget group info for each participant
      const participantsWithBudget: ParticipantWithBudgetInfo[] = await Promise.all(
        participants.map(async (p) => {
          const budgetGroup = await getClientBudgetGroup(p.client_id);
          return {
            ...p,
            groupId: budgetGroup?.group_id || null,
          };
        })
      );

      // Step 2: Group participants by their shared budget group
      const sharedBudgetGroups = new Map<string, ParticipantWithBudgetInfo[]>();
      const individualParticipants: ParticipantWithBudgetInfo[] = [];

      for (const p of participantsWithBudget) {
        if (p.groupId) {
          const existing = sharedBudgetGroups.get(p.groupId) || [];
          existing.push(p);
          sharedBudgetGroups.set(p.groupId, existing);
        } else {
          individualParticipants.push(p);
        }
      }

      // Step 3: Process shared budget groups - deduct TOTAL training price ONCE per group
      for (const [groupId, groupParticipants] of sharedBudgetGroups) {
        // Fetch client names for description
        const clientIds = groupParticipants.map(p => p.client_id);
        const { data: clients } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", clientIds);
        
        const clientNames = clients?.map(c => c.name).join(", ") || "";
        const participantCount = groupParticipants.length;
        
        // Create ONE summary transaction for the shared budget
        const transactionDescription = participantCount > 1 
          ? `Trénink (${participantCount} osoby: ${clientNames})`
          : description || "Trénink (sdílený budget)";

        const { error: transactionError } = await supabase
          .from("credit_transactions")
          .insert({
            client_id: groupParticipants[0].client_id, // Primary participant
            amount: -totalPrice, // Deduct TOTAL training price
            type: "training",
            description: transactionDescription,
            training_session_id,
            user_id: user.id,
            group_id: groupId,
          });

        if (transactionError) throw transactionError;

        // Deduct total price from shared budget ONCE
        await updateSharedBalance(groupId, -totalPrice);
      }

      // Step 4: Process individual participants - deduct their share
      for (const participant of individualParticipants) {
        if (participant.price_share <= 0) continue;

        // Create transaction for individual participant
        const { error: transactionError } = await supabase
          .from("credit_transactions")
          .insert({
            client_id: participant.client_id,
            amount: -participant.price_share,
            type: "training",
            description: description || "Trénink",
            training_session_id,
            user_id: user.id,
            group_id: null,
          });

        if (transactionError) throw transactionError;

        // Deduct from individual client balance
        await updateClientBalance(participant.client_id, -participant.price_share);
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
