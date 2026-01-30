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
import { EmptyState } from '@/components/ui/empty-state';
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
  Apple,
} from 'lucide-react';
import { SimpleAddWorkoutDialog } from '@/components/client-portal/workout-diary/SimpleAddWorkoutDialog';
import { EnhancedWorkoutCard } from '@/components/client-portal/workout-diary/EnhancedWorkoutCard';
import { TrainingCalendar } from '@/components/client-portal/calendar/TrainingCalendar';
import { getWorkoutTypeLabel, getWorkoutTypeIcon, getWorkoutTypeColor } from '@/components/client-portal/workout-diary/WorkoutTypeSelector';
import { cn } from '@/lib/utils';
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
  const [dialogOpen, setDialogOpen] = useState(false);

  // Handle URL parameters for tab and action
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const actionParam = searchParams.get('action');
    
    if (tabParam === 'nutrition') {
      setActiveTab('nutrition');
    }
    
    // Handle action=add-workout - open dialog automatically
    if (actionParam === 'add-workout') {
      setDialogOpen(true);
      // Clean up URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('action');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);
  
  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<UnifiedDiaryEntry | null>(null);

  // Only show completed entries, sorted by date
  const completedEntries = useMemo(() => {
    return (entries?.filter(e => e.status === 'completed' || e.status === 'reviewed') || [])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries]);

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
    machineMetrics?: {
      distance_meters?: number;
      duration_ms?: number;
      pace_per_500m_ms?: number;
      avg_watts?: number;
      cadence?: number;
      avg_speed_kmh?: number;
      incline_percent?: number;
      jump_count?: number;
      is_double_unders?: boolean;
    };
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
    
    // Add machine metrics to notes for trainer visibility
    if (data.machineMetrics && Object.keys(data.machineMetrics).length > 0) {
      const metricsInfo = formatMachineMetricsForNotes(data.workoutType, data.machineMetrics);
      if (metricsInfo) {
        fullNotes = metricsInfo + (fullNotes ? `\n${fullNotes}` : '');
      }
    } else if (data.distanceKm || data.paceMinPerKm) {
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
      has_machine_metrics: !!(data.machineMetrics && Object.keys(data.machineMetrics).length > 0),
    });
  };

  // Helper to format machine metrics for notes
  const formatMachineMetricsForNotes = (workoutType: string, metrics: {
    distance_meters?: number;
    duration_ms?: number;
    pace_per_500m_ms?: number;
    avg_watts?: number;
    cadence?: number;
    avg_speed_kmh?: number;
    incline_percent?: number;
    jump_count?: number;
    is_double_unders?: boolean;
  }) => {
    const parts: string[] = [];
    
    const formatTime = (ms: number): string => {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const centiseconds = Math.floor((ms % 1000) / 10);
      if (centiseconds > 0) {
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
    
    // Erg machines (rowing, skierg)
    if (workoutType === 'rowing' || workoutType === 'skierg') {
      if (metrics.distance_meters) parts.push(`${metrics.distance_meters} m`);
      if (metrics.duration_ms) parts.push(formatTime(metrics.duration_ms));
      if (metrics.pace_per_500m_ms) parts.push(`@ ${formatTime(metrics.pace_per_500m_ms)}/500m`);
      if (metrics.avg_watts) parts.push(`${metrics.avg_watts} W`);
      if (metrics.cadence) parts.push(`${metrics.cadence} spm`);
    }
    // Treadmill
    else if (workoutType === 'treadmill_motor' || workoutType === 'treadmill_curved') {
      if (metrics.distance_meters) parts.push(`${(metrics.distance_meters / 1000).toFixed(1)} km`);
      if (metrics.duration_ms) parts.push(formatTime(metrics.duration_ms));
      if (metrics.avg_speed_kmh) parts.push(`${metrics.avg_speed_kmh} km/h`);
      if (metrics.incline_percent) parts.push(`sklon ${metrics.incline_percent}%`);
      if (metrics.cadence) parts.push(`${metrics.cadence} spm`);
    }
    // Jump rope
    else if (workoutType === 'jumprope') {
      if (metrics.duration_ms) parts.push(formatTime(metrics.duration_ms));
      if (metrics.jump_count) parts.push(`${metrics.jump_count} přeskoků`);
      if (metrics.is_double_unders) parts.push('(double unders)');
    }
    
    return parts.join(' • ');
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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Dumbbell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Můj deník</h1>
          <p className="text-muted-foreground text-sm">Zaznamenávej aktivity mimo tréninky</p>
        </div>
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
          {/* Training Calendar - Compact widget */}
          <TrainingCalendar compact className="rounded-2xl" />

          {/* Add Workout Button - Always visible */}
          <Button 
            onClick={() => setDialogOpen(true)}
            className="w-full gap-2 h-12 rounded-2xl"
            size="lg"
          >
            <Plus className="w-5 h-5" />
            Přidat svůj trénink
          </Button>

          {/* Trainer-assigned workouts - Inline list (no collapsible) */}
          {hasPlannedWorkouts && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <ClipboardList className="w-4 h-4 text-primary" />
                <span className="font-medium text-primary">
                  {plannedWorkouts.length} {plannedWorkouts.length === 1 ? 'trénink od trenéra' : 'tréninky od trenéra'}
                </span>
              </div>
              
              {plannedWorkouts.map((workout) => {
                const Icon = getWorkoutTypeIcon(workout.workout_type);
                const isOverdue = workout.scheduled_for && isBefore(parseISO(workout.scheduled_for), startOfDay(new Date()));
                const isToday = workout.scheduled_for && 
                  format(parseISO(workout.scheduled_for), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                return (
                  <Card 
                    key={workout.id}
                    className={cn(
                      "overflow-hidden rounded-2xl",
                      isToday && "ring-2 ring-primary",
                      isOverdue && "border-destructive/50"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
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
          )}

          {/* Empty State - Simplified */}
          {completedEntries.length === 0 && !hasPlannedWorkouts ? (
            <EmptyState
              icon={Dumbbell}
              title="Tvůj deník je prázdný"
              description="Zaznamenávej aktivity, které děláš mimo tréninky s trenérem"
              actionLabel="Přidat aktivitu"
              onAction={() => setDialogOpen(true)}
              size="lg"
              variant="card"
            />
          ) : completedEntries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Moje záznamy ({completedEntries.length})
              </h3>
              {completedEntries.map((entry) => (
                <EnhancedWorkoutCard
                  key={entry.id}
                  entry={entry}
                  onDelete={entry.is_coached ? undefined : () => handleDeleteWorkout(entry)}
                />
              ))}
            </div>
          )}
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
