import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExerciseAlias {
  id: string;
  exercise_id: string;
  alias_name: string;
  alias_normalized: string;
  language: string;
  created_at: string;
}

/**
 * Normalize text for searching - removes diacritics, lowercase, trim
 * This is the single source of truth for text normalization
 */
export function normalizeTextForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, '') // only alphanumeric
    .replace(/\s+/g, ' ') // single spaces
    .trim();
}

/**
 * Hook for managing exercise aliases
 */
export function useExerciseAliases(exerciseId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: aliases = [], isLoading } = useQuery({
    queryKey: ['exercise-aliases', exerciseId],
    queryFn: async () => {
      if (!exerciseId) return [];
      const { data, error } = await supabase
        .from('exercise_aliases')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ExerciseAlias[];
    },
    enabled: !!exerciseId,
  });

  const addAlias = useMutation({
    mutationFn: async ({ exerciseId, aliasName, language = 'cs' }: { 
      exerciseId: string; 
      aliasName: string; 
      language?: string 
    }) => {
      const normalized = normalizeTextForSearch(aliasName);
      
      const { data, error } = await supabase
        .from('exercise_aliases')
        .insert({
          exercise_id: exerciseId,
          alias_name: aliasName,
          alias_normalized: normalized,
          language,
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Tento alias již existuje');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-aliases', exerciseId] });
      toast({ title: 'Alias přidán', description: 'Alias byl úspěšně přidán.' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Chyba', 
        description: error.message || 'Nepodařilo se přidat alias.', 
        variant: 'destructive' 
      });
    },
  });

  const removeAlias = useMutation({
    mutationFn: async (aliasId: string) => {
      const { error } = await supabase
        .from('exercise_aliases')
        .delete()
        .eq('id', aliasId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-aliases', exerciseId] });
      toast({ title: 'Alias odebrán', description: 'Alias byl úspěšně odebrán.' });
    },
    onError: () => {
      toast({ 
        title: 'Chyba', 
        description: 'Nepodařilo se odebrat alias.', 
        variant: 'destructive' 
      });
    },
  });

  return { aliases, isLoading, addAlias, removeAlias };
}

/**
 * Hook for searching exercises including aliases
 */
export function useExerciseSearch() {
  return useQuery({
    queryKey: ['exercise-search-index'],
    queryFn: async () => {
      // Fetch all active exercises
      const { data: exercises, error: exError } = await supabase
        .from('exercises')
        .select('id, name, name_cs, name_en, search_name, category')
        .eq('is_archived', false)
        .order('name_cs', { ascending: true });

      if (exError) throw exError;

      // Fetch all aliases
      const { data: aliases, error: alError } = await supabase
        .from('exercise_aliases')
        .select('id, exercise_id, alias_name, alias_normalized');

      if (alError) throw alError;

      // Build search index
      const searchIndex = (exercises || []).map(ex => ({
        ...ex,
        aliases: (aliases || [])
          .filter(a => a.exercise_id === ex.id)
          .map(a => ({
            name: a.alias_name,
            normalized: a.alias_normalized,
          })),
      }));

      return searchIndex;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Search exercises by query - matches against name, search_name, and aliases
 */
export function searchExercises(
  exercises: ReturnType<typeof useExerciseSearch>['data'],
  query: string
): typeof exercises {
  if (!exercises || !query.trim()) return exercises || [];
  
  const normalizedQuery = normalizeTextForSearch(query);
  
  return exercises.filter(ex => {
    // Match against primary name
    const primaryName = normalizeTextForSearch(ex.name_cs || ex.name);
    if (primaryName.includes(normalizedQuery)) return true;
    
    // Match against search_name
    if (ex.search_name && ex.search_name.includes(normalizedQuery)) return true;
    
    // Match against aliases
    if (ex.aliases.some(a => a.normalized.includes(normalizedQuery))) return true;
    
    return false;
  });
}

/**
 * Hook for merging duplicate exercises
 */
export function useMergeExercises() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      canonicalId, 
      duplicateId 
    }: { 
      canonicalId: string; 
      duplicateId: string 
    }) => {
      // Get duplicate exercise name for alias
      const { data: duplicate } = await supabase
        .from('exercises')
        .select('name, name_cs, search_name')
        .eq('id', duplicateId)
        .single();

      // Update all references
      await supabase
        .from('workout_entries')
        .update({ exercise_id: canonicalId })
        .eq('exercise_id', duplicateId);

      await supabase
        .from('exercise_entries')
        .update({ exercise_id: canonicalId })
        .eq('exercise_id', duplicateId);

      // Update tag maps (avoid duplicates)
      const { data: existingTags } = await supabase
        .from('exercise_tag_map')
        .select('tag_id')
        .eq('exercise_id', canonicalId);

      const existingTagIds = new Set(existingTags?.map(t => t.tag_id) || []);

      const { data: duplicateTags } = await supabase
        .from('exercise_tag_map')
        .select('tag_id')
        .eq('exercise_id', duplicateId);

      for (const tag of duplicateTags || []) {
        if (!existingTagIds.has(tag.tag_id)) {
          await supabase
            .from('exercise_tag_map')
            .update({ exercise_id: canonicalId })
            .eq('exercise_id', duplicateId)
            .eq('tag_id', tag.tag_id);
        }
      }

      // Delete remaining duplicate tag maps
      await supabase
        .from('exercise_tag_map')
        .delete()
        .eq('exercise_id', duplicateId);

      // Update muscle group maps
      await supabase
        .from('exercise_muscle_groups')
        .delete()
        .eq('exercise_id', duplicateId);

      await supabase
        .from('exercise_muscles')
        .delete()
        .eq('exercise_id', duplicateId);

      await supabase
        .from('exercise_equipment')
        .delete()
        .eq('exercise_id', duplicateId);

      // Update relations
      await supabase
        .from('exercise_relations')
        .update({ exercise_id: canonicalId })
        .eq('exercise_id', duplicateId);

      await supabase
        .from('exercise_relations')
        .update({ related_exercise_id: canonicalId })
        .eq('related_exercise_id', duplicateId);

      // Add duplicate name as alias to canonical
      if (duplicate?.name_cs || duplicate?.name) {
        const aliasName = duplicate.name_cs || duplicate.name;
        const normalized = normalizeTextForSearch(aliasName);
        
        await supabase
          .from('exercise_aliases')
          .insert({
            exercise_id: canonicalId,
            alias_name: aliasName,
            alias_normalized: normalized,
            language: 'cs',
          })
          .select()
          .maybeSingle(); // Ignore conflict
      }

      // Archive duplicate
      await supabase
        .from('exercises')
        .update({ is_archived: true })
        .eq('id', duplicateId);

      return { canonicalId, duplicateId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-aliases'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-search-index'] });
      toast({ 
        title: 'Cviky sloučeny', 
        description: 'Duplicitní cvik byl sloučen s kanonickým.' 
      });
    },
    onError: () => {
      toast({ 
        title: 'Chyba', 
        description: 'Nepodařilo se sloučit cviky.', 
        variant: 'destructive' 
      });
    },
  });
}
