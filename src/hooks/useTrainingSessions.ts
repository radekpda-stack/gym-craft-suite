import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toLocalISOString } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { featureTracker } from "@/hooks/useFeatureTracking";
import { getClientGroupId } from "./useCreditOperations";
import { useDemoMode } from "@/contexts/DemoContext";
import { prepareEntryWithPR, recomputePRsAfterChange } from '@/lib/prEngine';

export type TrainingStatus = 'scheduled' | 'in_progress' | 'completed' | 'canceled';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type PaymentStatus = 'pending' | 'paid_credit' | 'paid_cash' | 'paid_card' | 'paid_bank';
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
  cancellation_reason: string | null;
  participant_count: number;
  recurrence_type: string | null;
  recurrence_end_date: string | null;
  parent_session_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  // Payment fields
  payment_status: PaymentStatus | string | null;
  final_price: number | null;
  payment_method: PaymentMethod | string | null;
  // Enhanced training fields
  training_type: string | null;
  training_goal: string | null;
  rpe: number | null;
  rir: number | null;
  total_volume: number | null;
  intensity_notes: string | null;
  subjective_difficulty: number | null;
  trainer_went_well: string | null;
  trainer_problems: string | null;
  trainer_recommendations: string | null;
  // New pre/post training fields
  prep_notes: string | null;
  pain_reported: boolean;
  pain_notes: string | null;
  // RPE and Training Load fields
  client_rpe: number | null;
  training_load: number | null;
  // Session diary fields
  session_notes: string | null;
  next_session_focus: string | null;
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
  training_type?: string;
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
  // Enhanced training fields
  training_type?: string;
  training_goal?: string;
  rpe?: number | null;
  rir?: number | null;
  total_volume?: number | null;
  intensity_notes?: string;
  subjective_difficulty?: number | null;
  trainer_went_well?: string;
  trainer_problems?: string;
  trainer_recommendations?: string;
  // New pre/post training fields
  prep_notes?: string;
  pain_reported?: boolean;
  pain_notes?: string;
  session_notes?: string;
  next_session_focus?: string;
}

