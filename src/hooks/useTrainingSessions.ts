import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { featureTracker } from "@/hooks/useFeatureTracking";

export type TrainingStatus = 'scheduled' | 'completed' | 'canceled';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type PaymentStatus = 'pending' | 'unpaid' | 'paid_credit' | 'paid_cash' | 'paid_card' | 'paid_bank';
export type PaymentMethod = 'credit' | 'cash' | 'card' | 'bank' | null;

export interface TrainingSession {
  id: string;
  client_id: string;
  date: string;
  duration: number;
  notes: string;
  subjective_rating: number | null;
  status: TrainingStatus;
  canceled_at: string | null;
  is_late_cancellation: boolean;
  participant_count: number;
  recurrence_type: string | null;
  recurrence_end_date: string | null;
  parent_session_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  // New payment fields
  payment_status: PaymentStatus | string | null;
  final_price: number | null;
  payment_method: PaymentMethod | string | null;
}

export interface CreateTrainingInput {
  client_id: string;
  date: string;
  duration?: number;
  notes?: string;
  subjective_rating?: number;
  status?: TrainingStatus;
  participant_count?: number;
  recurrence_type?: RecurrenceType;
  recurrence_end_date?: string;
}

export interface UpdateTrainingInput {
  date?: string;
  duration?: number;
  notes?: string;
  subjective_rating?: number;
  status?: TrainingStatus;
  canceled_at?: string;
  is_late_cancellation?: boolean;
  participant_count?: number;
  payment_status?: PaymentStatus;
  final_price?: number;
  payment_method?: PaymentMethod;
}

export function useTrainingSessions(clientId?: string) {
  return useQuery({
    queryKey: ["training_sessions", clientId],
    queryFn: async () => {
      let query = supabase
        .from("training_sessions")
        .select("*")
        .order("date", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TrainingSession[];
    },
  });
}

export function useTrainingSession(trainingId?: string) {
  return useQuery({
    queryKey: ["training_session", trainingId],
    queryFn: async () => {
      if (!trainingId) return null;
      
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("id", trainingId)
        .single();
      
      if (error) throw error;
      return data as TrainingSession;
    },
    enabled: !!trainingId,
  });
}

// Helper function to generate recurring dates
function generateRecurringDates(
  startDate: Date,
  recurrenceType: RecurrenceType,
  endDate: Date
): Date[] {
  const dates: Date[] = [new Date(startDate)];
  let currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    let nextDate: Date;
    
    switch (recurrenceType) {
      case 'daily':
        nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default:
        return dates;
    }
    
    if (nextDate <= endDate) {
      dates.push(nextDate);
    }
    currentDate = nextDate;
  }
  
  return dates;
}

