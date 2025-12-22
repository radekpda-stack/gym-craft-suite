import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Enums for exercise library
export const MOVEMENT_PATTERNS = [
  'squat', 'hinge', 'lunge',
  'push_horizontal', 'push_vertical',
  'pull_horizontal', 'pull_vertical',
  'carry',
  'core_anti_extension', 'core_anti_rotation', 'core_anti_lateral_flexion',
  'rotation', 'locomotion', 'conditioning', 'mobility', 'other'
] as const;

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

export const DEFAULT_UNITS = ['reps', 'seconds', 'meters', 'calories', 'cardio_machine'] as const;

export const SOURCES = ['system', 'custom', 'import'] as const;

export const MUSCLES = [
  'glutes', 'quadriceps', 'hamstrings', 'adductors', 'abductors',
  'calves', 'tibialis_anterior',
  'erectors',
  'lats', 'upper_back', 'traps_upper',
  'rear_delts', 'delts',
  'chest',
  'biceps', 'triceps', 'forearms',
  'core', 'obliques', 'hip_flexors',
  'rotator_cuff', 'serratus', 'neck'
] as const;

export const MUSCLE_ROLES = ['primary', 'secondary', 'stabilizer'] as const;

export const EQUIPMENT_OPTIONS = [
  'bodyweight', 'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bands',
  'bench', 'pullup_bar', 'rings', 'trx', 'box',
  'medicine_ball', 'slam_ball',
  'rower', 'ski_erg', 'treadmill', 'treadmill_sled_mode',
  'sled', 'landmine', 'hex_bar', 'plyo_platform', 'other'
] as const;

export const RELATION_TYPES = ['variant', 'regression', 'progression', 'alternative', 'prep'] as const;

export type MovementPattern = typeof MOVEMENT_PATTERNS[number];
export type Difficulty = typeof DIFFICULTIES[number];
export type DefaultUnit = typeof DEFAULT_UNITS[number];
export type Source = typeof SOURCES[number];
export type Muscle = typeof MUSCLES[number];
export type MuscleRole = typeof MUSCLE_ROLES[number];
export type Equipment = typeof EQUIPMENT_OPTIONS[number];
export type RelationType = typeof RELATION_TYPES[number];

export interface Exercise {
  id: string;
  name: string;
  name_cs: string | null;
  name_en: string | null;
  slug: string | null;
  search_name: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  description_cs: string | null;
  description_en: string | null;
  instructions_cs: string | null;
  instructions_en: string | null;
  muscle_groups: string[];
  secondary_muscle_groups: string[];
  equipment: string[];
  training_type: string[];
  difficulty: Difficulty | null;
  movement_pattern: MovementPattern | null;
  is_unilateral: boolean;
  is_bodyweight: boolean;
  is_time_based: boolean;
  default_unit: DefaultUnit;
  video_url: string | null;
  image_url: string | null;
  source: Source;
  is_archived: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExerciseMuscle {
  id: string;
  exercise_id: string;
  muscle: Muscle;
  role: MuscleRole;
  created_at: string;
}

export interface ExerciseEquipment {
  id: string;
  exercise_id: string;
  equipment: Equipment;
  created_at: string;
}

export interface ExerciseRelation {
  id: string;
  exercise_id: string;
  related_exercise_id: string;
  relation_type: RelationType;
  note_cs: string | null;
  note_en: string | null;
  created_at: string;
}

// Normalize text for search (remove diacritics)
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Generate slug from text
export function generateSlug(text: string): string {
  return normalizeText(text).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function useExercises() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exercises = [], isLoading, error } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('is_archived', { ascending: true })
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Exercise[];
    },
  });

  const createExercise = useMutation({
    mutationFn: async (exercise: Partial<Exercise>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const name = exercise.name_cs || exercise.name || '';
      const slug = generateSlug(name);
      const searchName = normalizeText(`${name} ${exercise.name_en || ''}`);
      
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          user_id: user.id,
          name: name,
          name_cs: name,
          name_en: exercise.name_en || null,
          slug,
          search_name: searchName,
          category: exercise.category || 'Ostatní',
          subcategory: exercise.subcategory || null,
          description: exercise.description_cs || exercise.description || null,
          description_cs: exercise.description_cs || null,
          description_en: exercise.description_en || null,
          instructions_cs: exercise.instructions_cs || null,
          instructions_en: exercise.instructions_en || null,
          difficulty: exercise.difficulty || null,
          movement_pattern: exercise.movement_pattern || null,
          is_unilateral: exercise.is_unilateral || false,
          is_bodyweight: exercise.is_bodyweight || false,
          is_time_based: exercise.is_time_based || false,
          default_unit: exercise.default_unit || 'reps',
          video_url: exercise.video_url || null,
          image_url: exercise.image_url || null,
          source: exercise.source || 'custom',
          muscle_groups: exercise.muscle_groups || [],
          secondary_muscle_groups: exercise.secondary_muscle_groups || [],
          equipment: exercise.equipment || [],
          training_type: exercise.training_type || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast({ title: 'Cvik přidán', description: 'Nový cvik byl úspěšně vytvořen.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat cvik.', variant: 'destructive' });
    },
  });

  const updateExercise = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Exercise> & { id: string }) => {
      const name = updates.name_cs || updates.name;
      const extraUpdates: Partial<Exercise> = {};
      
      if (name) {
        extraUpdates.slug = generateSlug(name);
        extraUpdates.search_name = normalizeText(`${name} ${updates.name_en || ''}`);
        extraUpdates.name = name;
      }
      
      const { data, error } = await supabase
        .from('exercises')
        .update({ ...updates, ...extraUpdates })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast({ title: 'Cvik aktualizován', description: 'Změny byly uloženy.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se uložit změny.', variant: 'destructive' });
    },
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast({ title: 'Cvik smazán', description: 'Cvik byl odstraněn.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se smazat cvik.', variant: 'destructive' });
    },
  });

  const archiveExercise = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { data, error } = await supabase
        .from('exercises')
        .update({ is_archived: archived })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { archived }) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast({ 
        title: archived ? 'Cvik archivován' : 'Cvik obnoven', 
        description: archived ? 'Cvik byl přesunut do archivu.' : 'Cvik byl obnoven z archivu.' 
      });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Operace se nezdařila.', variant: 'destructive' });
    },
  });

  const categories = [...new Set(exercises.map((e) => e.category))];

  return {
    exercises,
    categories,
    isLoading,
    error,
    createExercise,
    updateExercise,
    deleteExercise,
    archiveExercise,
  };
}

