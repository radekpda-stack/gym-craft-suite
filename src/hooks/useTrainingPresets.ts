import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TrainingPreset {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  training_type: string | null;
  focus_tag_ids: string[];
  intensity_tag_id: string | null;
  body_part_tag_ids: string[];
  default_rpe: number | null;
  sort_order: number;
  is_global: boolean;
  client_id: string | null;
  created_at: string;
}

export interface CreatePresetInput {
  name: string;
  icon?: string;
  color?: string;
  training_type?: string;
  focus_tag_ids?: string[];
  intensity_tag_id?: string;
  body_part_tag_ids?: string[];
  default_rpe?: number;
  is_global?: boolean;
  client_id?: string;
}

export function useTrainingPresets(clientId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['training-presets', user?.id, clientId],
    queryFn: async (): Promise<TrainingPreset[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from('training_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      // Pokud je clientId, vrátit globální + specifické pro klienta
      if (clientId) {
        query = query.or(`is_global.eq.true,client_id.eq.${clientId}`);
      } else {
        // Jinak jen globální
        query = query.eq('is_global', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching training presets:', error);
        return [];
      }

      return (data || []).map((preset) => ({
        ...preset,
        focus_tag_ids: preset.focus_tag_ids || [],
        body_part_tag_ids: preset.body_part_tag_ids || [],
      }));
    },
    enabled: !!user?.id,
  });
}

export function useCreateTrainingPreset() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePresetInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('training_presets')
        .insert({
          user_id: user.id,
          name: input.name,
          icon: input.icon || null,
          color: input.color || null,
          training_type: input.training_type || null,
          focus_tag_ids: input.focus_tag_ids || [],
          intensity_tag_id: input.intensity_tag_id || null,
          body_part_tag_ids: input.body_part_tag_ids || [],
          default_rpe: input.default_rpe || null,
          is_global: input.is_global ?? true,
          client_id: input.client_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-presets'] });
      toast.success('Rychlá sada vytvořena');
    },
    onError: (error) => {
      console.error('Error creating preset:', error);
      toast.error('Nepodařilo se vytvořit rychlou sadu');
    },
  });
}

export function useUpdateTrainingPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<CreatePresetInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_presets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-presets'] });
      toast.success('Rychlá sada upravena');
    },
    onError: (error) => {
      console.error('Error updating preset:', error);
      toast.error('Nepodařilo se upravit rychlou sadu');
    },
  });
}

export function useDeleteTrainingPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_presets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-presets'] });
      toast.success('Rychlá sada smazána');
    },
    onError: (error) => {
      console.error('Error deleting preset:', error);
      toast.error('Nepodařilo se smazat rychlou sadu');
    },
  });
}