export function useCreateTrainingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTrainingInput & { trainingPrices?: { "1": number; "2": number; "3": number } }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const recurrenceType = input.recurrence_type || 'none';
      const hasRecurrence = recurrenceType !== 'none' && input.recurrence_end_date;
      
      // Create the first (parent) training session
      const { data: parentSession, error: parentError } = await supabase
        .from("training_sessions")
        .insert({
          client_id: input.client_id,
          date: input.date,
          duration: input.duration || 60,
          notes: input.notes || "",
          subjective_rating: input.subjective_rating || null,
          status: input.status || "scheduled",
          participant_count: input.participant_count || 1,
          recurrence_type: hasRecurrence ? recurrenceType : null,
          recurrence_end_date: hasRecurrence ? input.recurrence_end_date : null,
          user_id: user.id,
        })
        .select()
        .single();

      if (parentError) throw parentError;

      let createdCount = 1;

      // If there's recurrence, create child sessions
      if (hasRecurrence && input.recurrence_end_date) {
        const startDate = new Date(input.date);
        const endDate = new Date(input.recurrence_end_date);
        const recurringDates = generateRecurringDates(startDate, recurrenceType, endDate);
        
        // Skip the first date (already created as parent)
        const childDates = recurringDates.slice(1);
        
        if (childDates.length > 0) {
          const childSessions = childDates.map(date => ({
            client_id: input.client_id,
            date: date.toISOString(),
            duration: input.duration || 60,
            notes: input.notes || "",
            subjective_rating: null,
            status: "scheduled" as const,
            participant_count: input.participant_count || 1,
            parent_session_id: parentSession.id,
            user_id: user.id,
          }));

          const { error: childError } = await supabase
            .from("training_sessions")
            .insert(childSessions);

          if (childError) throw childError;
          createdCount += childDates.length;
        }
      }

      // If training is created with "completed" status, deduct credit
      if (input.status === "completed" && input.trainingPrices) {
        const participantCount = input.participant_count || 1;
        let price: number;
        if (participantCount >= 3) {
          price = input.trainingPrices["3"];
        } else if (participantCount === 2) {
          price = input.trainingPrices["2"];
        } else {
          price = input.trainingPrices["1"];
        }

        await supabase
          .from("credit_transactions")
          .insert({
            client_id: input.client_id,
            amount: -price,
            type: "training",
            description: `Trénink (${participantCount} ${participantCount === 1 ? 'osoba' : participantCount < 5 ? 'osoby' : 'osob'})`,
            training_session_id: parentSession.id,
            user_id: user.id,
          });

        const { data: client } = await supabase
          .from("clients")
          .select("credit_balance")
          .eq("id", input.client_id)
          .single();

        if (client) {
          const newBalance = (client.credit_balance || 0) - price;
          await supabase
            .from("clients")
            .update({ credit_balance: newBalance })
            .eq("id", input.client_id);
        }
      }

      return { session: parentSession, createdCount };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["training_sessions", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      featureTracker.track('training_create', 'trainings', { recurring: result.createdCount > 1 });
      
      const message = result.createdCount > 1
        ? `Vytvořeno ${result.createdCount} opakujících se tréninků.`
        : "Nový trénink byl úspěšně přidán.";
      
      toast({
        title: "Trénink vytvořen",
        description: message,
      });
    },
    onError: (error) => {
      console.error("Error creating training:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit trénink.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTrainingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      input, 
      trainingPrices 
    }: { 
      id: string; 
      input: UpdateTrainingInput; 
      trainingPrices?: { "1": number; "2": number; "3": number } 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // First, get the current training to check if status is changing to completed
      const { data: oldTraining } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("id", id)
        .single();

      const { data, error } = await supabase
        .from("training_sessions")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      let creditDeducted = false;
      let price = 0;
      let newBalance: number | null = null;
      let clientId: string | null = null;
      let shouldSyncWorkout = false;

      // If status is changing to "completed" from another status
      if (oldTraining && oldTraining.status !== "completed" && input.status === "completed") {
        clientId = oldTraining.client_id;
        shouldSyncWorkout = true;
        
        // Only deduct credit if trainingPrices provided (credit payment)
        if (trainingPrices) {
          const participantCount = input.participant_count || oldTraining.participant_count || 1;
          
          if (participantCount >= 3) {
            price = trainingPrices["3"];
          } else if (participantCount === 2) {
            price = trainingPrices["2"];
          } else {
            price = trainingPrices["1"];
          }

          // Update payment status to paid_credit when completing with credit
          await supabase
            .from("training_sessions")
            .update({
              payment_status: "paid_credit",
              final_price: price,
              payment_method: "credit",
            })
            .eq("id", id);

          // Create credit transaction
          const { error: transactionError } = await supabase
            .from("credit_transactions")
            .insert({
              client_id: oldTraining.client_id,
              amount: -price,
              type: "training",
              description: `Trénink (${participantCount} ${participantCount === 1 ? 'osoba' : participantCount < 5 ? 'osoby' : 'osob'})`,
              training_session_id: id,
              user_id: user.id,
            });

          if (transactionError) {
            console.error("Error creating credit transaction:", transactionError);
            throw transactionError;
          }

          // Update client's credit balance
          const { data: client } = await supabase
            .from("clients")
            .select("credit_balance")
            .eq("id", oldTraining.client_id)
            .single();

          if (client) {
            newBalance = (client.credit_balance || 0) - price;
            const { error: updateError } = await supabase
              .from("clients")
              .update({ credit_balance: newBalance })
              .eq("id", oldTraining.client_id);
              
            if (updateError) {
              console.error("Error updating client balance:", updateError);
              throw updateError;
            }
            
            creditDeducted = true;
          }
        }
        
        // Auto-sync workout entries to exercise_entries when training is completed
        await syncWorkoutToExerciseEntries(id, oldTraining.client_id, data.date, user.id);
      }

      return { data, creditDeducted, price, newBalance, clientId, shouldSyncWorkout };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      
      if (result.clientId) {
        queryClient.invalidateQueries({ queryKey: ["training_sessions", result.clientId] });
        queryClient.invalidateQueries({ queryKey: ["credit_transactions", result.clientId] });
        queryClient.invalidateQueries({ queryKey: ["client", result.clientId] });
      }

      // Invalidate exercise entries if workout was synced
      if (result.shouldSyncWorkout) {
        queryClient.invalidateQueries({ queryKey: ["exercise-entries"] });
      }
      
      featureTracker.track(result.creditDeducted ? 'training_complete' : 'training_update', 'trainings');
      
      if (result.creditDeducted) {
        toast({
          title: "Trénink dokončen",
          description: `Kredit snížen o ${result.price} Kč. Nový zůstatek: ${result.newBalance} Kč`,
        });
      } else {
        toast({
          title: "Trénink aktualizován",
          description: "Změny byly úspěšně uloženy.",
        });
      }
    },
    onError: (error) => {
      console.error("Error updating training:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat trénink.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTrainingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("training_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      featureTracker.track('training_delete', 'trainings');
      toast({
        title: "Trénink smazán",
        description: "Trénink byl úspěšně odstraněn.",
      });
    },
    onError: (error) => {
      console.error("Error deleting training:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat trénink.",
        variant: "destructive",
      });
    },
  });
}

