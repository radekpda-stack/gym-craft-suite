/**
 * Hook pro správu hodnocení a komentářů k nutričním záznamům
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type EntryType = 'food' | 'drink' | 'coffee';

const getTableName = (type: EntryType) => {
  switch (type) {
    case 'food': return 'nutrition_food_entries';
    case 'drink': return 'nutrition_drink_entries';
    case 'coffee': return 'nutrition_coffee_entries';
  }
};

/**
 * Hook for trainer to add/update rating and comment
 */
export function useTrainerFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      type,
      entryId,
      rating,
      comment,
    }: {
      type: EntryType;
      entryId: string;
      rating: number | null;
      comment: string;
    }) => {
      const table = getTableName(type);

      const { error } = await supabase
        .from(table)
        .update({
          trainer_rating: rating,
          trainer_comment: comment || null,
        })
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-client-nutrition'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-entries'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-food'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-drinks'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-coffee'] });
      toast.success('Hodnocení uloženo');
    },
    onError: () => {
      toast.error('Nepodařilo se uložit hodnocení');
    },
  });
}

/**
 * Hook for client to add/update reply to trainer comment
 */
export function useClientReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      type,
      entryId,
      reply,
    }: {
      type: EntryType;
      entryId: string;
      reply: string;
    }) => {
      const table = getTableName(type);

      const { error } = await supabase
        .from(table)
        .update({
          client_reply: reply || null,
        })
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-entries'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-food'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-drinks'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-coffee'] });
      toast.success('Odpověď odeslána');
    },
    onError: () => {
      toast.error('Nepodařilo se odeslat odpověď');
    },
  });
}
