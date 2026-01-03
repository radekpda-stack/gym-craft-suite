import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TestSchedule, CreateTestScheduleInput } from "@/types/testExtensions";
import { toast } from "sonner";

export function useTestSchedules(clientId?: string) {
  return useQuery({
    queryKey: ['test-schedules', clientId],
    queryFn: async () => {
      let query = supabase
        .from('test_schedules')
        .select('*, test_definitions(id, name, name_cs, category)')
        .eq('is_completed', false)
        .order('scheduled_date', { ascending: true });
      
      if (clientId) query = query.eq('client_id', clientId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TestSchedule[];
    }
  });
}

export function useUpcomingTestSchedules(days: number = 7) {
  return useQuery({
    queryKey: ['test-schedules-upcoming', days],
    queryFn: async () => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);
      
      const { data, error } = await supabase
        .from('test_schedules')
        .select('*, test_definitions(id, name, name_cs, category), clients(id, name)')
        .eq('is_completed', false)
        .gte('scheduled_date', today.toISOString().split('T')[0])
        .lte('scheduled_date', futureDate.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data as (TestSchedule & { clients: { id: string; name: string } | null })[];
    }
  });
}

export function useCreateTestSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTestScheduleInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('test_schedules')
        .insert({
          user_id: user.id,
          client_id: input.client_id,
          test_definition_id: input.test_definition_id,
          scheduled_date: input.scheduled_date,
          reminder_days_before: input.reminder_days_before ?? 3,
          notes: input.notes,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-schedules'] });
      toast.success('Test naplánován');
    },
    onError: () => toast.error('Nepodařilo se naplánovat test')
  });
}

export function useCompleteTestSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ scheduleId, sessionId }: { scheduleId: string; sessionId?: string }) => {
      const { error } = await supabase
        .from('test_schedules')
        .update({
          is_completed: true,
          completed_session_id: sessionId || null,
        })
        .eq('id', scheduleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-schedules'] });
      toast.success('Test označen jako dokončený');
    }
  });
}

export function useDeleteTestSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('test_schedules')
        .delete()
        .eq('id', scheduleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-schedules'] });
      toast.success('Plán smazán');
    },
    onError: () => toast.error('Nepodařilo se smazat plán')
  });
}
