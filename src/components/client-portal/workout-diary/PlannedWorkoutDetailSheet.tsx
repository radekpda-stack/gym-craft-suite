import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, Timer, MapPin, Zap, MessageSquare, Calendar, Clock, Play, Info } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { UnifiedDiaryEntry, DiaryExercise } from "@/hooks/useUnifiedDiary";
import { formatTimeSeconds, detectExerciseMetricCategory } from "@/lib/exerciseMetrics";
import { useAllExerciseDetails, ExerciseLookupData } from "@/hooks/useExerciseDetailsLookup";
import { ExerciseDetailSheet, ExerciseDetailData } from "./ExerciseDetailSheet";

interface PlannedWorkoutDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: UnifiedDiaryEntry | null;
  onStartWorkout?: (workout: UnifiedDiaryEntry) => void;
}

const WORKOUT_TYPE_LABELS: Record<string, string> = {
  strength: "Síla",
  cardio: "Kardio",
  mobility: "Mobilita",
  hiit: "HIIT",
  other: "Ostatní",
};

const WORKOUT_TYPE_ICONS: Record<string, React.ElementType> = {
  strength: Dumbbell,
  cardio: Timer,
  mobility: Zap,
  hiit: Zap,
  other: Dumbbell,
};

function formatExerciseDetails(exercise: DiaryExercise): { primary: string; secondary?: string; isCardio: boolean } {
  const category = detectExerciseMetricCategory(exercise.exercise_name);
  const isCardio = category !== 'strength' || 
    (exercise.duration_seconds && !exercise.weight_kg) || 
    !!exercise.distance_meters;

  if (isCardio) {
    const parts: string[] = [];
    
    if (exercise.distance_meters) {
      const distanceKm = exercise.distance_meters / 1000;
      parts.push(distanceKm >= 1 ? `${distanceKm.toFixed(2)} km` : `${exercise.distance_meters} m`);
    }
    
    if (exercise.duration_seconds) {
      parts.push(formatTimeSeconds(exercise.duration_seconds));
    }

    // Calculate pace if we have both distance and time
    let pace: string | undefined;
    if (exercise.distance_meters && exercise.duration_seconds && exercise.distance_meters > 0) {
      const pacePer500m = (exercise.duration_seconds / exercise.distance_meters) * 500;
      pace = `${formatTimeSeconds(pacePer500m)} /500m`;
    }

    return {
      primary: parts.join(" • ") || "—",
      secondary: pace,
      isCardio: true,
    };
  }

  // Strength exercise
  const parts: string[] = [];
  
  if (exercise.sets && exercise.reps) {
    parts.push(`${exercise.sets}×${exercise.reps}`);
  } else if (exercise.sets) {
    parts.push(`${exercise.sets} sérií`);
  } else if (exercise.reps) {
    parts.push(`${exercise.reps} opakování`);
  }

  if (exercise.weight_kg) {
    parts.push(`${exercise.weight_kg} kg`);
  }

  if (exercise.rpe) {
    parts.push(`RPE ${exercise.rpe}`);
  }

  return {
    primary: parts.join(" • ") || "—",
    isCardio: false,
  };
}

export function PlannedWorkoutDetailSheet({
  open,
  onOpenChange,
  workout,
  onStartWorkout,
}: PlannedWorkoutDetailSheetProps) {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDetailData | null>(null);
  const [exerciseDetailOpen, setExerciseDetailOpen] = useState(false);
  
  // Fetch exercise details for lookups
  const { data: exerciseLookup } = useAllExerciseDetails();

  if (!workout) return null;

  const workoutType = workout.workout_type || "other";
  const WorkoutIcon = WORKOUT_TYPE_ICONS[workoutType] || Dumbbell;
  const workoutLabel = WORKOUT_TYPE_LABELS[workoutType] || workoutType;

  const getExerciseDetails = (exerciseName: string): ExerciseLookupData | undefined => {
    if (!exerciseLookup) return undefined;
    return exerciseLookup.get(exerciseName.toLowerCase());
  };

  const handleExerciseClick = (exercise: DiaryExercise) => {
    const details = getExerciseDetails(exercise.exercise_name);
    setSelectedExercise({
      name: exercise.exercise_name,
      description_cs: details?.description_cs,
      instructions_cs: details?.instructions_cs,
      equipment: details?.equipment,
      muscle_groups: details?.muscle_groups,
    });
    setExerciseDetailOpen(true);
  };

  const hasExerciseInfo = (exerciseName: string): boolean => {
    const details = getExerciseDetails(exerciseName);
    return !!(details?.description_cs || details?.instructions_cs);
  };

  const scheduledDate = workout.scheduled_for 
    ? new Date(workout.scheduled_for) 
    : new Date(workout.date);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <WorkoutIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg font-semibold">
                {workoutLabel}
              </SheetTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(scheduledDate, "EEEE d. MMMM", { locale: cs })}
                </span>
                {workout.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {workout.duration_minutes} min
                  </span>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {/* Exercises Section */}
          {workout.exercises && workout.exercises.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                Cviky ({workout.exercises.length})
              </h3>
              <div className="space-y-2">
                {workout.exercises.map((exercise, index) => {
                  const details = formatExerciseDetails(exercise);
                  const hasInfo = hasExerciseInfo(exercise.exercise_name);

                  return (
                    <Card 
                      key={exercise.id || index} 
                      className="bg-secondary/30 border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors"
                      onClick={() => handleExerciseClick(exercise)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <span className="font-medium text-sm truncate">
                                {exercise.exercise_name}
                              </span>
                              {hasInfo && (
                                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                            </div>
                            <div className="mt-1.5 pl-7 text-sm text-muted-foreground">
                              {details.primary}
                            </div>
                            {details.secondary && (
                              <div className="mt-0.5 pl-7">
                                <Badge variant="secondary" className="text-xs font-normal">
                                  {details.isCardio ? <MapPin className="h-3 w-3 mr-1" /> : null}
                                  {details.secondary}
                                </Badge>
                              </div>
                            )}
                            {exercise.notes && (
                              <p className="mt-1.5 pl-7 text-xs text-muted-foreground italic">
                                {exercise.notes}
                              </p>
                            )}
                          </div>
                          {details.isCardio && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                              Kardio
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trainer Notes */}
          {workout.notes && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Poznámky od trenéra
              </h3>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3">
                  <p className="text-sm">{workout.notes}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* RPE info if set */}
          {workout.rpe && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span>Plánovaná náročnost: RPE {workout.rpe}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {onStartWorkout && workout.status !== 'completed' && (
          <div className="pt-4 border-t border-border/50">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => onStartWorkout(workout)}
            >
              <Play className="h-4 w-4 mr-2" />
              Splnit trénink
            </Button>
          </div>
        )}
      </SheetContent>

      {/* Exercise Detail Sheet */}
      <ExerciseDetailSheet
        open={exerciseDetailOpen}
        onOpenChange={setExerciseDetailOpen}
        exercise={selectedExercise}
      />
    </Sheet>
  );
}
