import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MealTemplate {
  id: string;
  client_id: string;
  name: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  description: string;
  portion_size: 'small' | 'medium' | 'large' | null;
  quality: 'good' | 'normal' | 'poor' | null;
  note: string | null;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMealTemplateInput {
  name: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  portion_size?: 'small' | 'medium' | 'large';
  quality?: 'good' | 'normal' | 'poor';
  note?: string;
}

export function useMealTemplates(clientId: string) {
  return useQuery({
    queryKey: ['meal-templates', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_meal_templates')
        .select('*')
        .eq('client_id', clientId)
        .order('use_count', { ascending: false });

      if (error) throw error;
      return data as MealTemplate[];
    },
    enabled: !!clientId,
  });
}

export function useCreateMealTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      template 
    }: { 
      clientId: string; 
      template: CreateMealTemplateInput;
    }) => {
      const { data, error } = await supabase
        .from('nutrition_meal_templates')
        .insert({
          client_id: clientId,
          name: template.name,
          meal_type: template.meal_type,
          description: template.description,
          portion_size: template.portion_size,
          quality: template.quality,
          note: template.note,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MealTemplate;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['meal-templates', clientId] });
    },
  });
}

export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, clientId }: { templateId: string; clientId: string }) => {
      // First get current count
      const { data: template } = await supabase
        .from('nutrition_meal_templates')
        .select('use_count')
        .eq('id', templateId)
        .single();

      // Then increment
      const { error } = await supabase
        .from('nutrition_meal_templates')
        .update({ use_count: (template?.use_count || 0) + 1 })
        .eq('id', templateId);

      if (error) throw error;
      return { templateId, clientId };
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['meal-templates', clientId] });
    },
  });
}

export function useDeleteMealTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, clientId }: { templateId: string; clientId: string }) => {
      const { error } = await supabase
        .from('nutrition_meal_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return { templateId, clientId };
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['meal-templates', clientId] });
    },
  });
}

/**
 * Auto-save a meal to templates database when food entry is created.
 * If template with similar description exists, increment use_count.
 * If not, create a new template.
 */
export async function autoSaveMealTemplate(
  clientId: string, 
  entry: {
    description: string;
    meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    portion_size?: 'small' | 'medium' | 'large';
    quality?: 'good' | 'normal' | 'poor';
    note?: string;
  }
): Promise<void> {
  const normalizedDescription = entry.description.toLowerCase().trim();
  
  try {
    // Check if template with similar description already exists
    const { data: existing } = await supabase
      .from('nutrition_meal_templates')
      .select('id, use_count')
      .eq('client_id', clientId)
      .ilike('description', normalizedDescription)
      .maybeSingle();
    
    if (existing) {
      // Increment use_count for existing template
      await supabase
        .from('nutrition_meal_templates')
        .update({ 
          use_count: (existing.use_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Create new template
      await supabase
        .from('nutrition_meal_templates')
        .insert({
          client_id: clientId,
          name: entry.description,
          description: entry.description,
          meal_type: entry.meal_type,
          portion_size: entry.portion_size,
          quality: entry.quality,
          note: entry.note,
          use_count: 1,
        });
    }
  } catch (error) {
    // Silently fail - template auto-save is not critical
    console.error('[autoSaveMealTemplate] Failed to save template:', error);
  }
}

/**
 * Hook to search meal templates for autocomplete
 */
export function useMealTemplatesSearch(clientId: string | undefined, searchTerm: string) {
  return useQuery({
    queryKey: ['meal-templates-search', clientId, searchTerm],
    queryFn: async () => {
      if (!clientId || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('nutrition_meal_templates')
        .select('id, name, description, meal_type, portion_size, quality, use_count')
        .eq('client_id', clientId)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('use_count', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as MealTemplate[];
    },
    enabled: !!clientId && searchTerm.length >= 2,
    staleTime: 30000,
  });
}
