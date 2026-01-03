import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TestGoal, CreateTestGoalInput } from "@/types/testExtensions";
import { toast } from "sonner";

export function useTestGoals(clientId?: string) {
  return useQuery({
    queryKey: ['test-goals', clientId],
    queryFn: async () => {
      let query = supabase
        .from('test_goals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (clientId) query = query.eq('client_id', clientId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TestGoal[];
    },
    enabled: !!clientId
  });
}

export function useTestGoal(clientId: string, testDefinitionId: string) {
  return useQuery({
    queryKey: ['test-goal', clientId, testDefinitionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_goals')
        .select('*')
        .eq('client_id', clientId)
        .eq('test_definition_id', testDefinitionId)
        .maybeSingle();
      
      if (error) throw error;
      return data as TestGoal | null;
    },
    enabled: !!clientId && !!testDefinitionId
  });
}

export function useCreateTestGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTestGoalInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('test_goals')
        .upsert({
          user_id: user.id,
          client_id: input.client_id,
          test_definition_id: input.test_definition_id,
          target_value: input.target_value,
          target_date: input.target_date,
          notes: input.notes,
        }, {
          onConflict: 'client_id,test_definition_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-goals'] });
      queryClient.invalidateQueries({ queryKey: ['test-goal', variables.client_id, variables.test_definition_id] });
      toast.success('Cíl uložen');
    },
    onError: () => toast.error('Nepodařilo se uložit cíl')
  });
}

export function useUpdateTestGoalAchievement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ goalId, achieved }: { goalId: string; achieved: boolean }) => {
      const { error } = await supabase
        .from('test_goals')
        .update({ achieved_at: achieved ? new Date().toISOString() : null })
        .eq('id', goalId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-goals'] });
      queryClient.invalidateQueries({ queryKey: ['test-goal'] });
    }
  });
}

export function useDeleteTestGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from('test_goals')
        .delete()
        .eq('id', goalId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-goals'] });
      queryClient.invalidateQueries({ queryKey: ['test-goal'] });
      toast.success('Cíl smazán');
    },
    onError: () => toast.error('Nepodařilo se smazat cíl')
  });
}
