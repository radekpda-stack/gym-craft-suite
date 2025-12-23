import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PreviousTrainingData {
  id: string;
  date: string;
  duration: number;
  status: string;
  notes: string | null;
  subjective_rating: number | null;
  training_type: string | null;
  training_goal: string | null;
  tags: { id: string; name: string; color: string }[];
}

export function usePreviousTraining(clientId: string | undefined, currentTrainingDate: string | undefined) {
  return useQuery({
    queryKey: ['previous-training', clientId, currentTrainingDate],
    queryFn: async () => {
      if (!clientId || !currentTrainingDate) return null;

      // Get the previous completed training for this client before the current date
      const { data: training, error } = await supabase
        .from('training_sessions')
        .select('id, date, duration, status, notes, subjective_rating, training_type, training_goal')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .lt('date', currentTrainingDate)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!training) return null;

      // Get tags for this training
      const { data: trainingTags, error: tagsError } = await supabase
        .from('training_session_tags')
        .select('tag_id, tags(id, name, color)')
        .eq('training_session_id', training.id);

      if (tagsError) throw tagsError;

      const tags = (trainingTags || [])
        .filter((tt: any) => tt.tags)
        .map((tt: any) => ({
          id: tt.tags.id,
          name: tt.tags.name,
          color: tt.tags.color || '#6366f1',
        }));

      return {
        ...training,
        tags,
      } as PreviousTrainingData;
    },
    enabled: !!clientId && !!currentTrainingDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
