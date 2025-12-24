import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BulkUpdateData {
  movement_pattern?: string;
  difficulty?: string;
  muscle_groups?: string[];
  add_muscle_groups?: string[];
  remove_muscle_groups?: string[];
  add_tag_ids?: string[];
  remove_tag_ids?: string[];
}

export function useBulkExerciseUpdate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      exerciseIds,
      updates,
    }: {
      exerciseIds: string[];
      updates: BulkUpdateData;
    }) => {
      if (exerciseIds.length === 0) {
        throw new Error('No exercises selected');
      }

      const results = {
        updated: 0,
        tagsAdded: 0,
        tagsRemoved: 0,
        errors: [] as string[],
      };

      // Build the update object for exercises table
      const exerciseUpdate: Record<string, unknown> = {};
      
      if (updates.movement_pattern) {
        exerciseUpdate.movement_pattern = updates.movement_pattern;
      }
      
      if (updates.difficulty) {
        exerciseUpdate.difficulty = updates.difficulty;
      }

      // Handle muscle groups
      if (updates.muscle_groups && updates.muscle_groups.length > 0) {
        exerciseUpdate.muscle_groups = updates.muscle_groups;
      }

      // Update exercises if there are changes
      if (Object.keys(exerciseUpdate).length > 0) {
        const { error } = await supabase
          .from('exercises')
          .update(exerciseUpdate)
          .in('id', exerciseIds);

        if (error) {
          results.errors.push(`Exercise update failed: ${error.message}`);
        } else {
          results.updated = exerciseIds.length;
        }
      }

      // Handle adding muscle groups (merge with existing)
      if (updates.add_muscle_groups && updates.add_muscle_groups.length > 0) {
        for (const exerciseId of exerciseIds) {
          const { data: exercise } = await supabase
            .from('exercises')
            .select('muscle_groups')
            .eq('id', exerciseId)
            .single();

          if (exercise) {
            const currentGroups = exercise.muscle_groups || [];
            const newGroups = [...new Set([...currentGroups, ...updates.add_muscle_groups])];
            
            await supabase
              .from('exercises')
              .update({ muscle_groups: newGroups })
              .eq('id', exerciseId);
          }
        }
      }

      // Handle removing muscle groups
      if (updates.remove_muscle_groups && updates.remove_muscle_groups.length > 0) {
        for (const exerciseId of exerciseIds) {
          const { data: exercise } = await supabase
            .from('exercises')
            .select('muscle_groups')
            .eq('id', exerciseId)
            .single();

          if (exercise) {
            const currentGroups = exercise.muscle_groups || [];
            const newGroups = currentGroups.filter(
              (g: string) => !updates.remove_muscle_groups!.includes(g)
            );
            
            await supabase
              .from('exercises')
              .update({ muscle_groups: newGroups })
              .eq('id', exerciseId);
          }
        }
      }

      // Handle adding tags
      if (updates.add_tag_ids && updates.add_tag_ids.length > 0) {
        for (const exerciseId of exerciseIds) {
          for (const tagId of updates.add_tag_ids) {
            const { error } = await supabase
              .from('exercise_tag_map')
              .upsert(
                { exercise_id: exerciseId, tag_id: tagId },
                { onConflict: 'exercise_id,tag_id', ignoreDuplicates: true }
              );

            if (!error) {
              results.tagsAdded++;
            }
          }
        }
      }

      // Handle removing tags
      if (updates.remove_tag_ids && updates.remove_tag_ids.length > 0) {
        const { error } = await supabase
          .from('exercise_tag_map')
          .delete()
          .in('exercise_id', exerciseIds)
          .in('tag_id', updates.remove_tag_ids);

        if (!error) {
          results.tagsRemoved = exerciseIds.length * updates.remove_tag_ids.length;
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercises-with-usage'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-tag-map'] });

      const messages = [];
      if (results.updated > 0) messages.push(`${results.updated} cviků aktualizováno`);
      if (results.tagsAdded > 0) messages.push(`${results.tagsAdded} tagů přidáno`);
      if (results.tagsRemoved > 0) messages.push(`${results.tagsRemoved} tagů odebráno`);

      toast({
        title: 'Hromadná úprava dokončena',
        description: messages.join(', ') || 'Změny uloženy',
      });
    },
    onError: (error) => {
      console.error('Bulk update error:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se provést hromadnou úpravu',
        variant: 'destructive',
      });
    },
  });
}
