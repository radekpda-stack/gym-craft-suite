import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RxWorkout, RxScoringMode } from '@/hooks/useRxWorkouts';
import { RxWorkoutLeaderboard } from './RxWorkoutLeaderboard';
import { RxResultEntryDialog } from './RxResultEntryDialog';
import { RxWorkoutEditDialog } from './RxWorkoutEditDialog';
import { useRxWorkoutLeaderboard, formatRxScore } from '@/hooks/useRxWorkoutResults';
import { 
  Timer, 
  Repeat, 
  Weight, 
  Dumbbell,
  Plus,
  Pencil,
  Download,
  Trophy,
  Clock,
  Target,
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface RxWorkoutDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: RxWorkout;
}

const scoringModeConfig: Record<string, { label: string; icon: typeof Timer }> = {
  'for_time': { label: 'For Time', icon: Timer },
  'amrap': { label: 'AMRAP', icon: Repeat },
  'max_load': { label: 'Max Load', icon: Weight },
  'rounds_reps': { label: 'Rounds', icon: Repeat },
};

export function RxWorkoutDetailSheet({ open, onOpenChange, workout }: RxWorkoutDetailSheetProps) {
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const scoringMode = (workout.scoring_mode || 'for_time') as RxScoringMode;
  const config = scoringModeConfig[scoringMode] || scoringModeConfig['for_time'];
  const Icon = config.icon;

  const { leaderboard } = useRxWorkoutLeaderboard(workout.id, scoringMode);

  const formatExercise = (ex: any) => {
    const parts: string[] = [];
    
    if (ex.reps_min) parts.push(`${ex.reps_min}x`);
    if (ex.rx_distance_m) parts.push(`${ex.rx_distance_m}m`);
    if (ex.time_seconds) {
      const mins = Math.floor(ex.time_seconds / 60);
      const secs = ex.time_seconds % 60;
      parts.push(`${mins}:${secs.toString().padStart(2, '0')}`);
    }
    
    parts.push(ex.exercise_name);
    
    return parts.join(' ');
  };

  const getExerciseModifiers = (ex: any) => {
    const mods: string[] = [];
    if (ex.rx_weight_kg) mods.push(`Váha: ${ex.load_format || `${ex.rx_weight_kg}kg`}`);
    if (ex.incline_percent) mods.push(`Sklon: ${ex.incline_percent}%`);
    if (ex.damper_resistance) mods.push(`Damper: ${ex.damper_resistance}`);
    if (ex.speed_setting) mods.push(`Rychlost: ${ex.speed_setting}`);
    return mods;
  };

  const handleExportCSV = () => {
    if (leaderboard.length === 0) return;

    const headers = ['Pořadí', 'Jméno', 'Pohlaví', 'Výsledek', 'Datum', 'PR'];
    const rows = leaderboard.map((result, idx) => [
      idx + 1,
      result.client?.name || 'Neznámý',
      result.client?.gender === 'male' ? 'M' : result.client?.gender === 'female' ? 'Ž' : '',
      formatRxScore(result.score_primary, scoringMode, result.score_secondary),
      format(new Date(result.performed_at), 'd.M.yyyy'),
      result.is_personal_record ? 'Ano' : 'Ne',
    ]);

    const csvContent = [
      `Workout: ${workout.name}`,
      `Exportováno: ${format(new Date(), 'd.M.yyyy HH:mm', { locale: cs })}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${workout.name.replace(/\s+/g, '_')}_leaderboard.csv`;
    link.click();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl">{workout.name}</SheetTitle>
                <SheetDescription>
                  {workout.description || 'RX Benchmark workout'}
                </SheetDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Workout info */}
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/10 text-primary">
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              {workout.time_cap_seconds && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {Math.floor(workout.time_cap_seconds / 60)} min cap
                </Badge>
              )}
              {workout.rounds && (
                <Badge variant="outline">
                  <Target className="h-3 w-3 mr-1" />
                  {workout.rounds} kol
                </Badge>
              )}
            </div>

            <Separator />

            {/* Exercises */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                Cviky
              </h3>
              
              {workout.exercises && workout.exercises.length > 0 ? (
                <div className="space-y-3">
                  {workout.exercises
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((ex, idx) => {
                      const modifiers = getExerciseModifiers(ex);
                      return (
                        <div 
                          key={ex.id} 
                          className="bg-muted/50 rounded-lg p-3 space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm">
                              {idx + 1}.
                            </span>
                            <span className="font-medium">
                              {formatExercise(ex)}
                            </span>
                          </div>
                          {modifiers.length > 0 && (
                            <ul className="ml-6 space-y-0.5">
                              {modifiers.map((mod, modIdx) => (
                                <li 
                                  key={modIdx} 
                                  className="text-sm text-muted-foreground flex items-center gap-1"
                                >
                                  <span className="text-primary">•</span>
                                  {mod}
                                </li>
                              ))}
                            </ul>
                          )}
                          {ex.notes && (
                            <p className="text-xs text-muted-foreground ml-6 italic">
                              {ex.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Žádné cviky</p>
              )}
            </div>

            <Separator />

            {/* Leaderboard */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Výsledky ({leaderboard.length})
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={leaderboard.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
              
              <RxWorkoutLeaderboard
                workoutId={workout.id}
                scoringMode={scoringMode}
                compact={false}
                maxItems={50}
              />
            </div>

            {/* Action button */}
            <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t">
              <Button 
                className="w-full" 
                onClick={() => setShowResultDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Zapsat výsledek
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Result entry dialog */}
      <RxResultEntryDialog
        open={showResultDialog}
        onOpenChange={setShowResultDialog}
        workout={workout}
      />

      {/* Edit dialog */}
      <RxWorkoutEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        workout={workout}
      />
    </>
  );
}
