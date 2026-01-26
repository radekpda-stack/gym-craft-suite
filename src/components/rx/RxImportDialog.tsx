import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRxWorkoutParser } from '@/hooks/useRxWorkoutParser';
import { useCreateRxWorkout } from '@/hooks/useRxWorkouts';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Dumbbell,
} from 'lucide-react';

interface RxImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXAMPLE_TEXT = `@name: Fran
@type: for_time
@timecap: 10:00

21x Thruster | 43kg
21x Pull-up
15x Thruster | 43kg
15x Pull-up
9x Thruster | 43kg
9x Pull-up`;

export function RxImportDialog({ open, onOpenChange }: RxImportDialogProps) {
  const [text, setText] = useState('');
  const { parsed, isLoading: isParsing } = useRxWorkoutParser(text);
  const createRxWorkout = useCreateRxWorkout();

  const handleImport = async () => {
    if (!parsed?.valid) return;
    
    try {
      await createRxWorkout.mutateAsync(parsed);
      setText('');
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleLoadExample = () => {
    setText(EXAMPLE_TEXT);
  };

  const scoringModeLabels: Record<string, string> = {
    'for_time': 'For Time',
    'amrap': 'AMRAP',
    'max_load': 'Max Load',
    'rounds_reps': 'Rounds + Reps',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import RX Workoutu
          </DialogTitle>
          <DialogDescription>
            Vložte text ve formátu JM_WORKOUT_V1 pro vytvoření RX benchmarku
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Workout text</label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLoadExample}
              >
                Načíst příklad
              </Button>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`@name: Název workoutu
@type: for_time | amrap | max_load
@timecap: MM:SS

21x Cvik | váha
400m Row
1:00 Plank`}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Parse results */}
          {isParsing && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Parsování...</span>
            </div>
          )}

          {parsed && !isParsing && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              {/* Header info */}
              {parsed.valid ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">
                    Parsováno: {parsed.template.name}
                  </span>
                  <Badge variant="secondary">
                    {scoringModeLabels[parsed.template.scoring_mode] || parsed.template.scoring_mode}
                  </Badge>
                  {parsed.template.time_cap_seconds && (
                    <Badge variant="outline">
                      {Math.floor(parsed.template.time_cap_seconds / 60)} min cap
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Chyby v parsování</span>
                </div>
              )}

              {/* Errors */}
              {parsed.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {parsed.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Exercises preview */}
              {parsed.exercises.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Dumbbell className="h-4 w-4" />
                    <span>{parsed.exercises.length} cviků nalezeno</span>
                  </div>
                  <div className="space-y-1">
                    {parsed.exercises.map((ex, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-background"
                      >
                        <span className="text-muted-foreground w-6">{idx + 1}.</span>
                        <span className={ex.exercise_id ? '' : 'text-warning'}>
                          {ex.exercise_name}
                        </span>
                        {ex.reps_min && <Badge variant="outline">{ex.reps_min}x</Badge>}
                        {ex.rx_distance_m && <Badge variant="outline">{ex.rx_distance_m}m</Badge>}
                        {ex.rx_weight_kg && <Badge variant="outline">{ex.rx_weight_kg}kg</Badge>}
                        {!ex.exercise_id && (
                          <Badge variant="secondary" className="text-xs">
                            Nenamapováno
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmapped exercises warning */}
              {parsed.unmapped_exercises.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {parsed.unmapped_exercises.length} cviků nebylo namapováno na databázi: {' '}
                    {parsed.unmapped_exercises.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!parsed?.valid || createRxWorkout.isPending}
          >
            {createRxWorkout.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Importovat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
