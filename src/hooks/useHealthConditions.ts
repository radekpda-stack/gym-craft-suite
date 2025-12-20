import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type HealthConditionCategory = 'disease' | 'surgery' | 'injury' | 'pain' | 'allergy';

export interface HealthCondition {
  id: string;
  name: string;
  name_en: string | null;
  category: HealthConditionCategory;
  synonyms: string[];
  usage_count: number;
  is_system: boolean;
  user_id: string | null;
}

export function useHealthConditions(category?: HealthConditionCategory) {
  const queryClient = useQueryClient();

  const { data: conditions = [], isLoading } = useQuery({
    queryKey: ['health-conditions', category],
    queryFn: async () => {
      let query = supabase
        .from('health_conditions')
        .select('*')
        .order('usage_count', { ascending: false })
        .order('name');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HealthCondition[];
    },
  });

  const searchConditions = (searchTerm: string, categoryFilter?: HealthConditionCategory) => {
    if (!searchTerm.trim()) {
      return categoryFilter 
        ? conditions.filter(c => c.category === categoryFilter)
        : conditions;
    }

    const term = searchTerm.toLowerCase();
    return conditions
      .filter(c => {
        if (categoryFilter && c.category !== categoryFilter) return false;
        
        // Search in name
        if (c.name.toLowerCase().includes(term)) return true;
        
        // Search in English name
        if (c.name_en?.toLowerCase().includes(term)) return true;
        
        // Search in synonyms
        if (c.synonyms?.some(s => s.toLowerCase().includes(term))) return true;
        
        return false;
      })
      .slice(0, 10); // Limit results
  };

  const addConditionMutation = useMutation({
    mutationFn: async ({ name, category: cat }: { name: string; category: HealthConditionCategory }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('health_conditions')
        .insert({
          name,
          category: cat,
          user_id: user.id,
          is_system: false,
          usage_count: 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as HealthCondition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-conditions'] });
    },
  });

  const incrementUsageMutation = useMutation({
    mutationFn: async (conditionId: string) => {
      const condition = conditions.find(c => c.id === conditionId);
      if (!condition) return;

      const { error } = await supabase
        .from('health_conditions')
        .update({ usage_count: (condition.usage_count || 0) + 1 })
        .eq('id', conditionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-conditions'] });
    },
  });

  return {
    conditions,
    isLoading,
    searchConditions,
    addCondition: addConditionMutation.mutateAsync,
    incrementUsage: incrementUsageMutation.mutate,
  };
}
