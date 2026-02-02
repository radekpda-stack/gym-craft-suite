/**
 * Auto-tagging hook for training sessions based on exercises
 * 
 * When an exercise is added to a training session, this hook automatically
 * assigns body part tags based on the exercise's muscle group categories.
 * 
 * Smart consolidation: When both "upper" and "lower" body parts are present,
 * they are consolidated into "Celé tělo" (full body) tag.
 */

import { supabase } from "@/integrations/supabase/client";
import { useAddTrainingSessionTags, useUpdateTrainingSessionTags } from "./useTrainingSessionTags";
import { toast } from "@/hooks/use-toast";

// Mapping from body_part_category keys to tag IDs
// These IDs correspond to existing body_part type tags in the database
const BODY_PART_TO_TAG: Record<string, string> = {
  'upper': '05427be9-cf51-4d10-a5be-749626fdbec2', // "Horní část"
  'lower': 'd5f602c0-1711-435e-84d7-6c2863a753a7', // "Dolní část"
  'core': '72d6af4d-345b-46d2-8a22-c456bbdbaa8f',  // "Střed těla"
};

// Special consolidated tag for full body training
const FULL_BODY_TAG_ID = '55c8baee-413c-4d6c-9539-77a76225c4fb'; // "Celé tělo"

// Human-readable labels for toast notifications
const BODY_PART_LABELS: Record<string, string> = {
  'upper': 'Horní část',
  'lower': 'Dolní část',
  'core': 'Střed těla',
  'full_body': 'Celé tělo',
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
  const updateTags = useUpdateTrainingSessionTags();

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

      // 2. Get unique body part keys from the new exercise
      const newBodyPartKeys = [...new Set(exerciseCategories.map(ec => ec.body_part_key))];

      // 3. Fetch existing tags for this training session
      const { data: existingTags, error: existingError } = await supabase
        .from('training_session_tags')
        .select('tag_id')
        .eq('training_session_id', trainingSessionId);

      if (existingError) {
        console.error('Error fetching existing tags:', existingError);
        return;
      }

      const existingTagIds = new Set(existingTags?.map(t => t.tag_id) || []);

      // 4. Check what body parts are already tagged
      const hasUpper = existingTagIds.has(BODY_PART_TO_TAG['upper']);
      const hasLower = existingTagIds.has(BODY_PART_TO_TAG['lower']);
      const hasFullBody = existingTagIds.has(FULL_BODY_TAG_ID);
      
      // New exercise brings these parts
      const bringsUpper = newBodyPartKeys.includes('upper');
      const bringsLower = newBodyPartKeys.includes('lower');
      const bringsCore = newBodyPartKeys.includes('core');

      // Will have after adding
      const willHaveUpper = hasUpper || bringsUpper;
      const willHaveLower = hasLower || bringsLower;
      
      // 5. Check if we need to consolidate to "Celé tělo"
      const shouldConsolidateToFullBody = willHaveUpper && willHaveLower && !hasFullBody;

      if (shouldConsolidateToFullBody) {
        // Need to replace upper + lower with full body
        // Keep all other tags, add core if needed
        const newTagSet = new Set(existingTagIds);
        
        // Remove upper and lower
        newTagSet.delete(BODY_PART_TO_TAG['upper']);
        newTagSet.delete(BODY_PART_TO_TAG['lower']);
        
        // Add full body
        newTagSet.add(FULL_BODY_TAG_ID);
        
        // Add core if exercise brings it
        if (bringsCore) {
          newTagSet.add(BODY_PART_TO_TAG['core']);
        }
        
        await updateTags.mutateAsync({
          trainingSessionId,
          tagIds: Array.from(newTagSet),
        });

        toast({
          title: "Partie automaticky přidány",
          description: "Celé tělo" + (bringsCore ? ", Střed těla" : ""),
        });
        return;
      }

      // 6. If already full body, just add core if needed
      if (hasFullBody) {
        if (bringsCore && !existingTagIds.has(BODY_PART_TO_TAG['core'])) {
          await addTags.mutateAsync({
            trainingSessionId,
            tagIds: [BODY_PART_TO_TAG['core']],
          });
          toast({
            title: "Partie automaticky přidány",
            description: "Střed těla",
          });
        }
        return;
      }

      // 7. Normal case - add new body part tags
      const newTagIds = newBodyPartKeys
        .map(key => BODY_PART_TO_TAG[key])
        .filter(Boolean)
        .filter(id => !existingTagIds.has(id));

      if (newTagIds.length === 0) {
        return;
      }

      await addTags.mutateAsync({
        trainingSessionId,
        tagIds: newTagIds,
      });

      // Show toast notification with added tags
      const addedLabels = newBodyPartKeys
        .filter(key => newTagIds.includes(BODY_PART_TO_TAG[key]))
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
    isLoading: addTags.isPending || updateTags.isPending,
  };
}
