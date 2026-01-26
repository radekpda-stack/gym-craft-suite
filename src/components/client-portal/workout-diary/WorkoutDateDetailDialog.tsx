import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Dumbbell, User, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnifiedDiaryEntry, DiaryExercise } from '@/hooks/useUnifiedDiary';
import { getWorkoutTypeLabel, getWorkoutTypeIcon, getWorkoutTypeColor } from './WorkoutTypeSelector';
import { useAllExerciseDetails, ExerciseLookupData } from '@/hooks/useExerciseDetailsLookup';
import { ExerciseDetailSheet, ExerciseDetailData } from './ExerciseDetailSheet';

interface WorkoutDateDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: UnifiedDiaryEntry[];
}

export function WorkoutDateDetailDialog({
  open,
  onOpenChange,
  entries,
}: WorkoutDateDetailDialogProps) {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDetailData | null>(null);
  const [exerciseDetailOpen, setExerciseDetailOpen] = useState(false);
  
  // Fetch exercise details for lookups
  const { data: exerciseLookup } = useAllExerciseDetails();

  if (entries.length === 0) return null;

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

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {format(parseISO(entries[0].date), 'EEEE d. MMMM yyyy', { locale: cs })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {entries.map(entry => {
            const WorkoutIcon = getWorkoutTypeIcon(entry.workout_type);
            return (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      entry.is_coached ? "bg-primary/10 text-primary" : "bg-success/10",
                      !entry.is_coached && getWorkoutTypeColor(entry.workout_type)
                    )}>
                      {entry.is_coached ? <User className="w-5 h-5" /> : <WorkoutIcon className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {getWorkoutTypeLabel(entry.workout_type)}
                        <Badge variant={entry.is_coached ? "default" : "secondary"} className="text-xs">
                          {entry.is_coached ? 'S trenérem' : 'Samostatně'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.duration_minutes && `${entry.duration_minutes} min`}
                        {entry.rpe && ` • RPE ${entry.rpe}`}
                      </div>
                    </div>
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground">{entry.notes}</p>
                  )}
                  {entry.exercises && entry.exercises.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {entry.exercises.map((ex, idx) => {
                        const hasInfo = hasExerciseInfo(ex.exercise_name);
                        return (
                          <div 
                            key={idx} 
                            className="text-sm flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors"
                            onClick={() => handleExerciseClick(ex)}
                          >
                            <Dumbbell className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{ex.exercise_name}</span>
                            {hasInfo && (
                              <Info className="w-3 h-3 text-primary shrink-0" />
                            )}
                            {ex.sets && ex.reps && (
                              <span className="text-muted-foreground shrink-0">
                                {ex.sets}×{ex.reps}
                              </span>
                            )}
                            {ex.weight_kg && (
                              <span className="font-medium shrink-0">{ex.weight_kg}kg</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>

    {/* Exercise Detail Sheet */}
    <ExerciseDetailSheet
      open={exerciseDetailOpen}
      onOpenChange={setExerciseDetailOpen}
      exercise={selectedExercise}
    />
    </>
  );
}
