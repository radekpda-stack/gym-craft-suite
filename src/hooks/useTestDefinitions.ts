import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TestDefinition } from "@/types/tests";

export function useTestDefinitions() {
  return useQuery({
    queryKey: ['test-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_definitions')
        .select('*, exercises(id, name)')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(d => ({
        ...d,
        how_to_steps: Array.isArray(d.how_to_steps) ? d.how_to_steps : [],
        standardization_checklist: Array.isArray(d.standardization_checklist) ? d.standardization_checklist : [],
        equipment_setup: typeof d.equipment_setup === 'object' && d.equipment_setup !== null ? d.equipment_setup : {},
        common_mistakes: Array.isArray(d.common_mistakes) ? d.common_mistakes : [],
        validity_rules: Array.isArray(d.validity_rules) ? d.validity_rules : [],
        required_metrics_schema: typeof d.required_metrics_schema === 'object' && d.required_metrics_schema !== null ? d.required_metrics_schema : {},
        optional_metrics_schema: typeof d.optional_metrics_schema === 'object' && d.optional_metrics_schema !== null ? d.optional_metrics_schema : {},
        scoring_rules: typeof d.scoring_rules === 'object' && d.scoring_rules !== null ? d.scoring_rules : {},
        comparability_rules_json: typeof d.comparability_rules_json === 'object' && d.comparability_rules_json !== null ? d.comparability_rules_json : {},
      })) as unknown as TestDefinition[];
    }
  });
}

export function useTestDefinition(id: string | undefined) {
  return useQuery({
    queryKey: ['test-definition', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('test_definitions')
        .select('*, exercises(id, name)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        how_to_steps: Array.isArray(data.how_to_steps) ? data.how_to_steps : [],
        standardization_checklist: Array.isArray(data.standardization_checklist) ? data.standardization_checklist : [],
        equipment_setup: typeof data.equipment_setup === 'object' && data.equipment_setup !== null ? data.equipment_setup : {},
        common_mistakes: Array.isArray(data.common_mistakes) ? data.common_mistakes : [],
        validity_rules: Array.isArray(data.validity_rules) ? data.validity_rules : [],
        required_metrics_schema: typeof data.required_metrics_schema === 'object' && data.required_metrics_schema !== null ? data.required_metrics_schema : {},
        optional_metrics_schema: typeof data.optional_metrics_schema === 'object' && data.optional_metrics_schema !== null ? data.optional_metrics_schema : {},
        scoring_rules: typeof data.scoring_rules === 'object' && data.scoring_rules !== null ? data.scoring_rules : {},
        comparability_rules_json: typeof data.comparability_rules_json === 'object' && data.comparability_rules_json !== null ? data.comparability_rules_json : {},
      } as unknown as TestDefinition;
    },
    enabled: !!id
  });
}
