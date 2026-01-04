import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Dumbbell,
  ChevronRight,
  ClipboardList,
  Sparkles
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { usePlannedWorkouts, useUpcomingCoachedSessions, UnifiedDiaryEntry } from '@/hooks/useUnifiedDiary';
import { getWorkoutTypeLabel, getWorkoutTypeIcon, getWorkoutTypeColor } from './WorkoutTypeSelector';
import { motion } from 'framer-motion';
import { PlannedWorkoutDetailSheet } from './PlannedWorkoutDetailSheet';

interface DiaryPlanViewProps {
  onStartWorkout: (entry: UnifiedDiaryEntry) => void;
}

export function DiaryPlanView({ onStartWorkout }: DiaryPlanViewProps) {
  const [selectedWorkout, setSelectedWorkout] = useState<UnifiedDiaryEntry | null>(null);
  const { data: plannedWorkouts, isLoading: loadingPlanned } = usePlannedWorkouts();
  const { data: upcomingSessions, isLoading: loadingSessions } = useUpcomingCoachedSessions();

  const isLoading = loadingPlanned || loadingSessions;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const hasPlannedWorkouts = plannedWorkouts && plannedWorkouts.length > 0;
  const hasUpcomingSessions = upcomingSessions && upcomingSessions.length > 0;
  const hasAnyPlans = hasPlannedWorkouts || hasUpcomingSessions;

  return (
    <div className="space-y-6">
      {/* Planned workouts from trainer */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          Naplánované tréninky
        </h3>

        {!hasPlannedWorkouts ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-sm">
                Zatím nemáte žádné naplánované tréninky od trenéra
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plannedWorkouts.map((workout, index) => {
              const Icon = getWorkoutTypeIcon(workout.workout_type);
              const isOverdue = workout.scheduled_for && isBefore(parseISO(workout.scheduled_for), startOfDay(new Date()));
              const isToday = workout.scheduled_for && 
                format(parseISO(workout.scheduled_for), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

              return (
                <motion.div
                  key={workout.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={cn(
                      "overflow-hidden transition-all hover:shadow-md cursor-pointer",
                      isToday && "ring-2 ring-primary",
                      isOverdue && "border-destructive/50"
                    )}
                    onClick={() => setSelectedWorkout(workout)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0",
                            getWorkoutTypeColor(workout.workout_type)
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                {getWorkoutTypeLabel(workout.workout_type)}
                              </span>
                              {isToday && (
                                <Badge variant="default" className="text-xs">
                                  Dnes
                                </Badge>
                              )}
                              {isOverdue && (
                                <Badge variant="destructive" className="text-xs">
                                  Zpožděno
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              {workout.scheduled_for && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {format(parseISO(workout.scheduled_for), 'EEEE d. MMMM', { locale: cs })}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartWorkout(workout);
                          }}
                          className="shrink-0"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Splnit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming coached sessions */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary" />
          Nadcházející tréninky s trenérem
        </h3>

        {!hasUpcomingSessions ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-sm">
                Žádné naplánované tréninky s trenérem
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {format(parseISO(session.date), 'EEEE d. MMMM', { locale: cs })}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{format(parseISO(session.date), 'HH:mm')}</span>
                          <span>•</span>
                          <span>{session.duration} min</span>
                          {session.training_type && (
                            <>
                              <span>•</span>
                              <span>{session.training_type}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      S trenérem
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Empty state for everything */}
      {!hasAnyPlans && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="font-medium text-lg mb-2">Žádné plány</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Zatím nemáte žádné naplánované tréninky. Váš trenér vám může přiřadit tréninkový plán, 
              nebo si můžete zapsat vlastní trénink.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Workout detail sheet */}
      <PlannedWorkoutDetailSheet
        open={!!selectedWorkout}
        onOpenChange={(open) => !open && setSelectedWorkout(null)}
        workout={selectedWorkout}
        onStartWorkout={(workout) => {
          setSelectedWorkout(null);
          onStartWorkout(workout);
        }}
      />
    </div>
  );
}
