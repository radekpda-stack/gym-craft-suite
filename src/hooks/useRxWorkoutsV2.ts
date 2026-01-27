import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ParsedRxWorkoutV2, ParsedExerciseV2 } from './useRxWorkoutParserV2';
import { normalizeText, generateSlug } from './useExercises';

export interface ExerciseMapping {
  raw_name: string;
  action: 'map' | 'create';
  selected_id?: string;
  new_name?: string;
  new_category?: string;
}

// Create RX workout from V2 parsed text with mappings
export function useCreateRxWorkoutV2() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      parsed, 
      mappings 
    }: { 
      parsed: ParsedRxWorkoutV2; 
      mappings: ExerciseMapping[] 
    }) => {
      if (!user) throw new Error('Nepřihlášen');
      
      const { template, exercises } = parsed;
      
      // First, create any new exercises from mappings
      const exerciseIdMap = new Map<string, string>();
      
      for (const mapping of mappings) {
        if (mapping.action === 'create' && mapping.new_name) {
          // Create new exercise
          const slug = generateSlug(mapping.new_name);
          const searchName = slug;
          
          const { data: newExercise, error: createError } = await supabase
            .from('exercises')
            .insert({
              user_id: user.id,
              name: mapping.new_name,
              name_cs: mapping.new_name,
              slug,
              search_name: searchName,
              category: mapping.new_category || 'Ostatní',
              source: 'custom',
              muscle_groups: [],
              secondary_muscle_groups: [],
              equipment: [],
              training_type: [],
              default_unit: 'reps',
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating exercise:', createError);
            // Continue without mapping
          } else if (newExercise) {
            exerciseIdMap.set(mapping.raw_name, newExercise.id);
            
            // Also create alias
            await supabase
              .from('exercise_aliases')
              .insert({
                exercise_id: newExercise.id,
                alias_name: mapping.raw_name,
                alias_normalized: normalizeText(mapping.raw_name),
                language: 'cs',
              })
              .select()
              .maybeSingle();
          }
        } else if (mapping.action === 'map' && mapping.selected_id) {
          exerciseIdMap.set(mapping.raw_name, mapping.selected_id);
          
          // Create alias for future imports
          await supabase
            .from('exercise_aliases')
            .insert({
              exercise_id: mapping.selected_id,
              alias_name: mapping.raw_name,
              alias_normalized: normalizeText(mapping.raw_name),
              language: 'cs',
            })
            .select()
            .maybeSingle();
        }
      }
      
      // Create template
      const { data: createdTemplate, error: templateError } = await supabase
        .from('training_templates')
        .insert({
          user_id: user.id,
          name: template.name,
          description: template.description || null,
          category: 'RX Benchmark',
          is_public: false,
          tags: ['rx', template.scoring_mode],
          workout_format: template.workout_format,
          time_cap_seconds: template.time_cap_seconds || null,
          rounds: template.rounds || null,
          work_interval_seconds: template.work_interval_seconds || null,
          rest_interval_seconds: template.rest_interval_seconds || null,
          is_rx_workout: true,
          scoring_mode: template.scoring_mode,
        })
        .select()
        .single();
      
      if (templateError) throw templateError;
      
      // Add exercises with extended fields
      if (exercises.length > 0) {
        const exerciseRows = exercises.map((ex, idx) => {
          // Try to get exercise_id from mapping or original
          let exercise_id = ex.exercise_id;
          if (!exercise_id && exerciseIdMap.has(ex.raw_name)) {
            exercise_id = exerciseIdMap.get(ex.raw_name);
          }
          
          return {
            template_id: createdTemplate.id,
            exercise_id: exercise_id || null,
            exercise_name: ex.exercise_name,
            block_type: 'primary',
            reps_min: ex.reps_min || null,
            time_seconds: ex.time_seconds || null,
            rx_weight_kg: ex.rx_weight_kg || null,
            rx_distance_m: ex.rx_distance_m || null,
            incline_percent: ex.incline_percent || null,
            speed_setting: ex.speed_setting || null,
            damper_resistance: ex.damper_resistance || null,
            load_format: ex.load_format || null,
            round_marker: ex.round_marker || null,
            sort_order: idx,
          };
        });
        
        const { error: exError } = await supabase
          .from('training_template_exercises')
          .insert(exerciseRows);
        
        if (exError) throw exError;
      }
      
      return createdTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rx-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['training-templates'] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercises-for-mapping-v2'] });
      toast.success('RX Workout vytvořen');
    },
    onError: (error) => {
      console.error('Create RX workout V2 error:', error);
      toast.error('Nepodařilo se vytvořit RX workout');
    },
  });
}
