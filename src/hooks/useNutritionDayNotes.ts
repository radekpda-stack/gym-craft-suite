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
    }: {
      clientId: string;
      date: Date | string;
      clientNote?: string | null;
      trainerNote?: string | null;
    }) => {
      const dateStr = date instanceof Date ? format(date, 'yyyy-MM-dd') : date;

      const updateData: Record<string, unknown> = {
        client_id: clientId,
        date: dateStr,
      };

      if (clientNote !== undefined) {
        updateData.client_note = clientNote || null;
      }
      if (trainerNote !== undefined) {
        updateData.trainer_note = trainerNote || null;
      }

      // First check if note exists
      const { data: existing } = await supabase
        .from('nutrition_day_notes')
        .select('id')
        .eq('client_id', clientId)
        .eq('date', dateStr)
        .maybeSingle();

      let result;
      if (existing) {
        // Update existing
        const updateFields: Record<string, string | null> = {};
        if (clientNote !== undefined) updateFields.client_note = clientNote || null;
        if (trainerNote !== undefined) updateFields.trainer_note = trainerNote || null;
        
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
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      return result as NutritionDayNote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-day-note', data.client_id, data.date] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-day-notes', data.client_id] });
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
