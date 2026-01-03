import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useCreateWorkoutLog, useDeleteWorkoutLog } from '@/hooks/useClientWorkoutLogs';
import { useUnifiedDiary, UnifiedDiaryEntry } from '@/hooks/useUnifiedDiary';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { format } from 'date-fns';
import { Plus, Dumbbell } from 'lucide-react';
import { SimpleAddWorkoutDialog } from '@/components/client-portal/workout-diary/SimpleAddWorkoutDialog';
import { SimpleWorkoutCard } from '@/components/client-portal/workout-diary/SimpleWorkoutCard';
import { SimpleStatsCard } from '@/components/client-portal/workout-diary/SimpleStatsCard';
import { toast } from 'sonner';

export default function ClientPortalWorkoutDiary() {
  const { clientId, clientAccount } = useClientPortal();
  const { data: entries, isLoading, refetch } = useUnifiedDiary();
  const createLog = useCreateWorkoutLog();
  const deleteLog = useDeleteWorkoutLog();
  const { trackPortalEvent } = useClientPortalPageTracking('client_portal_workout_diary');

  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<UnifiedDiaryEntry | null>(null);

  // Only show completed entries, sorted by date
  const completedEntries = useMemo(() => {
    return (entries?.filter(e => e.status === 'completed' || e.status === 'reviewed') || [])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries]);

  // Extract workout dates for stats
  const workoutDates = useMemo(() => {
    return completedEntries
      .filter(e => !e.is_coached)
      .map(e => e.date);
  }, [completedEntries]);

  const handleDeleteWorkout = (entry: UnifiedDiaryEntry) => {
    if (entry.is_coached) return;
    setLogToDelete(entry);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!logToDelete || !clientId) return;
    await deleteLog.mutateAsync({ logId: logToDelete.id, clientId });
    setDeleteConfirmOpen(false);
    setLogToDelete(null);
    toast.success('Trénink smazán');
    trackPortalEvent('workout_deleted', { workout_type: logToDelete.workout_type });
  };

  const handleSaveWorkout = async (data: {
    workoutType: string;
    durationMinutes: number;
    feeling: number;
    notes: string;
    date: string;
  }) => {
    if (!clientId || !clientAccount?.trainer_id) return;

    await createLog.mutateAsync({
      client_id: clientId,
      trainer_id: clientAccount.trainer_id,
      date: data.date,
      notes: data.notes || undefined,
      workout_type: data.workoutType,
      duration_minutes: data.durationMinutes,
      energy_after: data.feeling,
      exercises: [], // No detailed exercises in simple mode
    });

    toast.success('Trénink odeslán trenérovi! 💪');
    trackPortalEvent('workout_logged', { 
      workout_type: data.workoutType,
      duration: data.durationMinutes,
      feeling: data.feeling
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const isSaving = createLog.isPending;

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Můj deník</h1>
        <p className="text-muted-foreground text-sm">
          Zaznamenej si své tréninky
        </p>
      </div>

      {/* Stats Card */}
      {workoutDates.length > 0 && (
        <SimpleStatsCard workoutDates={workoutDates} />
      )}

      {/* Workout List */}
      {completedEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">Zatím žádné záznamy</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Začni zaznamenávat své tréninky
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Přidat první trénink
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {completedEntries.map((entry) => (
            <SimpleWorkoutCard
              key={entry.id}
              entry={entry}
              onDelete={entry.is_coached ? undefined : () => handleDeleteWorkout(entry)}
            />
          ))}
        </div>
      )}

      {/* FAB Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Add Workout Dialog */}
      <SimpleAddWorkoutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveWorkout}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat trénink?</AlertDialogTitle>
            <AlertDialogDescription>
              Tento záznam bude trvale odstraněn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
