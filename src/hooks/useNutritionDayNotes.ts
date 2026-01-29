/**
 * Hook for managing nutrition day notes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export interface NutritionDayNote {
  id: string;
  client_id: string;
  date: string;
  client_note: string | null;
  trainer_note: string | null;
  is_checked: boolean;
  checked_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch day note for a specific date
 */
export function useDayNote(clientId: string | undefined, date: Date | string | undefined) {
  const dateStr = date instanceof Date ? format(date, 'yyyy-MM-dd') : date;

  return useQuery({
    queryKey: ['nutrition-day-note', clientId, dateStr],
    queryFn: async (): Promise<NutritionDayNote | null> => {
      if (!clientId || !dateStr) return null;

      const { data, error } = await supabase
        .from('nutrition_day_notes')
        .select('*')
        .eq('client_id', clientId)
        .eq('date', dateStr)
        .maybeSingle();

      if (error) {
        console.error('Error fetching day note:', error);
        throw error;
      }

      return data as NutritionDayNote | null;
    },
    enabled: !!clientId && !!dateStr,
  });
}

/**
 * Fetch day notes for a date range
 */
export function useDayNotes(
  clientId: string | undefined,
  startDate: Date | string,
  endDate: Date | string
) {
  const startStr = startDate instanceof Date ? format(startDate, 'yyyy-MM-dd') : startDate;
  const endStr = endDate instanceof Date ? format(endDate, 'yyyy-MM-dd') : endDate;

  return useQuery({
    queryKey: ['nutrition-day-notes', clientId, startStr, endStr],
    queryFn: async (): Promise<NutritionDayNote[]> => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('nutrition_day_notes')
        .select('*')
        .eq('client_id', clientId)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching day notes:', error);
        throw error;
      }

      return (data || []) as NutritionDayNote[];
    },
    enabled: !!clientId,
  });
}

/**
 * Upsert a day note (create or update)
 */
export function useUpsertDayNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      date,
      clientNote,
      trainerNote,
      isChecked,
      // Track if this is a trainer action (to send notifications)
      isTrainerAction = false,
    }: {
      clientId: string;
      date: Date | string;
      clientNote?: string | null;
      trainerNote?: string | null;
      isChecked?: boolean;
      isTrainerAction?: boolean;
    }) => {
      const dateStr = date instanceof Date ? format(date, 'yyyy-MM-dd') : date;
      const formattedDate = format(new Date(dateStr), 'd.M.yyyy');

      // First check if note exists
      const { data: existing } = await supabase
        .from('nutrition_day_notes')
        .select('id, is_checked, trainer_note')
        .eq('client_id', clientId)
        .eq('date', dateStr)
        .maybeSingle();

      const wasChecked = existing?.is_checked || false;
      const hadTrainerNote = !!existing?.trainer_note;

      let result;
      if (existing) {
        // Update existing
        const updateFields: Record<string, string | boolean | null> = {};
        if (clientNote !== undefined) updateFields.client_note = clientNote || null;
        if (trainerNote !== undefined) updateFields.trainer_note = trainerNote || null;
        if (isChecked !== undefined) {
          updateFields.is_checked = isChecked;
          updateFields.checked_at = isChecked ? new Date().toISOString() : null;
        }
        
        const { data, error } = await supabase
          .from('nutrition_day_notes')
          .update(updateFields)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('nutrition_day_notes')
          .insert({
            client_id: clientId,
            date: dateStr,
            client_note: clientNote || null,
            trainer_note: trainerNote || null,
            is_checked: isChecked || false,
            checked_at: isChecked ? new Date().toISOString() : null,
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      // Create notifications for client when trainer actions occur
      if (isTrainerAction) {
        // Notification when trainer checks the day (only if newly checked)
        if (isChecked === true && !wasChecked) {
          await supabase.from('client_portal_notifications').insert({
            client_id: clientId,
            type: 'nutrition_day_checked',
            title: '✅ Jídelníček zkontrolován',
            message: `Trenér zkontroloval váš jídelníček pro ${formattedDate}`,
            action_url: '/client/nutrition',
            metadata: { date: dateStr },
          });
        }

        // Notification when trainer adds a day note
        if (trainerNote && trainerNote !== existing?.trainer_note) {
          await supabase.from('client_portal_notifications').insert({
            client_id: clientId,
            type: 'nutrition_day_note',
            title: '📝 Nová poznámka od trenéra',
            message: trainerNote.substring(0, 100) + (trainerNote.length > 100 ? '...' : ''),
            action_url: '/client/nutrition',
            metadata: { date: dateStr },
          });
        }
      }

      return result as NutritionDayNote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-day-note', data.client_id, data.date] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-day-notes', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['client-portal-notifications'] });
      toast.success('Poznámka uložena');
    },
    onError: (error) => {
      console.error('Error saving day note:', error);
      toast.error('Nepodařilo se uložit poznámku');
    },
  });
}

/**
 * Delete a day note
 */
export function useDeleteDayNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, clientId }: { noteId: string; clientId: string }) => {
      const { error } = await supabase
        .from('nutrition_day_notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        console.error('Error deleting day note:', error);
        throw error;
      }

      return { noteId, clientId };
    },
    onSuccess: ({ clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-day-note', clientId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-day-notes', clientId] });
      toast.success('Poznámka smazána');
    },
    onError: (error) => {
      console.error('Error deleting day note:', error);
      toast.error('Nepodařilo se smazat poznámku');
    },
  });
}
