import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Clock, Zap, ExternalLink, Loader2, Trophy, MessageSquare, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { UnifiedNotification } from '@/hooks/useAggregatedNotifications';

interface WorkoutLogDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: UnifiedNotification | null;
}

interface WorkoutLog {
  id: string;
  date: string;
  workout_type: string | null;
  duration_minutes: number | null;
  energy_before: number | null;
  energy_after: number | null;
  notes: string | null;
  trainer_comment: string | null;
  client_id: string;
}

interface WorkoutExercise {
  id: string;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  notes: string | null;
  sort_order: number;
  is_personal_record: boolean | null;
  side: string | null;
}

const WORKOUT_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  strength: { icon: '💪', label: 'Silový trénink' },
  silový: { icon: '💪', label: 'Silový trénink' },
  cardio: { icon: '🏃', label: 'Kardio' },
  kardio: { icon: '🏃', label: 'Kardio' },
  mobility: { icon: '🧘', label: 'Mobilita' },
  mobilita: { icon: '🧘', label: 'Mobilita' },
  hiit: { icon: '⚡', label: 'HIIT' },
  crossfit: { icon: '🏋️', label: 'CrossFit' },
  other: { icon: '🎯', label: 'Trénink' },
  ostatní: { icon: '🎯', label: 'Trénink' },
};

const SIDE_LABELS: Record<string, string> = {
  left: 'L',
  right: 'R',
  both: 'L+R',
};

