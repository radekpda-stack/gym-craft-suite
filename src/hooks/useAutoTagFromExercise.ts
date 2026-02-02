/**
 * Auto-tagging hook for training sessions based on exercises
 * 
 * When an exercise is added to a training session, this hook automatically
 * assigns body part tags based on the exercise's muscle group categories.
 */

import { supabase } from "@/integrations/supabase/client";
import { useAddTrainingSessionTags, useTrainingSessionTags } from "./useTrainingSessionTags";
import { toast } from "@/hooks/use-toast";

// Mapping from body_part_category keys to tag IDs
// These IDs correspond to existing body_part type tags in the database
const BODY_PART_TO_TAG: Record<string, string> = {
  'upper': '05427be9-cf51-4d10-a5be-749626fdbec2', // "Horní část"
  'lower': 'd5f602c0-1711-435e-84d7-6c2863a753a7', // "Dolní část"
  'core': '72d6af4d-345b-46d2-8a22-c456bbdbaa8f',  // "Střed těla"
};

// Human-readable labels for toast notifications
const BODY_PART_LABELS: Record<string, string> = {
  'upper': 'Horní část',
  'lower': 'Dolní část',
  'core': 'Střed těla',
};

interface UseAutoTagFromExerciseReturn {
  autoTagFromExercise: (trainingSessionId: string, exerciseId: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Hook that provides auto-tagging functionality for training sessions
 * 
 * @returns Object with autoTagFromExercise function and loading state
 */
export function useAutoTagFromExercise(): UseAutoTagFromExerciseReturn {
  const addTags = useAddTrainingSessionTags();

  const autoTagFromExercise = async (trainingSessionId: string, exerciseId: string): Promise<void> => {
    if (!trainingSessionId || !exerciseId) return;

    try {
      // 1. Fetch body part categories for this exercise from the view
      const { data: exerciseCategories, error: catError } = await supabase
        .from('exercise_body_part_categories')
        .select('body_part_key')
        .eq('exercise_id', exerciseId);

      if (catError) {
        console.error('Error fetching exercise body part categories:', catError);
        return;
      }

      if (!exerciseCategories || exerciseCategories.length === 0) {
        // Exercise has no muscle groups assigned - skip silently
        return;
      }

      // 2. Get unique body part keys
      const bodyPartKeys = [...new Set(exerciseCategories.map(ec => ec.body_part_key))];

      // 3. Map to tag IDs
      const newTagIds = bodyPartKeys
        .map(key => BODY_PART_TO_TAG[key])
        .filter(Boolean);

      if (newTagIds.length === 0) return;

      // 4. Fetch existing tags for this training session to avoid duplicates
      const { data: existingTags, error: existingError } = await supabase
        .from('training_session_tags')
        .select('tag_id')
        .eq('training_session_id', trainingSessionId);

      if (existingError) {
        console.error('Error fetching existing tags:', existingError);
        return;
      }

      const existingTagIds = new Set(existingTags?.map(t => t.tag_id) || []);

      // 5. Filter out tags that already exist
      const tagsToAdd = newTagIds.filter(id => !existingTagIds.has(id));

      if (tagsToAdd.length === 0) {
        // All tags already exist - nothing to do
        return;
      }

      // 6. Add new tags
      await addTags.mutateAsync({
        trainingSessionId,
        tagIds: tagsToAdd,
      });

      // 7. Show toast notification with added tags
      const addedLabels = bodyPartKeys
        .filter(key => tagsToAdd.includes(BODY_PART_TO_TAG[key]))
        .map(key => BODY_PART_LABELS[key])
        .filter(Boolean);

      if (addedLabels.length > 0) {
        toast({
          title: "Partie automaticky přidány",
          description: addedLabels.join(', '),
        });
      }
    } catch (error) {
      console.error('Error in auto-tagging:', error);
      // Don't show error toast - this is a convenience feature, not critical
    }
  };

  return {
    autoTagFromExercise,
    isLoading: addTags.isPending,
  };
}
