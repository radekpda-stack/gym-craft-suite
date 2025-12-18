import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { addDays, startOfWeek, setHours, setMinutes, format } from "date-fns";

export interface RecurringSchedule {
  id: string;
  client_id: string;
  day_of_week: number; // 1 = Monday, 7 = Sunday
  time: string; // HH:MM:SS format
  duration: number;
  is_active: boolean;
  notes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRecurringScheduleInput {
  client_id: string;
  day_of_week: number;
  time: string;
  duration?: number;
  notes?: string;
}

export interface UpdateRecurringScheduleInput {
  day_of_week?: number;
  time?: string;
  duration?: number;
  is_active?: boolean;
  notes?: string;
}

const DAY_NAMES = ['', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] || '';
}

export function useRecurringSchedules(clientId?: string) {
  return useQuery({
    queryKey: ["recurring_schedules", clientId],
    queryFn: async () => {
      let query = supabase
        .from("client_recurring_schedules")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("time", { ascending: true });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RecurringSchedule[];
    },
    enabled: !!clientId,
  });
}

export function useCreateRecurringSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRecurringScheduleInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("client_recurring_schedules")
        .insert({
          client_id: input.client_id,
          day_of_week: input.day_of_week,
          time: input.time,
          duration: input.duration || 60,
          notes: input.notes || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as RecurringSchedule;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recurring_schedules", variables.client_id] });
      toast({
        title: "Pravidelný trénink přidán",
        description: `Trénink naplánován na ${getDayName(variables.day_of_week)}.`,
      });
    },
    onError: (error) => {
      console.error("Error creating recurring schedule:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit pravidelný trénink.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateRecurringSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId, input }: { id: string; clientId: string; input: UpdateRecurringScheduleInput }) => {
      const { data, error } = await supabase
        .from("client_recurring_schedules")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as RecurringSchedule, clientId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["recurring_schedules", result.clientId] });
      toast({
        title: "Pravidelný trénink upraven",
        description: "Změny byly úspěšně uloženy.",
      });
    },
    onError: (error) => {
      console.error("Error updating recurring schedule:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se upravit pravidelný trénink.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteRecurringSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from("client_recurring_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { clientId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["recurring_schedules", result.clientId] });
      toast({
        title: "Pravidelný trénink odstraněn",
        description: "Trénink byl úspěšně odebrán z rozvrhu.",
      });
    },
    onError: (error) => {
      console.error("Error deleting recurring schedule:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odstranit pravidelný trénink.",
        variant: "destructive",
      });
    },
  });
}

export function useGenerateTrainingsFromSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      weeksAhead = 4 
    }: { 
      clientId: string; 
      weeksAhead?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Fetch active schedules for client
      const { data: schedules, error: schedulesError } = await supabase
        .from("client_recurring_schedules")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true);

      if (schedulesError) throw schedulesError;
      if (!schedules || schedules.length === 0) {
        throw new Error("Žádné aktivní pravidelné tréninky nenalezeny.");
      }

      // Get existing scheduled trainings to avoid duplicates
      const today = new Date();
      const endDate = addDays(today, weeksAhead * 7);

      const { data: existingTrainings } = await supabase
        .from("training_sessions")
        .select("date")
        .eq("client_id", clientId)
        .eq("status", "scheduled")
        .gte("date", today.toISOString())
        .lte("date", endDate.toISOString());

      const existingDates = new Set(
        (existingTrainings || []).map(t => format(new Date(t.date), 'yyyy-MM-dd HH:mm'))
      );

      // Generate trainings for each schedule
      const trainingsToCreate: any[] = [];
      const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });

      for (let week = 0; week < weeksAhead; week++) {
        for (const schedule of schedules) {
          // Calculate the date for this day of week
          const dayOffset = schedule.day_of_week - 1; // day_of_week is 1-indexed
          const trainingDate = addDays(startOfCurrentWeek, week * 7 + dayOffset);

          // Skip if date is in the past
          if (trainingDate < today) continue;

          // Parse time
          const [hours, minutes] = schedule.time.split(':').map(Number);
          const trainingDateTime = setMinutes(setHours(trainingDate, hours), minutes);

          const dateKey = format(trainingDateTime, 'yyyy-MM-dd HH:mm');

          // Skip if training already exists at this time
          if (existingDates.has(dateKey)) continue;

          trainingsToCreate.push({
            client_id: clientId,
            date: trainingDateTime.toISOString(),
            duration: schedule.duration,
            notes: schedule.notes || "",
            status: "scheduled",
            participant_count: 1,
            user_id: user.id,
          });
        }
      }

      if (trainingsToCreate.length === 0) {
        return { createdCount: 0 };
      }

      const { error: insertError } = await supabase
        .from("training_sessions")
        .insert(trainingsToCreate);

      if (insertError) throw insertError;

      return { createdCount: trainingsToCreate.length };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["training_sessions", variables.clientId] });
      
      if (result.createdCount > 0) {
        toast({
          title: "Tréninky vygenerovány",
          description: `Vytvořeno ${result.createdCount} nových tréninků.`,
        });
      } else {
        toast({
          title: "Žádné nové tréninky",
          description: "Všechny tréninky z pravidelného rozvrhu již existují.",
        });
      }
    },
    onError: (error: any) => {
      console.error("Error generating trainings:", error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se vygenerovat tréninky.",
        variant: "destructive",
      });
    },
  });
}
