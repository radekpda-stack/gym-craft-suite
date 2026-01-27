import { useState, useMemo } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { useRxWorkoutParserV2, ParsedExerciseV2, ParsedRxWorkoutV2 } from '@/hooks/useRxWorkoutParserV2';
import { useCreateRxWorkoutV2 } from '@/hooks/useRxWorkoutsV2';
import { RxExerciseMappingStep, ExerciseMapping } from './RxExerciseMappingStep';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Dumbbell,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';

interface RxImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'input' | 'mapping' | 'confirm';

const EXAMPLE_TEXT = `WORKOUT: Engine + Strength Circuit
TYPE: FOR_TIME
ROUNDS: 3

EXERCISE: TREADMILL
DISTANCE: 500 m
INCLINE: 15 %
SPEED: INDIVIDUAL

EXERCISE: DUMBBELL_THRUSTER
LOAD: 2x8 kg
REPS: 20

EXERCISE: ROW_ERG
DISTANCE: 400 m
DAMPER: 7

EXERCISE: DUMBBELL_LUNGES
LOAD: 2x12 kg
REPS: 12

EXERCISE: SKILLUP_SKIERG
DISTANCE: 500 m
RESISTANCE: 7

ROUND_COMPLETE: AFTER_SKIERG

SCORE: TIME`;

export function RxImportDialog({ open, onOpenChange }: RxImportDialogProps) {
  const [text, setText] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [mappings, setMappings] = useState<ExerciseMapping[]>([]);
  
  const { parsed, isLoading: isParsing, exercisesList } = useRxWorkoutParserV2(text);
  const createRxWorkout = useCreateRxWorkoutV2();

  const unmappedExercises = useMemo(() => {
    if (!parsed) return [];
    return parsed.exercises.filter(ex => !ex.is_mapped);
  }, [parsed]);

  const handleNext = () => {
    if (step === 'input') {
      if (unmappedExercises.length > 0) {
        setStep('mapping');
      } else {
        setStep('confirm');
      }
    } else if (step === 'mapping') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'mapping') {
      setStep('input');
    } else if (step === 'confirm') {
      if (unmappedExercises.length > 0) {
        setStep('mapping');
      } else {
        setStep('input');
      }
    }
  };

  const handleImport = async () => {
    if (!parsed?.valid) return;
    
    try {
      await createRxWorkout.mutateAsync({ parsed, mappings });
      // Reset state
      setText('');
      setStep('input');
      setMappings([]);
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleLoadExample = () => {
    setText(EXAMPLE_TEXT);
  };

  const handleClose = () => {
    setText('');
    setStep('input');
    setMappings([]);
    onOpenChange(false);
  };

  const scoringModeLabels: Record<string, string> = {
    'for_time': 'For Time',
    'amrap': 'AMRAP',
    'max_load': 'Max Load',
    'rounds_reps': 'Rounds + Reps',
  };

  const stepProgress = step === 'input' ? 33 : step === 'mapping' ? 66 : 100;

  const canProceed = () => {
    if (step === 'input') {
      return parsed?.valid === true;
    }
    if (step === 'mapping') {
      // All mappings must have action set
      return mappings.every(m => 
        (m.action === 'map' && m.selected_id) || 
        (m.action === 'create' && m.new_name)
      );
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import RX Workoutu
          </DialogTitle>
          <DialogDescription>
            {step === 'input' && 'Vložte text ve formátu WORKOUT/EXERCISE'}
            {step === 'mapping' && 'Namapujte nerozpoznané cviky'}
            {step === 'confirm' && 'Potvrďte import workoutu'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className={step === 'input' ? 'text-primary font-medium' : ''}>
              1. Text
            </span>
            <span className={step === 'mapping' ? 'text-primary font-medium' : ''}>
              2. Mapování
            </span>
            <span className={step === 'confirm' ? 'text-primary font-medium' : ''}>
              3. Import
            </span>
          </div>
          <Progress value={stepProgress} className="h-2" />
        </div>

        <div className="min-h-[300px]">
          {/* Step 1: Input */}
          {step === 'input' && (
            <div className="space-y-4">
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
                  placeholder={`WORKOUT: Název workoutu
TYPE: FOR_TIME | AMRAP | MAX_LOAD

EXERCISE: NAZEV_CVIKU
DISTANCE: 500 m
REPS: 20
LOAD: 2x8 kg`}
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
                  {parsed.valid ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">
                        Parsováno: {parsed.template.name}
                      </span>
                      <Badge variant="secondary">
                        {scoringModeLabels[parsed.template.scoring_mode] || parsed.template.scoring_mode}
                      </Badge>
                      {parsed.template.rounds && (
                        <Badge variant="outline">
                          {parsed.template.rounds} kol
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

                  {/* Warnings */}
                  {parsed.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {parsed.warnings.map((warn, idx) => (
                            <li key={idx}>{warn}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Exercises summary */}
                  {parsed.exercises.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Dumbbell className="h-4 w-4" />
                      <span>
                        {parsed.exercises.length} cviků
                        {parsed.exercises.filter(e => e.is_mapped).length > 0 && (
                          <span className="text-green-600 ml-1">
                            ({parsed.exercises.filter(e => e.is_mapped).length} namapováno)
                          </span>
                        )}
                        {unmappedExercises.length > 0 && (
                          <span className="text-yellow-600 ml-1">
                            ({unmappedExercises.length} k namapování)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && parsed && (
            <RxExerciseMappingStep
              unmappedExercises={unmappedExercises}
              exercisesList={exercisesList}
              mappings={mappings}
              onMappingsChange={setMappings}
            />
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && parsed && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{parsed.template.name}</h3>
                  <Badge>
                    {scoringModeLabels[parsed.template.scoring_mode]}
                  </Badge>
                </div>

                {parsed.template.rounds && (
                  <p className="text-sm text-muted-foreground">
                    {parsed.template.rounds} kol
                  </p>
                )}

                <div className="space-y-1 pt-2 border-t">
                  {parsed.exercises.map((ex, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-6">{idx + 1}.</span>
                      <span className={ex.is_mapped ? '' : 'text-yellow-600'}>
                        {ex.exercise_name}
                      </span>
                      {ex.reps_min && <Badge variant="outline">{ex.reps_min}x</Badge>}
                      {ex.rx_distance_m && <Badge variant="outline">{ex.rx_distance_m}m</Badge>}
                      {ex.rx_weight_kg && <Badge variant="outline">{ex.rx_weight_kg}kg</Badge>}
                      {ex.incline_percent && <Badge variant="outline">{ex.incline_percent}% incline</Badge>}
                      {ex.damper_resistance && <Badge variant="outline">damper {ex.damper_resistance}</Badge>}
                    </div>
                  ))}
                </div>

                {mappings.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Nové cviky k vytvoření:
                    </p>
                    {mappings.filter(m => m.action === 'create').map((m, idx) => (
                      <Badge key={idx} variant="secondary" className="mr-1 mb-1">
                        + {m.new_name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step !== 'input' && (
            <Button variant="outline" onClick={handleBack} className="sm:mr-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zpět
            </Button>
          )}
          
          <Button variant="outline" onClick={handleClose}>
            Zrušit
          </Button>
          
          {step !== 'confirm' ? (
            <Button 
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Pokračovat
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleImport}
              disabled={createRxWorkout.isPending}
            >
              {createRxWorkout.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Importovat
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
