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

      // First get the entry to check previous state and get client_id
      // Different tables have different columns, so we select what we need
      const selectColumns = type === 'coffee' 
        ? 'client_id, coffee_type, entry_date, trainer_comment'
        : 'client_id, description, entry_date, trainer_comment';
      
      const { data: entry } = await supabase
        .from(table)
        .select(selectColumns)
        .eq('id', entryId)
        .single();

      const { error } = await supabase
        .from(table)
        .update({
          trainer_rating: rating,
          trainer_comment: comment || null,
        })
        .eq('id', entryId);

      if (error) throw error;

      // Create notification for client if trainer added a new comment
      const prevComment = (entry as any)?.trainer_comment;
      if (comment && entry && comment !== prevComment) {
        // Get description or coffee_type for the preview
        const itemDescription = type === 'coffee' 
          ? (entry as any).coffee_type || 'kávu'
          : (entry as any).description;
        const descriptionPreview = itemDescription 
          ? String(itemDescription).substring(0, 40) + (String(itemDescription).length > 40 ? '...' : '')
          : 'záznam';
        
        await supabase.from('client_portal_notifications').insert({
          client_id: (entry as any).client_id,
          type: 'nutrition_entry_comment',
          title: '💬 Nový komentář od trenéra',
          message: `Trenér okomentoval: ${descriptionPreview}`,
          action_url: '/client/nutrition',
          metadata: { entry_date: (entry as any).entry_date },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-client-nutrition'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-entries'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-food'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-drinks'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-coffee'] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-notifications'] });
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