export function useTrainingSessions(clientId?: string) {
  const { isDemo, demoTraining } = useDemoMode();
  
  return useQuery({
    queryKey: ["training_sessions", clientId, isDemo],
    staleTime: 1000 * 60 * 2, // 2 minutes
    queryFn: async () => {
      // In demo mode, return demo training data
      if (isDemo && demoTraining) {
        const demoSession: TrainingSession = {
          id: demoTraining.id,
          client_id: demoTraining.client_id,
          date: demoTraining.date,
          duration: demoTraining.duration,
          notes: demoTraining.notes,
          subjective_rating: demoTraining.subjective_rating,
          status: demoTraining.status as TrainingStatus,
          canceled_at: null,
          is_late_cancellation: false,
          cancellation_reason: null,
          participant_count: demoTraining.participant_count,
          recurrence_type: null,
          recurrence_end_date: null,
          parent_session_id: null,
          created_at: demoTraining.created_at,
          updated_at: demoTraining.updated_at,
          user_id: 'demo-admin-0001',
          payment_status: demoTraining.payment_status as PaymentStatus,
          final_price: demoTraining.final_price,
          payment_method: null,
          training_type: demoTraining.training_type,
          training_goal: demoTraining.training_goal,
          rpe: null,
          rir: null,
          total_volume: null,
          intensity_notes: null,
          subjective_difficulty: null,
          trainer_went_well: null,
          trainer_problems: null,
          trainer_recommendations: null,
          prep_notes: null,
          pain_reported: false,
          pain_notes: null,
          client_rpe: null,
          training_load: null,
          session_notes: null,
          next_session_focus: null,
        };
        
        if (clientId && demoSession.client_id !== clientId) {
          return [] as TrainingSession[];
        }
        return [demoSession] as TrainingSession[];
      }
      
      // If clientId is provided, we need to get sessions where client is:
      // 1. Primary client (client_id = clientId) 
      // 2. OR a participant (via training_participants table)
      if (clientId) {
        // Fetch primary sessions and participant sessions in parallel
        const [participantResult, primaryResult] = await Promise.all([
          supabase
            .from("training_participants")
            .select("training_session_id")
            .eq("client_id", clientId),
          supabase
            .from("training_sessions")
            .select("id, client_id, date, duration, notes, subjective_rating, status, canceled_at, is_late_cancellation, cancellation_reason, participant_count, recurrence_type, recurrence_end_date, parent_session_id, created_at, updated_at, user_id, payment_status, final_price, payment_method, training_type, training_goal, rpe, rir, total_volume, intensity_notes, subjective_difficulty, trainer_went_well, trainer_problems, trainer_recommendations, prep_notes, pain_reported, pain_notes, client_rpe, training_load")
            .eq("client_id", clientId)
            .order("date", { ascending: false })
        ]);
        
        if (primaryResult.error) throw primaryResult.error;
        
        const participantSessionIds = participantResult.data?.map(p => p.training_session_id) || [];
        
        // Get sessions where client is participant but not primary
        let participantOnlySessions: TrainingSession[] = [];
        if (participantSessionIds.length > 0) {
          const { data: partSessions, error: partError } = await supabase
            .from("training_sessions")
            .select("id, client_id, date, duration, notes, subjective_rating, status, canceled_at, is_late_cancellation, cancellation_reason, participant_count, recurrence_type, recurrence_end_date, parent_session_id, created_at, updated_at, user_id, payment_status, final_price, payment_method, training_type, training_goal, rpe, rir, total_volume, intensity_notes, subjective_difficulty, trainer_went_well, trainer_problems, trainer_recommendations, prep_notes, pain_reported, pain_notes, client_rpe, training_load")
            .in("id", participantSessionIds)
            .neq("client_id", clientId)
            .order("date", { ascending: false });
          
          if (partError) throw partError;
          participantOnlySessions = (partSessions || []) as TrainingSession[];
        }
        
        // Combine and sort by date
        const allSessions = [...(primaryResult.data || []), ...participantOnlySessions] as TrainingSession[];
        
        // Add clientRole to each session
        const sessionsWithRole = allSessions.map(session => ({
          ...session,
          clientRole: session.client_id === clientId ? 'primary' : 'participant',
        }));
        
        // Sort by date descending
        sessionsWithRole.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return sessionsWithRole as (TrainingSession & { clientRole: 'primary' | 'participant' })[];
      }
      
      // If no clientId, get all sessions with specific columns
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, client_id, date, duration, notes, subjective_rating, status, canceled_at, is_late_cancellation, cancellation_reason, participant_count, recurrence_type, recurrence_end_date, parent_session_id, created_at, updated_at, user_id, payment_status, final_price, payment_method, training_type, training_goal, rpe, rir, total_volume, intensity_notes, subjective_difficulty, trainer_went_well, trainer_problems, trainer_recommendations, prep_notes, pain_reported, pain_notes, client_rpe, training_load")
        .order("date", { ascending: false });
        
      if (error) throw error;
      return data as TrainingSession[];
    },
  });
}

