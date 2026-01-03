import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TestBattery } from "@/types/testExtensions";
import { toast } from "sonner";

export function useTestBatteries() {
  return useQuery({
    queryKey: ['test-batteries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_batteries')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(b => ({
        ...b,
        test_definition_ids: Array.isArray(b.test_definition_ids) ? b.test_definition_ids : [],
        recommended_order: Array.isArray(b.recommended_order) ? b.recommended_order : [],
      })) as TestBattery[];
    }
  });
}

export function useTestBattery(id: string) {
  return useQuery({
    queryKey: ['test-battery', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_batteries')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return {
        ...data,
        test_definition_ids: Array.isArray(data.test_definition_ids) ? data.test_definition_ids : [],
        recommended_order: Array.isArray(data.recommended_order) ? data.recommended_order : [],
      } as TestBattery;
    },
    enabled: !!id
  });
}

interface CreateTestBatteryInput {
  name: string;
  name_cs?: string | null;
  description?: string | null;
  test_definition_ids: string[];
  rest_between_tests_minutes?: number;
}

export function useCreateTestBattery() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTestBatteryInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('test_batteries')
        .insert({
          user_id: user.id,
          name: input.name,
          name_cs: input.name_cs,
          description: input.description,
          test_definition_ids: input.test_definition_ids,
          recommended_order: input.test_definition_ids.map((_, i) => i + 1),
          rest_between_tests_minutes: input.rest_between_tests_minutes ?? 5,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-batteries'] });
      toast.success('Testovací baterie vytvořena');
    },
    onError: () => toast.error('Nepodařilo se vytvořit baterii')
  });
}

export function useUpdateTestBattery() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateTestBatteryInput> & { id: string }) => {
      const { error } = await supabase
        .from('test_batteries')
        .update({
          name: input.name,
          name_cs: input.name_cs,
          description: input.description,
          test_definition_ids: input.test_definition_ids,
          rest_between_tests_minutes: input.rest_between_tests_minutes,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-batteries'] });
      toast.success('Baterie aktualizována');
    }
  });
}

export function useDeleteTestBattery() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_batteries')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-batteries'] });
      toast.success('Baterie smazána');
    }
  });
}