// Hook for exercise muscles
export function useExerciseMuscles(exerciseId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: muscles = [], isLoading } = useQuery({
    queryKey: ['exercise-muscles', exerciseId],
    queryFn: async () => {
      if (!exerciseId) return [];
      const { data, error } = await supabase
        .from('exercise_muscles')
        .select('*')
        .eq('exercise_id', exerciseId);
      if (error) throw error;
      return data as ExerciseMuscle[];
    },
    enabled: !!exerciseId,
  });

  const addMuscle = useMutation({
    mutationFn: async ({ exerciseId, muscle, role }: { exerciseId: string; muscle: Muscle; role: MuscleRole }) => {
      const { data, error } = await supabase
        .from('exercise_muscles')
        .insert({ exercise_id: exerciseId, muscle, role })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-muscles', exerciseId] });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat sval.', variant: 'destructive' });
    },
  });

  const removeMuscle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercise_muscles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-muscles', exerciseId] });
    },
  });

  return { muscles, isLoading, addMuscle, removeMuscle };
}

// Hook for exercise equipment
export function useExerciseEquipment(exerciseId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['exercise-equipment', exerciseId],
    queryFn: async () => {
      if (!exerciseId) return [];
      const { data, error } = await supabase
        .from('exercise_equipment')
        .select('*')
        .eq('exercise_id', exerciseId);
      if (error) throw error;
      return data as ExerciseEquipment[];
    },
    enabled: !!exerciseId,
  });

  const addEquipment = useMutation({
    mutationFn: async ({ exerciseId, equipment }: { exerciseId: string; equipment: Equipment }) => {
      const { data, error } = await supabase
        .from('exercise_equipment')
        .insert({ exercise_id: exerciseId, equipment })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-equipment', exerciseId] });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat vybavení.', variant: 'destructive' });
    },
  });

  const removeEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercise_equipment').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-equipment', exerciseId] });
    },
  });

  return { equipment, isLoading, addEquipment, removeEquipment };
}

// Hook for exercise relations
export function useExerciseRelations(exerciseId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: relations = [], isLoading } = useQuery({
    queryKey: ['exercise-relations', exerciseId],
    queryFn: async () => {
      if (!exerciseId) return [];
      const { data, error } = await supabase
        .from('exercise_relations')
        .select('*')
        .eq('exercise_id', exerciseId);
      if (error) throw error;
      return data as ExerciseRelation[];
    },
    enabled: !!exerciseId,
  });

  const addRelation = useMutation({
    mutationFn: async (relation: Omit<ExerciseRelation, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('exercise_relations')
        .insert(relation)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-relations', exerciseId] });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat vztah.', variant: 'destructive' });
    },
  });

  const removeRelation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercise_relations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-relations', exerciseId] });
    },
  });

  return { relations, isLoading, addRelation, removeRelation };
}
