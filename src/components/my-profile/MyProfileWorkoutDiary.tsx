import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Dumbbell, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface MyProfileWorkoutDiaryProps {
  clientId: string;
}

export function MyProfileWorkoutDiary({ clientId }: MyProfileWorkoutDiaryProps) {
  const { data: workouts, isLoading } = useQuery({
    queryKey: ['my-workout-diary', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_workout_logs')
        .select(`
          *,
          exercises:client_workout_exercises(*)
        `)
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (!workouts?.length) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Zatím nejsou žádné záznamy v deníku.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {workouts.map((workout) => (
        <Card key={workout.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">
                  {format(new Date(workout.date), 'EEEE d. MMMM yyyy', { locale: cs })}
                </CardTitle>
                {workout.workout_type && (
                  <Badge variant="secondary" className="mt-1">
                    {workout.workout_type}
                  </Badge>
                )}
              </div>
              {workout.duration_minutes && (
                <span className="text-sm text-muted-foreground">
                  {workout.duration_minutes} min
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Exercises */}
            {workout.exercises && workout.exercises.length > 0 && (
              <div className="space-y-2">
                {workout.exercises.map((ex: any) => (
                  <div 
                    key={ex.id} 
                    className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-muted-foreground" />
                      <span>{ex.exercise_name}</span>
                      {ex.is_personal_record && (
                        <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">PR</Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {ex.sets && `${ex.sets}×`}
                      {ex.reps && `${ex.reps}`}
                      {ex.weight_kg && ` @ ${ex.weight_kg}kg`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {workout.notes && (
              <p className="text-sm text-muted-foreground italic">{workout.notes}</p>
            )}

            {/* Trainer Comment */}
            {workout.trainer_comment && (
              <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-3">
                <MessageSquare className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-primary mb-1">Komentář trenéra</p>
                  <p className="text-sm">{workout.trainer_comment}</p>
                </div>
              </div>
            )}

            {/* Energy Levels */}
            {(workout.energy_before || workout.energy_after) && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                {workout.energy_before && (
                  <span>Energie před: {workout.energy_before}/10</span>
                )}
                {workout.energy_after && (
                  <span>Energie po: {workout.energy_after}/10</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
