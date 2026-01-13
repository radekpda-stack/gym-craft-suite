import { useState } from 'react';
import { Dumbbell, Hash, Weight, Clock, FileText, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { ExerciseWithType } from '@/types/exercise-entries';
import { AssistanceBandSelector, isPullUpExercise, type BandType } from '@/components/exercises/AssistanceBandSelector';

interface StrengthExerciseFormProps {
  exercise: ExerciseWithType;
  clientId: string;
  date: string;
  trainingSessionId?: string;
  onSubmit: (data: {
    client_id: string;
    exercise_id: string | null;
    exercise_name: string;
    date: string;
    sets: number;
    reps: number | null;
    weight_kg: number | null;
    is_bodyweight: boolean;
    time_seconds: number | null;
    tempo: string | null;
    notes: string | null;
    assistance_bands?: BandType[] | null;
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  defaultValues?: {
    sets?: number;
    reps?: number | null;
    weight_kg?: number | null;
    is_bodyweight?: boolean;
    time_seconds?: number | null;
    tempo?: string | null;
    notes?: string | null;
    assistance_bands?: BandType[] | null;
  };
}

export function StrengthExerciseForm({
  exercise,
  clientId,
  date,
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues,
}: StrengthExerciseFormProps) {
  const [sets, setSets] = useState(defaultValues?.sets || 3);
  const [reps, setReps] = useState<number | null>(defaultValues?.reps || 10);
  const [weightKg, setWeightKg] = useState<number | null>(defaultValues?.weight_kg || null);
  const [isBodyweight, setIsBodyweight] = useState(defaultValues?.is_bodyweight || exercise.is_bodyweight);
  const [timeSeconds, setTimeSeconds] = useState<number | null>(defaultValues?.time_seconds || null);
  const [tempo, setTempo] = useState(defaultValues?.tempo || null);
  const [notes, setNotes] = useState(defaultValues?.notes || '');
  const [assistanceBands, setAssistanceBands] = useState<BandType[]>(defaultValues?.assistance_bands || []);

  const isTimeBased = exercise.is_time_based;
  const isValid = sets > 0 && (isTimeBased ? (timeSeconds && timeSeconds > 0) : (reps && reps > 0));
  
  // Check if this exercise supports assistance bands
  const exerciseName = exercise.name_cs || exercise.name;
  const showAssistanceBands = isPullUpExercise(exerciseName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    await onSubmit({
      client_id: clientId,
      exercise_id: exercise.id,
      exercise_name: exerciseName,
      date,
      sets,
      reps: isTimeBased ? null : reps,
      weight_kg: isBodyweight ? null : weightKg,
      is_bodyweight: isBodyweight,
      time_seconds: isTimeBased ? timeSeconds : null,
      tempo,
      notes: notes || null,
      assistance_bands: showAssistanceBands && assistanceBands.length > 0 ? assistanceBands : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {exercise.name_cs || exercise.name}
          </h3>
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
              <Dumbbell className="w-3 h-3 mr-1" />
              SÍLA
            </Badge>
            {exercise.is_unilateral && (
              <Badge variant="outline">Jednostranné</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main inputs */}
      <div className="space-y-4 p-4 rounded-xl bg-muted/50 border">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Sets */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-primary" />
              Série
            </Label>
            <Input
              type="number"
              value={sets}
              onChange={(e) => setSets(parseInt(e.target.value) || 1)}
              min={1}
              className="text-center text-lg font-medium"
            />
          </div>

          {/* Reps or Time */}
          {isTimeBased ? (
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                Čas (s)
              </Label>
              <Input
                type="number"
                value={timeSeconds || ''}
                onChange={(e) => setTimeSeconds(parseInt(e.target.value) || null)}
                min={1}
                placeholder="30"
                className="text-center text-lg font-medium"
              />
            </div>
          ) : (
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-primary" />
                Opakování
              </Label>
              <Input
                type="number"
                value={reps || ''}
                onChange={(e) => setReps(parseInt(e.target.value) || null)}
                min={1}
                placeholder="10"
                className="text-center text-lg font-medium"
              />
            </div>
          )}

          {/* Weight */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Weight className="w-4 h-4 text-primary" />
              Váha
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.5"
                value={isBodyweight ? '' : (weightKg || '')}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || null)}
                min={0}
                placeholder={isBodyweight ? 'BW' : '0'}
                disabled={isBodyweight}
                className="text-center text-lg font-medium pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {isBodyweight ? 'BW' : 'kg'}
              </span>
            </div>
          </div>
        </div>

        {/* Bodyweight toggle */}
        <div className="flex items-center justify-between pt-2">
          <Label htmlFor="bodyweight" className="cursor-pointer">
            Cvik s vlastní vahou
          </Label>
          <Switch
            id="bodyweight"
            checked={isBodyweight}
            onCheckedChange={setIsBodyweight}
          />
        </div>
      </div>

      {/* Assistance Bands - only for pull-ups, chin-ups, dips */}
      {showAssistanceBands && (
        <div className="p-4 rounded-xl bg-muted/50 border">
          <AssistanceBandSelector
            value={assistanceBands}
            onChange={setAssistanceBands}
          />
        </div>
      )}

      {/* Advanced - Tempo */}
      <div className="p-4 rounded-xl bg-muted/50 border">
        <Label className="mb-2 block">Tempo (volitelné)</Label>
        <Input
          placeholder="např. 3-1-2-0"
          value={tempo || ''}
          onChange={(e) => setTempo(e.target.value || null)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Excentrická-Pauza-Koncentrická-Pauza nahoře
        </p>
      </div>

      {/* Notes */}
      <div className="p-4 rounded-xl bg-muted/50 border">
        <Label className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4" />
          Poznámka
        </Label>
        <Textarea
          placeholder="Technické poznámky, pocity..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Validation hint */}
      {!isValid && (
        <p className="text-sm text-destructive">
          {isTimeBased 
            ? 'Zadejte počet sérií a čas.' 
            : 'Zadejte počet sérií a opakování.'}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Zrušit
          </Button>
        )}
        <Button type="submit" disabled={!isValid || isLoading} className="flex-1">
          {isLoading ? 'Ukládám...' : 'Uložit záznam'}
        </Button>
      </div>
    </form>
  );
}
