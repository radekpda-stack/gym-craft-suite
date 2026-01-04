import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useCompleteAssignedWorkout } from '@/hooks/useAssignWorkout';
import { useUnifiedDiary, usePlannedWorkouts, UnifiedDiaryEntry } from '@/hooks/useUnifiedDiary';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Plus, 
  Dumbbell, 
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Apple,
} from 'lucide-react';
import { SimpleAddWorkoutDialog } from '@/components/client-portal/workout-diary/SimpleAddWorkoutDialog';
import { SimpleWorkoutCard } from '@/components/client-portal/workout-diary/SimpleWorkoutCard';
import { SimpleStatsCard } from '@/components/client-portal/workout-diary/SimpleStatsCard';
import { getWorkoutTypeLabel, getWorkoutTypeIcon, getWorkoutTypeColor } from '@/components/client-portal/workout-diary/WorkoutTypeSelector';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Lazy load the nutrition content to avoid circular dependencies
const NutritionTabContent = lazy(() => import('./ClientPortalNutritionTab'));

export default function ClientPortalWorkoutDiary() {
  const { clientId, clientAccount } = useClientPortal();
  const [searchParams] = useSearchParams();
  const { data: entries, isLoading } = useUnifiedDiary();
  const { data: plannedWorkouts, isLoading: loadingPlanned } = usePlannedWorkouts();
  const createLog = useCreateWorkoutLog();
  const deleteLog = useDeleteWorkoutLog();
  const completeAssignedWorkout = useCompleteAssignedWorkout();
  const { trackPortalEvent } = useClientPortalPageTracking('client_portal_workout_diary');

  // Initialize tab from URL query parameter
  const initialTab = searchParams.get('tab') === 'nutrition' ? 'nutrition' : 'workouts';
  const [activeTab, setActiveTab] = useState<'workouts' | 'nutrition'>(initialTab);

  // Update tab when URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'nutrition') {
      setActiveTab('nutrition');
    }
  }, [searchParams]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [trainerSectionExpanded, setTrainerSectionExpanded] = useState(true);
  
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
    distanceKm?: number;
    paceMinPerKm?: string;
    exercises?: Array<{
      exercise_name: string;
      exercise_id?: string | null;
      sets?: number;
      reps?: number;
      weight_kg?: number;
    }>;
  }) => {
    if (!clientId || !clientAccount?.trainer_id) return;

    // Build notes with cardio metrics if provided
    let fullNotes = data.notes || '';
    if (data.distanceKm || data.paceMinPerKm) {
      const cardioInfo = [];
      if (data.distanceKm) cardioInfo.push(`${data.distanceKm} km`);
      if (data.paceMinPerKm) cardioInfo.push(`@ ${data.paceMinPerKm} min/km`);
      fullNotes = cardioInfo.join(' ') + (fullNotes ? `\n${fullNotes}` : '');
    }

    // Prepare exercises array
    const exercisesToSave = data.exercises?.map((ex, idx) => ({
      exercise_name: ex.exercise_name,
      exercise_id: ex.exercise_id || null,
      sets: ex.sets || null,
      reps: ex.reps || null,
      weight_kg: ex.weight_kg || null,
      sort_order: idx,
    })) || [];

    await createLog.mutateAsync({
      client_id: clientId,
      trainer_id: clientAccount.trainer_id,
      date: data.date,
      notes: fullNotes || undefined,
      workout_type: data.workoutType,
      duration_minutes: data.durationMinutes,
      energy_after: data.feeling,
      exercises: exercisesToSave,
    });

    toast.success('Trénink odeslán trenérovi! 💪');
    trackPortalEvent('workout_logged', { 
      workout_type: data.workoutType,
      duration: data.durationMinutes,
      feeling: data.feeling,
      has_exercises: exercisesToSave.length > 0,
      has_cardio_metrics: !!(data.distanceKm || data.paceMinPerKm),
    });
  };

  const handleCompleteAssignedWorkout = async (workout: UnifiedDiaryEntry) => {
    if (!clientId) return;
    
    await completeAssignedWorkout.mutateAsync({
      logId: workout.id,
      clientId,
      duration_minutes: workout.duration_minutes || undefined,
    });
    
    toast.success('Trénink splněn! 🎉');
    trackPortalEvent('planned_workout_completed', { workout_type: workout.workout_type });
  };

  if (isLoading || loadingPlanned) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const hasPlannedWorkouts = plannedWorkouts && plannedWorkouts.length > 0;
  const isSaving = createLog.isPending || completeAssignedWorkout.isPending;

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Můj deník</h1>
        <p className="text-muted-foreground text-sm">
          Sleduj své tréninky a stravu
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'workouts' | 'nutrition')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="workouts" className="gap-2">
            <Dumbbell className="w-4 h-4" />
            Tréninky
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="gap-2">
            <Apple className="w-4 h-4" />
            Strava
          </TabsTrigger>
        </TabsList>

        {/* Workouts Tab */}
        <TabsContent value="workouts" className="mt-4 space-y-4">
          {/* Stats Card */}
          {workoutDates.length > 0 && (
            <SimpleStatsCard workoutDates={workoutDates} />
          )}

          {/* Trainer-assigned workouts section */}
          {hasPlannedWorkouts && (
            <Card className="border-primary/30 bg-primary/5">
              <button
                className="w-full p-4 flex items-center justify-between text-left"
                onClick={() => setTrainerSectionExpanded(!trainerSectionExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">Tréninky od trenéra</h3>
                    <p className="text-sm text-muted-foreground">
                      {plannedWorkouts.length} {plannedWorkouts.length === 1 ? 'naplánovaný trénink' : 'naplánované tréninky'}
                    </p>
                  </div>
                </div>
                {trainerSectionExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              <AnimatePresence>
                {trainerSectionExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {plannedWorkouts.map((workout) => {
                        const Icon = getWorkoutTypeIcon(workout.workout_type);
                        const isOverdue = workout.scheduled_for && isBefore(parseISO(workout.scheduled_for), startOfDay(new Date()));
                        const isToday = workout.scheduled_for && 
                          format(parseISO(workout.scheduled_for), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                        return (
                          <Card 
                            key={workout.id}
                            className={cn(
                              "overflow-hidden",
                              isToday && "ring-2 ring-primary",
                              isOverdue && "border-destructive/50"
                            )}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                    getWorkoutTypeColor(workout.workout_type)
                                  )}>
                                    <Icon className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">
                                        {getWorkoutTypeLabel(workout.workout_type)}
                                      </span>
                                      {isToday && (
                                        <Badge variant="default" className="text-xs">Dnes</Badge>
                                      )}
                                      {isOverdue && (
                                        <Badge variant="destructive" className="text-xs">Zpožděno</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                      {workout.scheduled_for && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-3.5 h-3.5" />
                                          {format(parseISO(workout.scheduled_for), 'EEEE d. M.', { locale: cs })}
                                        </span>
                                      )}
                                      {workout.duration_minutes && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3.5 h-3.5" />
                                          {workout.duration_minutes} min
                                        </span>
                                      )}
                                    </div>
                                    {workout.notes && (
                                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                        {workout.notes}
                                      </p>
                                    )}
                                    {workout.exercises && workout.exercises.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {workout.exercises.slice(0, 3).map((ex, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {ex.exercise_name}
                                          </Badge>
                                        ))}
                                        {workout.exercises.length > 3 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{workout.exercises.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleCompleteAssignedWorkout(workout)}
                                  disabled={completeAssignedWorkout.isPending}
                                  className="shrink-0"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Splnit
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}

          {/* Workout List */}
          {completedEntries.length === 0 && !hasPlannedWorkouts ? (
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
          ) : completedEntries.length > 0 && (
            <>
              <h3 className="text-lg font-semibold flex items-center gap-2 pt-2">
                <Dumbbell className="w-5 h-5" />
                Moje tréninky
              </h3>
              <div className="space-y-3">
                {completedEntries.map((entry) => (
                  <SimpleWorkoutCard
                    key={entry.id}
                    entry={entry}
                    onDelete={entry.is_coached ? undefined : () => handleDeleteWorkout(entry)}
                  />
                ))}
              </div>
            </>
          )}

          {/* FAB Button for workouts */}
          <Button
            size="lg"
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-lg z-40"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </TabsContent>

        {/* Nutrition Tab */}
        <TabsContent value="nutrition" className="mt-4">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <NutritionTabContent />
          </Suspense>
        </TabsContent>
      </Tabs>

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
