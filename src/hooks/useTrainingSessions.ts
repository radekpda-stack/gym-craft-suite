import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type TrainingStatus = 'scheduled' | 'completed' | 'canceled';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

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

      // If status is changing to "completed" from another status, deduct credit
      if (
        oldTraining && 
        oldTraining.status !== "completed" && 
        input.status === "completed" && 
        trainingPrices
      ) {
        clientId = oldTraining.client_id;
        const participantCount = input.participant_count || oldTraining.participant_count || 1;
        
        if (participantCount >= 3) {
          price = trainingPrices["3"];
        } else if (participantCount === 2) {
          price = trainingPrices["2"];
        } else {
          price = trainingPrices["1"];
        }

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

      return { data, creditDeducted, price, newBalance, clientId };
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
      }

      return { data, price, newBalance, deductCredit };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      
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

      // Update training status to completed
      const updateData: Record<string, any> = {
        status: "completed",
        participant_count,
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

      return { training, price, newBalance };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["training_sessions", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", variables.client_id] });
      
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
