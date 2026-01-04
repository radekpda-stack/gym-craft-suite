import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExerciseEntry } from '@/hooks/useExerciseEntries';
import { EditEntryDialog } from '@/components/progress/EditEntryDialog';

interface EditExerciseEntryDialogProps {
  entryId: string | null;
  metricCategory?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditExerciseEntryDialog({ entryId, metricCategory, open, onOpenChange }: EditExerciseEntryDialogProps) {
  const { data: entry } = useQuery({
    queryKey: ['exercise-entry', entryId],
    queryFn: async () => {
      if (!entryId) return null;

      const { data, error } = await supabase
        .from('exercise_entries')
        .select('*')
        .eq('id', entryId)
        .single();

      if (error) throw error;
      return data as ExerciseEntry;
    },
    enabled: open && !!entryId,
  });

  return (
    <EditEntryDialog
      entry={entry ?? null}
      metricCategory={metricCategory ?? undefined}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
