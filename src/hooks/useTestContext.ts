import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TestContext, CreateTestContextInput } from "@/types/testExtensions";
import { toast } from "sonner";

export function useTestContext(sessionId?: string) {
  return useQuery({
    queryKey: ['test-context', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      
      const { data, error } = await supabase
        .from('test_context')
        .select('*')
        .eq('test_session_id', sessionId)
        .maybeSingle();
      
      if (error) throw error;
      return data as TestContext | null;
    },
    enabled: !!sessionId
  });
}

export function useCreateTestContext() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTestContextInput) => {
      const { data, error } = await supabase
        .from('test_context')
        .upsert({
          test_session_id: input.test_session_id,
          sleep_quality_1_5: input.sleep_quality_1_5,
          sleep_hours: input.sleep_hours,
          stress_level_1_5: input.stress_level_1_5,
          motivation_level_1_5: input.motivation_level_1_5,
          nutrition_quality_1_5: input.nutrition_quality_1_5,
          hours_since_last_meal: input.hours_since_last_meal,
          caffeine_mg: input.caffeine_mg,
          hydration_level_1_5: input.hydration_level_1_5,
          days_since_last_training: input.days_since_last_training,
          last_training_intensity: input.last_training_intensity,
          subjective_readiness_1_10: input.subjective_readiness_1_10,
          notes: input.notes,
        }, {
          onConflict: 'test_session_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-context', variables.test_session_id] });
      toast.success('Kontext uložen');
    },
    onError: () => toast.error('Nepodařilo se uložit kontext')
  });
}

export function useDeleteTestContext() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('test_context')
        .delete()
        .eq('test_session_id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['test-context', sessionId] });
    }
  });
}
