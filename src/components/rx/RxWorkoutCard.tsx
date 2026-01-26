import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { RxWorkout, useDeleteRxWorkout } from '@/hooks/useRxWorkouts';
import { CreateChallengeDialog } from './CreateChallengeDialog';
import { 
  Timer, 
  Repeat, 
  Weight, 
  MoreVertical, 
  Trash2, 
  Trophy,
  Dumbbell,
} from 'lucide-react';

interface RxWorkoutCardProps {
  workout: RxWorkout;
}

const scoringModeConfig: Record<string, { label: string; icon: typeof Timer; color: string }> = {
  'for_time': { label: 'For Time', icon: Timer, color: 'bg-blue-500/10 text-blue-600' },
  'amrap': { label: 'AMRAP', icon: Repeat, color: 'bg-green-500/10 text-green-600' },
  'max_load': { label: 'Max Load', icon: Weight, color: 'bg-orange-500/10 text-orange-600' },
  'rounds_reps': { label: 'Rounds', icon: Repeat, color: 'bg-purple-500/10 text-purple-600' },
};

export function RxWorkoutCard({ workout }: RxWorkoutCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
  const deleteRxWorkout = useDeleteRxWorkout();

  const config = scoringModeConfig[workout.scoring_mode || 'for_time'] || scoringModeConfig['for_time'];
  const Icon = config.icon;

  const handleDelete = async () => {
    try {
      await deleteRxWorkout.mutateAsync(workout.id);
      setShowDeleteDialog(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{workout.name}</CardTitle>
              {workout.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {workout.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowChallengeDialog(true)}>
                  <Trophy className="h-4 w-4 mr-2" />
                  Vytvořit výzvu
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Smazat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Scoring mode badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={config.color}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            {workout.time_cap_seconds && (
              <Badge variant="outline">
                {Math.floor(workout.time_cap_seconds / 60)} min cap
              </Badge>
            )}
            {workout.rounds && (
              <Badge variant="outline">
                {workout.rounds} kol
              </Badge>
            )}
          </div>

          {/* Exercises preview */}
          {workout.exercises && workout.exercises.length > 0 && (
            <div className="space-y-1 pt-2 border-t">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Dumbbell className="h-3 w-3" />
                <span>{workout.exercises.length} cviků</span>
              </div>
              <div className="space-y-1">
                {workout.exercises
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .slice(0, 4)
                  .map((ex) => (
                    <div key={ex.id} className="text-sm flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {ex.reps_min && `${ex.reps_min}x`}
                        {ex.rx_distance_m && `${ex.rx_distance_m}m`}
                        {ex.time_seconds && `${Math.floor(ex.time_seconds / 60)}:${(ex.time_seconds % 60).toString().padStart(2, '0')}`}
                      </span>
                      <span>{ex.exercise_name}</span>
                      {ex.rx_weight_kg && (
                        <span className="text-muted-foreground">({ex.rx_weight_kg}kg)</span>
                      )}
                    </div>
                  ))}
                {workout.exercises.length > 4 && (
                  <div className="text-xs text-muted-foreground">
                    +{workout.exercises.length - 4} dalších
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create challenge button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2"
            onClick={() => setShowChallengeDialog(true)}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Vytvořit výzvu
          </Button>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat RX Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat workout "{workout.name}"? Tuto akci nelze vrátit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create challenge dialog */}
      <CreateChallengeDialog
        open={showChallengeDialog}
        onOpenChange={setShowChallengeDialog}
        workout={workout}
      />
    </>
  );
}