export function useTrainingSession(trainingId?: string) {
  return useQuery({
    queryKey: ["training_session", trainingId],
    staleTime: 1000 * 60 * 1, // 1 minute for single session
    queryFn: async () => {
      if (!trainingId) return null;
      
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, client_id, date, duration, notes, subjective_rating, status, canceled_at, is_late_cancellation, cancellation_reason, participant_count, recurrence_type, recurrence_end_date, parent_session_id, created_at, updated_at, user_id, payment_status, final_price, payment_method, training_type, training_goal, rpe, rir, total_volume, intensity_notes, subjective_difficulty, trainer_went_well, trainer_problems, trainer_recommendations, prep_notes, pain_reported, pain_notes, client_rpe, training_load")
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
  const { isDemo, canCreateTraining } = useDemoMode();

  return useMutation({
    mutationFn: async (input: CreateTrainingInput & { trainingPrices?: { "1": number; "2": number; "3": number } }) => {
      // Block in demo mode if limit reached
      if (isDemo && !canCreateTraining) {
        throw new Error("DEMO_LIMIT: V demo režimu lze vytvořit pouze 1 trénink.");
      }
      
      // In demo mode, simulate creation without DB
      if (isDemo) {
        return {
          session: {
            id: 'demo-new-training',
            client_id: input.client_id,
            date: input.date,
            duration: input.duration || 60,
            status: input.status || 'scheduled',
            created_at: new Date().toISOString(),
          },
          createdCount: 1,
        };
      }
      
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
          training_type: input.training_type || null,
        })
        .select()
        .single();

      if (parentError) throw parentError;

      // Auto-add primary client as participant
      await supabase
        .from("training_participants")
        .insert({
          training_session_id: parentSession.id,
          client_id: input.client_id,
          price_share: 0, // Will be set when completing training
          user_id: user.id,
        });

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
            date: toLocalISOString(date.toString()),
            duration: input.duration || 60,
            notes: input.notes || "",
            subjective_rating: null,
            status: "scheduled" as const,
            participant_count: input.participant_count || 1,
            parent_session_id: parentSession.id,
            user_id: user.id,
          }));

          const { data: createdChildren, error: childError } = await supabase
            .from("training_sessions")
            .insert(childSessions)
            .select("id");

          if (childError) throw childError;
          
          // Add primary client as participant for each child session
          if (createdChildren && createdChildren.length > 0) {
            const childParticipants = createdChildren.map(child => ({
              training_session_id: child.id,
              client_id: input.client_id,
              price_share: 0,
              user_id: user.id,
            }));
            
            await supabase
              .from("training_participants")
              .insert(childParticipants);
          }
          
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

            // Trigger fn_sync_client_credit_balance handles cached balance update automatically
      }

      return { session: parentSession, createdCount };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["training_sessions", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["training-sessions-today-slots"] });
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
    onError: () => {
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
        
        // Calculate price based on participant count - always set final_price
        if (trainingPrices) {
          const participantCount = input.participant_count || oldTraining.participant_count || 1;
          
          if (participantCount >= 3) {
            price = trainingPrices["3"];
          } else if (participantCount === 2) {
            price = trainingPrices["2"];
          } else {
            price = trainingPrices["1"];
          }

          // Always update final_price when completing training
          // Payment status and method are set based on input or default to credit
          const paymentStatus = input.payment_status || "paid_credit";
          const paymentMethod = input.payment_method || "credit";
          const shouldDeductCredit = paymentStatus === "paid_credit";

          await supabase
            .from("training_sessions")
            .update({
              payment_status: paymentStatus,
              final_price: price,
              payment_method: paymentMethod,
            })
            .eq("id", id);

          // Only create credit transaction if paying by credit
          if (shouldDeductCredit) {
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

            // Trigger fn_sync_client_credit_balance handles cached balance update automatically
            // Read updated balance from ledger view
            const { data: ledger } = await supabase
              .from('vw_client_ledger_balances')
              .select('ledger_balance')
              .eq('client_id', oldTraining.client_id)
              .maybeSingle();
            newBalance = ledger?.ledger_balance ?? 0;
            creditDeducted = true;
          }
        } else if (input.final_price) {
          // If no trainingPrices but final_price is in input, use that
          price = input.final_price;
        }
        
        // Auto-sync workout entries to exercise_entries when training is completed
        await syncWorkoutToExerciseEntries(id, oldTraining.client_id, data.date, user.id);

        // Auto-generate feedback link for completed training
        try {
          const { data: client } = await supabase
            .from("clients")
            .select("feedback_enabled")
            .eq("id", oldTraining.client_id)
            .single();

          if (client?.feedback_enabled !== false) {
            await supabase.functions.invoke('create-feedback-link', {
              body: {
                client_id: oldTraining.client_id,
                training_id: id,
                // Always use production URL for public feedback links
                base_url: 'https://justmoveasistent.lovable.app',
              },
            });
          }
        } catch (feedbackError) {
          console.warn('Failed to auto-generate feedback link (update path):', feedbackError);
        }
      }

      return { data, creditDeducted, price, newBalance, clientId, shouldSyncWorkout };
    },
    onSuccess: (result) => {
      // Invalidate the specific training session query (singular)
      queryClient.invalidateQueries({ queryKey: ["training_session", result.data.id] });
      // Invalidate the list of all training sessions
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
    onError: () => {
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
    mutationFn: async ({ id, captureForUndo }: { id: string; captureForUndo?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Always fetch training data (needed for refund check + optional undo)
      const { data: trainingData } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("id", id)
        .single();

      let refundAmount = 0;

      // C1 fix: If training was completed and paid via credit, create compensating refund
      if (trainingData && trainingData.status === 'completed' && trainingData.payment_status === 'paid_credit' && trainingData.final_price) {
        refundAmount = trainingData.final_price;
        const groupId = await getClientGroupId(trainingData.client_id);

        const { error: txError } = await supabase
          .from("credit_transactions")
          .insert({
            client_id: trainingData.client_id,
            amount: +refundAmount,
            type: "manual",
            description: "Vratka za smazaný trénink",
            training_session_id: id,
            user_id: user.id,
            group_id: groupId,
          });

        if (txError) throw txError;
      }

      const { error } = await supabase
        .from("training_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      return { trainingData: captureForUndo ? trainingData : null, refundAmount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      featureTracker.track('training_delete', 'trainings');

      if (result.refundAmount > 0) {
        toast({
          title: "Trénink smazán",
          description: `Kredit vrácen: +${result.refundAmount} Kč`,
        });
      } else {
        toast({
          title: "Trénink smazán",
          description: "Trénink byl úspěšně odstraněn.",
        });
      }
    },
    onError: () => {
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
      deductCredit = true,
      cancelNote
    }: { 
      id: string; 
      client_id: string;
      participant_count: number;
      isLateCancellation: boolean;
      trainingPrices: { "1": number; "2": number; "3": number };
      deductCredit?: boolean;
      cancelNote?: string;
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
      const updateData: Record<string, any> = {
        status: "canceled",
        canceled_at: new Date().toISOString(),
        is_late_cancellation: isLateCancellation,
      };
      
      // Add cancellation reason if provided
      if (cancelNote) {
        updateData.cancellation_reason = cancelNote;
      }
      
      const { data, error } = await supabase
        .from("training_sessions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      let newBalance: number | null = null;

      // Only create credit transaction if deductCredit is true
      // The DB trigger 'sync_balance_after_transaction' automatically updates the balance
      if (deductCredit && price > 0) {
        const groupId = await getClientGroupId(client_id);

        const { error: transactionError } = await supabase
          .from("credit_transactions")
          .insert({
            client_id,
            amount: -price,
            type: "canceled_training",
            description: `Zrušený trénink${isLateCancellation ? ' (pozdě)' : ''} (${participant_count} ${participant_count === 1 ? 'osoba' : participant_count < 5 ? 'osoby' : 'osob'})`,
            training_session_id: id,
            user_id: user.id,
            group_id: groupId,
          });

        if (transactionError) throw transactionError;

        // Fetch the updated balance from ledger views (trigger already applied the sync)
        if (groupId) {
          const { data: gl } = await supabase
            .from('vw_group_ledger_balances')
            .select('ledger_balance')
            .eq('group_id', groupId)
            .maybeSingle();
          newBalance = gl?.ledger_balance ?? null;
        } else {
          const { data: cl } = await supabase
            .from('vw_client_ledger_balances')
            .select('ledger_balance')
            .eq('client_id', client_id)
            .maybeSingle();
          newBalance = cl?.ledger_balance ?? null;
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

// Removed: local credit helper functions (getClientGroupId, updateSharedBalance, updateClientBalance, applyCreditDelta)
// Now using centralized functions from useCreditOperations

export interface CompleteTrainingInput {
  id: string;
  client_id: string;
  participant_count: number;
  subjective_rating?: number;
  notes?: string;
}

// C3: useCompleteTrainingSession removed — dead code, all paths use useCompleteTrainingAtomic

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
      // Check if this is a time-based exercise
      const hasTimeData = group.entries.some((e: any) => e.time_seconds && e.time_seconds > 0);
      
      let bestSet = group.entries[0];
      
      if (hasTimeData) {
        // For time-based: find lowest time
        let bestTime = bestSet.time_seconds || Infinity;
        for (const entry of group.entries) {
          if (entry.time_seconds && entry.time_seconds > 0 && entry.time_seconds < bestTime) {
            bestSet = entry;
            bestTime = entry.time_seconds;
          }
        }
      } else {
        // For strength: find highest weight × reps
        let bestVolume = (bestSet.weight_kg || 0) * (bestSet.reps || 0);
        for (const entry of group.entries) {
          const volume = (entry.weight_kg || 0) * (entry.reps || 0);
          if (volume > bestVolume) {
            bestSet = entry;
            bestVolume = volume;
          }
        }
      }

      // Check if entry already exists for this exercise and date
      const { data: existingEntry } = await supabase
        .from('exercise_entries')
        .select('id')
        .eq('client_id', clientId)
        .eq('exercise_name', group.exercise_name)
        .eq('date', exerciseDate)
        .eq('user_id', userId)
        .maybeSingle();

      // Use PR Engine to prepare entry with computed fields
      const { fields } = await prepareEntryWithPR({
        client_id: clientId,
        exercise_id: group.exercise_id,
        exercise_name: group.exercise_name,
        weight_kg: bestSet.weight_kg,
        time_seconds: bestSet.time_seconds,
        distance_meters: bestSet.distance_meters,
        avg_watts: bestSet.watts,
        reps: bestSet.reps,
      }, existingEntry?.id);

      const entryData = {
        client_id: clientId,
        exercise_id: group.exercise_id,
        exercise_name: group.exercise_name,
        sets: group.entries.length,
        reps: bestSet.reps,
        weight_kg: bestSet.weight_kg,
        time_seconds: bestSet.time_seconds,
        distance_meters: bestSet.distance_meters,
        is_pr: fields.is_pr,
        metric_key: fields.metric_key,
        side_scope: fields.side_scope,
        pr_scope_key: fields.pr_scope_key,
        date: exerciseDate,
        user_id: userId,
        notes: bestSet.notes || '',
        avg_watts: bestSet.watts,
        level: bestSet.level,
        resistance: bestSet.resistance,
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

      // Recompute PRs for the affected scope to ensure consistency
      await recomputePRsAfterChange({
        client_id: clientId,
        exercise_id: group.exercise_id,
        exercise_name: group.exercise_name,
        weight_kg: bestSet.weight_kg,
        time_seconds: bestSet.time_seconds,
        distance_meters: bestSet.distance_meters,
        avg_watts: bestSet.watts,
        reps: bestSet.reps,
      });
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

      const paymentLabels: Record<string, string> = {
        paid_credit: 'kredit',
        paid_cash: 'hotovost',
        paid_card: 'karta',
        paid_bank: 'převod',
        pending: 'nezaplaceno',
      };

      // C6 fix: fetch groupId once and reuse
      const groupId = await getClientGroupId(clientId);

      // Handle credit balance changes
      if (wasCredit && !willBeCredit) {
        // Refund credit: was paid by credit, now changing to another method
        await supabase
          .from("credit_transactions")
          .insert({
            client_id: clientId,
            amount: +price,
            type: "manual",
            description: `Oprava platby - vrácení kreditu (změna na ${paymentLabels[newPaymentStatus]})`,
            training_session_id: trainingId,
            user_id: user.id,
            group_id: groupId,
          });
      } else if (!wasCredit && willBeCredit) {
        // Deduct credit: wasn't paid by credit, now changing to credit
        await supabase
          .from("credit_transactions")
          .insert({
            client_id: clientId,
            amount: -price,
            type: "training",
            description: "Trénink (změna platby na kredit)",
            training_session_id: trainingId,
            user_id: user.id,
            group_id: groupId,
          });
      }

      // Read updated balance from ledger view
      if (wasCredit !== willBeCredit) {
        if (groupId) {
          const { data: gl } = await supabase.from('vw_group_ledger_balances').select('ledger_balance').eq('group_id', groupId).maybeSingle();
          newBalance = gl?.ledger_balance ?? 0;
        } else {
          const { data: cl } = await supabase.from('vw_client_ledger_balances').select('ledger_balance').eq('client_id', clientId).maybeSingle();
          newBalance = cl?.ledger_balance ?? 0;
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