export function useCancelTrainingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      client_id,
      participant_count,
      isLateCancellation,
      trainingPrices,
      deductCredit = true
    }: { 
      id: string; 
      client_id: string;
      participant_count: number;
      isLateCancellation: boolean;
      trainingPrices: { "1": number; "2": number; "3": number };
      deductCredit?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Calculate price based on participant count
      let price: number = 0;
      if (deductCredit) {
        if (participant_count >= 3) {
          price = trainingPrices["3"];
        } else if (participant_count === 2) {
          price = trainingPrices["2"];
        } else {
          price = trainingPrices["1"];
        }
      }

      // Update training status to canceled
      const { data, error } = await supabase
        .from("training_sessions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          is_late_cancellation: isLateCancellation,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      let newBalance: number | null = null;

      // Only create credit transaction if deductCredit is true
      if (deductCredit && price > 0) {
        const { error: transactionError } = await supabase
          .from("credit_transactions")
          .insert({
            client_id,
            amount: -price,
            type: "canceled_training",
            description: `Zrušený trénink${isLateCancellation ? ' (pozdě)' : ''} (${participant_count} ${participant_count === 1 ? 'osoba' : participant_count < 5 ? 'osoby' : 'osob'})`,
            training_session_id: id,
            user_id: user.id,
          });

        if (transactionError) throw transactionError;

        // Update client's credit balance
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("credit_balance")
          .eq("id", client_id)
          .single();

        if (clientError) throw clientError;

        newBalance = (client.credit_balance || 0) - price;

        const { error: updateError } = await supabase
          .from("clients")
          .update({ credit_balance: newBalance })
          .eq("id", client_id);

        if (updateError) throw updateError;

        // Sync credit across budget group members
        const { data: membership } = await supabase
          .from("client_budget_members")
          .select("group_id")
          .eq("client_id", client_id)
          .maybeSingle();

        if (membership) {
          const { data: allMembers } = await supabase
            .from("client_budget_members")
            .select("client_id")
            .eq("group_id", membership.group_id)
            .neq("client_id", client_id);

          if (allMembers && allMembers.length > 0) {
            const memberIds = allMembers.map(m => m.client_id);
            await supabase
              .from("clients")
              .update({ credit_balance: newBalance })
              .in("id", memberIds);
          }
        }
      }

      return { data, price, newBalance, deductCredit };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      featureTracker.track('training_cancel', 'trainings');
      
      if (result.deductCredit && result.price > 0) {
        toast({
          title: "Trénink zrušen",
          description: `Kredit snížen o ${result.price} Kč. Nový zůstatek: ${result.newBalance} Kč`,
        });
      } else {
        toast({
          title: "Trénink zrušen",
          description: "Trénink byl zrušen bez odečtení kreditu.",
        });
      }
    },
    onError: (error) => {
      console.error("Error canceling training:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se zrušit trénink.",
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

export interface CompleteTrainingInput {
  id: string;
  client_id: string;
  participant_count: number;
  subjective_rating?: number;
  notes?: string;
}

export function useCompleteTrainingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      client_id, 
      participant_count, 
      subjective_rating,
      notes,
      trainingPrices 
    }: CompleteTrainingInput & { trainingPrices: { "1": number; "2": number; "3": number } }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Calculate price based on participant count
      let price: number;
      if (participant_count >= 3) {
        price = trainingPrices["3"];
      } else if (participant_count === 2) {
        price = trainingPrices["2"];
      } else {
        price = trainingPrices["1"];
      }

      // Update training status to completed with paid_credit payment status
      const updateData: Record<string, any> = {
        status: "completed",
        participant_count,
        payment_status: "paid_credit", // Default to paid_credit when completing with credit deduction
        final_price: price,
        payment_method: "credit",
      };
      if (subjective_rating !== undefined) {
        updateData.subjective_rating = subjective_rating;
      }
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { data: training, error: trainingError } = await supabase
        .from("training_sessions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (trainingError) throw trainingError;

      // Create credit transaction (negative amount for deduction)
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          client_id,
          amount: -price,
          type: "training",
          description: `Trénink (${participant_count} ${participant_count === 1 ? 'osoba' : participant_count < 5 ? 'osoby' : 'osob'})`,
          training_session_id: id,
          user_id: user.id,
        });

      if (transactionError) throw transactionError;

      // Update client's credit balance
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("credit_balance")
        .eq("id", client_id)
        .single();

      if (clientError) throw clientError;

      const newBalance = (client.credit_balance || 0) - price;

      const { error: updateError } = await supabase
        .from("clients")
        .update({ credit_balance: newBalance })
        .eq("id", client_id);

      if (updateError) throw updateError;

      // Sync credit across budget group members
      await syncBudgetGroupCredit(client_id, newBalance);

      // Auto-sync workout entries to exercise_entries
      await syncWorkoutToExerciseEntries(id, client_id, training.date, user.id);

      return { training, price, newBalance };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["training_sessions", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      queryClient.invalidateQueries({ queryKey: ["exercise-entries"] });
      
      toast({
        title: "Trénink dokončen",
        description: `Kredit snížen o ${result.price} Kč. Nový zůstatek: ${result.newBalance} Kč`,
      });
    },
    onError: (error) => {
      console.error("Error completing training:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se dokončit trénink.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Auto-sync workout_entries to exercise_entries when training is completed
 */
async function syncWorkoutToExerciseEntries(
  trainingSessionId: string,
  clientId: string,
  trainingDate: string,
  userId: string
) {
  try {
    // Get all workout entries for this training
    const { data: workoutEntries, error: fetchError } = await supabase
      .from('workout_entries')
      .select('*')
      .eq('training_session_id', trainingSessionId);

    if (fetchError) {
      console.error('Error fetching workout entries for sync:', fetchError);
      return;
    }
    
    if (!workoutEntries || workoutEntries.length === 0) return;

    const exerciseDate = trainingDate.split('T')[0];

    // Group by exercise
    const exerciseGroups = workoutEntries.reduce((acc, entry) => {
      const key = `${entry.exercise_name}|${entry.exercise_id || 'null'}`;
      if (!acc[key]) {
        acc[key] = {
          exercise_id: entry.exercise_id,
          exercise_name: entry.exercise_name,
          entries: [],
        };
      }
      acc[key].entries.push(entry);
      return acc;
    }, {} as Record<string, { exercise_id: string | null; exercise_name: string; entries: any[] }>);

    // For each exercise, find the best set and upsert to exercise_entries
    for (const group of Object.values(exerciseGroups)) {
      // Find best set (highest weight × reps)
      let bestSet = group.entries[0];
      let bestVolume = (bestSet.weight_kg || 0) * (bestSet.reps || 0);

      for (const entry of group.entries) {
        const volume = (entry.weight_kg || 0) * (entry.reps || 0);
        if (volume > bestVolume) {
          bestSet = entry;
          bestVolume = volume;
        }
      }

      // Check if entry already exists for this exercise and date
      const { data: existingEntry } = await supabase
        .from('exercise_entries')
        .select('id, weight_kg')
        .eq('client_id', clientId)
        .eq('exercise_name', group.exercise_name)
        .eq('date', exerciseDate)
        .eq('user_id', userId)
        .maybeSingle();

      // Check if this is a PR (compare against all previous records)
      const { data: previousBest } = await supabase
        .from('exercise_entries')
        .select('weight_kg')
        .eq('client_id', clientId)
        .eq('exercise_name', group.exercise_name)
        .eq('user_id', userId)
        .neq('date', exerciseDate)
        .order('weight_kg', { ascending: false, nullsFirst: false })
        .limit(1);

      const isPR = !previousBest || previousBest.length === 0 || 
        (bestSet.weight_kg || 0) > (previousBest[0].weight_kg || 0);

      const entryData = {
        client_id: clientId,
        exercise_id: group.exercise_id,
        exercise_name: group.exercise_name,
        sets: group.entries.length,
        reps: bestSet.reps,
        weight_kg: bestSet.weight_kg,
        is_pr: isPR,
        date: exerciseDate,
        user_id: userId,
        notes: bestSet.notes || '',
      };

      if (existingEntry) {
        // Update existing entry (merge)
        const { error: updateError } = await supabase
          .from('exercise_entries')
          .update(entryData)
          .eq('id', existingEntry.id);

        if (updateError) {
          console.error('Error updating exercise entry:', updateError);
        }
      } else {
        // Insert new entry
        const { error: insertError } = await supabase
          .from('exercise_entries')
          .insert(entryData);

        if (insertError) {
          console.error('Error inserting exercise entry:', insertError);
        }
      }
    }
  } catch (error) {
    console.error('Error syncing workout entries:', error);
  }
}

export type ChangePaymentMethodInput = {
  trainingId: string;
  clientId: string;
  currentPaymentStatus: string | null;
  newPaymentStatus: 'paid_credit' | 'paid_cash' | 'paid_card' | 'paid_bank' | 'pending';
  price: number;
};

export function useChangePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trainingId,
      clientId,
      currentPaymentStatus,
      newPaymentStatus,
      price,
    }: ChangePaymentMethodInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const wasCredit = currentPaymentStatus === 'paid_credit';
      const willBeCredit = newPaymentStatus === 'paid_credit';

      // Update training payment status
      const { error: updateError } = await supabase
        .from("training_sessions")
        .update({
          payment_status: newPaymentStatus,
          payment_method: newPaymentStatus === 'paid_credit' ? 'credit' :
                         newPaymentStatus === 'paid_cash' ? 'cash' :
                         newPaymentStatus === 'paid_card' ? 'card' :
                         newPaymentStatus === 'paid_bank' ? 'bank' : null,
        })
        .eq("id", trainingId);

      if (updateError) throw updateError;

      let newBalance: number | null = null;

      // Handle credit balance changes
      if (wasCredit && !willBeCredit) {
        // Refund credit: was paid by credit, now changing to another method
        // Delete the credit transaction
        await supabase
          .from("credit_transactions")
          .delete()
          .eq("training_session_id", trainingId)
          .eq("type", "training");

        // Add the amount back to client
        const { data: client } = await supabase
          .from("clients")
          .select("credit_balance")
          .eq("id", clientId)
          .single();

        if (client) {
          newBalance = (client.credit_balance || 0) + price;
          await supabase
            .from("clients")
            .update({ credit_balance: newBalance })
            .eq("id", clientId);

          // Sync budget group
          await syncBudgetGroupCredit(clientId, newBalance);
        }
      } else if (!wasCredit && willBeCredit) {
        // Deduct credit: wasn't paid by credit, now changing to credit
        // Create credit transaction
        await supabase
          .from("credit_transactions")
          .insert({
            client_id: clientId,
            amount: -price,
            type: "training",
            description: "Trénink (změna platby na kredit)",
            training_session_id: trainingId,
            user_id: user.id,
          });

        // Deduct from client
        const { data: client } = await supabase
          .from("clients")
          .select("credit_balance")
          .eq("id", clientId)
          .single();

        if (client) {
          newBalance = (client.credit_balance || 0) - price;
          await supabase
            .from("clients")
            .update({ credit_balance: newBalance })
            .eq("id", clientId);

          // Sync budget group
          await syncBudgetGroupCredit(clientId, newBalance);
        }
      }

      return { newPaymentStatus, newBalance, wasCredit, willBeCredit, price };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["training_session", variables.trainingId] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });

      const paymentLabels: Record<string, string> = {
        paid_credit: 'kredit',
        paid_cash: 'hotovost',
        paid_card: 'karta',
        paid_bank: 'převod',
        pending: 'nezaplaceno',
      };

      let description = `Platba změněna na: ${paymentLabels[result.newPaymentStatus]}`;
      
      if (result.wasCredit && !result.willBeCredit && result.newBalance !== null) {
        description += `. Kredit vrácen (+${result.price} Kč). Nový zůstatek: ${result.newBalance} Kč`;
      } else if (!result.wasCredit && result.willBeCredit && result.newBalance !== null) {
        description += `. Kredit odečten (-${result.price} Kč). Nový zůstatek: ${result.newBalance} Kč`;
      }

      toast({
        title: "Platba aktualizována",
        description,
      });
    },
    onError: (error) => {
      console.error("Error changing payment method:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit způsob platby.",
        variant: "destructive",
      });
    },
  });
}