export function WorkoutLogDetailDialog({
  open,
  onOpenChange,
  notification,
}: WorkoutLogDetailDialogProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [clientName, setClientName] = useState<string>('');
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);

  useEffect(() => {
    if (!open || !notification) {
      setWorkoutLog(null);
      setExercises([]);
      setClientName('');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const workoutLogId = notification.entity_id;
        const clientId = notification.client_id;

        if (!workoutLogId) {
          console.error('[WorkoutLogDetailDialog] No entity_id in notification');
          return;
        }

        // Fetch client name
        if (clientId) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('name')
            .eq('id', clientId)
            .maybeSingle();
          
          if (clientData?.name) {
            setClientName(clientData.name);
          }
        }

        // Fetch workout log
        const { data: logData } = await supabase
          .from('client_workout_logs')
          .select('id, date, workout_type, duration_minutes, energy_before, energy_after, notes, trainer_comment, client_id')
          .eq('id', workoutLogId)
          .maybeSingle();

        if (logData) {
          setWorkoutLog(logData);

          // Fetch exercises
          const { data: exercisesData } = await supabase
            .from('client_workout_exercises')
            .select('id, exercise_name, sets, reps, weight_kg, duration_seconds, distance_meters, rpe, notes, sort_order, is_personal_record, side')
            .eq('workout_log_id', workoutLogId)
            .order('sort_order', { ascending: true });

          setExercises(exercisesData || []);
        }
      } catch (error) {
        console.error('[WorkoutLogDetailDialog] Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, notification]);

  const handleNavigateToFullDiary = () => {
    const clientId = workoutLog?.client_id || notification?.client_id;
    if (clientId) {
      onOpenChange(false);
      navigate(`/clients/${clientId}?tab=trainings`);
    }
  };

  const getWorkoutTypeConfig = (type: string | null) => {
    if (!type) return WORKOUT_TYPE_CONFIG.other;
    const normalizedType = type.toLowerCase();
    return WORKOUT_TYPE_CONFIG[normalizedType] || WORKOUT_TYPE_CONFIG.other;
  };

  const formatExerciseDetails = (exercise: WorkoutExercise): string => {
    const parts: string[] = [];

    // Strength-style: sets × reps @ weight
    if (exercise.sets && exercise.reps) {
      let detail = `${exercise.sets}×${exercise.reps}`;
      if (exercise.weight_kg) {
        detail += ` @ ${exercise.weight_kg} kg`;
      }
      parts.push(detail);
    } else if (exercise.sets) {
      parts.push(`${exercise.sets} sérií`);
    }

    // Cardio-style: duration or distance
    if (exercise.duration_seconds) {
      const mins = Math.floor(exercise.duration_seconds / 60);
      const secs = exercise.duration_seconds % 60;
      if (mins > 0 && secs > 0) {
        parts.push(`${mins} min ${secs} s`);
      } else if (mins > 0) {
        parts.push(`${mins} min`);
      } else {
        parts.push(`${secs} s`);
      }
    }

    if (exercise.distance_meters) {
      if (exercise.distance_meters >= 1000) {
        parts.push(`${(exercise.distance_meters / 1000).toFixed(1)} km`);
      } else {
        parts.push(`${exercise.distance_meters} m`);
      }
    }

    return parts.join(' • ');
  };

  const formattedDate = workoutLog?.date
    ? format(parseISO(workoutLog.date), 'EEEE d. MMMM yyyy', { locale: cs })
    : notification
      ? format(parseISO(notification.created_at), 'EEEE d. MMMM yyyy', { locale: cs })
      : '';

  const workoutTypeConfig = getWorkoutTypeConfig(workoutLog?.workout_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">🏋️</span>
            Trénink klienta
          </DialogTitle>
          <DialogDescription>
            {clientName && <span className="font-medium text-foreground">{clientName}</span>}
            {clientName && ' • '}
            <span className="capitalize">{formattedDate}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !workoutLog ? (
            <div className="text-center py-8">
              <Dumbbell className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Záznam tréninku nebyl nalezen
              </p>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {/* Overview Section */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{workoutTypeConfig.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">
                      {workoutTypeConfig.label}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-muted-foreground">
                      {workoutLog.duration_minutes && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{workoutLog.duration_minutes} min</span>
                        </div>
                      )}
                      {(workoutLog.energy_before != null || workoutLog.energy_after != null) && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          <span>
                            Energie: {workoutLog.energy_before ?? '?'} 
                            <ArrowRight className="w-3 h-3 inline mx-1" />
                            {workoutLog.energy_after ?? '?'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Exercises Section */}
              {exercises.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Dumbbell className="w-4 h-4 text-orange-600" />
                    <h3 className="text-sm font-semibold text-foreground">Cviky</h3>
                    <span className="text-xs text-muted-foreground">({exercises.length})</span>
                  </div>
                  <div className="space-y-2">
                    {exercises.map((exercise, index) => (
                      <div
                        key={exercise.id}
                        className="p-3 rounded-xl bg-muted/50 border border-border/50"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-medium text-muted-foreground shrink-0 w-6">
                            {index + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {exercise.exercise_name}
                              </span>
                              {exercise.side && exercise.side !== 'none' && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {SIDE_LABELS[exercise.side] || exercise.side}
                                </Badge>
                              )}
                              {exercise.is_personal_record && (
                                <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30 text-[10px] px-1.5 py-0">
                                  <Trophy className="w-3 h-3 mr-0.5" />
                                  PR
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-0.5">
                              {formatExerciseDetails(exercise)}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {exercise.rpe && (
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  exercise.rpe >= 9 ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" :
                                  exercise.rpe >= 7 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" :
                                  "bg-secondary text-secondary-foreground"
                                )}>
                                  RPE {exercise.rpe}
                                </span>
                              )}
                            </div>
                            {exercise.notes && (
                              <p className="text-xs text-muted-foreground mt-1.5 italic">
                                {exercise.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Section */}
              {workoutLog.notes && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-foreground">Poznámky</h3>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {workoutLog.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Trainer Comment */}
              {workoutLog.trainer_comment && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Komentář trenéra</h3>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {workoutLog.trainer_comment}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center gap-2 pt-4 border-t shrink-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Zavřít
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={handleNavigateToFullDiary}
          >
            <ExternalLink className="w-4 h-4" />
            Zobrazit celý deník
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
