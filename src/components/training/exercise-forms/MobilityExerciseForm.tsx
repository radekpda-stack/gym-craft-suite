import { useState } from 'react';
import { Activity, Timer, Hash, MoveHorizontal, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ExerciseWithType, CreateMobilityEntryInput } from '@/types/exercise-entries';

interface MobilityExerciseFormProps {
  exercise: ExerciseWithType;
  clientId: string;
  date: string;
  trainingSessionId?: string;
  onSubmit: (data: CreateMobilityEntryInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  defaultValues?: Partial<CreateMobilityEntryInput>;
}

export function MobilityExerciseForm({
  exercise,
  clientId,
  date,
  trainingSessionId,
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues,
}: MobilityExerciseFormProps) {
  const [sets, setSets] = useState(defaultValues?.sets || 1);
  const [holdSeconds, setHoldSeconds] = useState<number | null>(defaultValues?.hold_seconds || 30);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(defaultValues?.duration_seconds || null);
  const [side, setSide] = useState<'left' | 'right' | 'both' | 'none'>(defaultValues?.side || (exercise.is_unilateral ? 'both' : 'none'));
  const [qualityRating, setQualityRating] = useState<'poor' | 'fair' | 'good' | 'excellent' | null>(defaultValues?.quality_rating || null);
  const [rangeOfMotion, setRangeOfMotion] = useState<'limited' | 'normal' | 'full' | null>(defaultValues?.range_of_motion || null);
  const [rpe, setRpe] = useState(defaultValues?.rpe || 5);
  const [notes, setNotes] = useState(defaultValues?.notes || '');

  const isValid = (holdSeconds && holdSeconds > 0) || (durationSeconds && durationSeconds > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    await onSubmit({
      client_id: clientId,
      exercise_id: exercise.id,
      exercise_name: exercise.name_cs || exercise.name,
      date,
      training_session_id: trainingSessionId || null,
      sets,
      hold_seconds: holdSeconds,
      duration_seconds: durationSeconds,
      side,
      quality_rating: qualityRating,
      range_of_motion: rangeOfMotion,
      rpe,
      notes: notes || null,
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
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Activity className="w-3 h-3 mr-1" />
              MOBILITA
            </Badge>
            {exercise.is_unilateral && (
              <Badge variant="outline">Jednostranné</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main inputs */}
      <div className="space-y-4 p-4 rounded-xl bg-muted/50 border">
        <div className="grid grid-cols-2 gap-4">
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

          {/* Hold time */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Timer className="w-4 h-4 text-primary" />
              Výdrž (s)
            </Label>
            <Input
              type="number"
              value={holdSeconds || ''}
              onChange={(e) => setHoldSeconds(parseInt(e.target.value) || null)}
              min={1}
              placeholder="30"
              className="text-center text-lg font-medium"
            />
          </div>

          {/* Side selection */}
          {exercise.is_unilateral && (
            <div className="col-span-2">
              <Label className="flex items-center gap-2 mb-2">
                <MoveHorizontal className="w-4 h-4 text-primary" />
                Strana
              </Label>
              <Select value={side} onValueChange={(v) => setSide(v as typeof side)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Obě strany</SelectItem>
                  <SelectItem value="left">Levá</SelectItem>
                  <SelectItem value="right">Pravá</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Quality assessment */}
      <div className="space-y-4 p-4 rounded-xl bg-muted/50 border">
        <h4 className="text-sm font-medium text-muted-foreground">Kvalita provedení</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block">Celkově</Label>
            <Select value={qualityRating || ''} onValueChange={(v) => setQualityRating(v as typeof qualityRating)}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="poor">Slabé</SelectItem>
                <SelectItem value="fair">Průměrné</SelectItem>
                <SelectItem value="good">Dobré</SelectItem>
                <SelectItem value="excellent">Výborné</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Rozsah pohybu</Label>
            <Select value={rangeOfMotion || ''} onValueChange={(v) => setRangeOfMotion(v as typeof rangeOfMotion)}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="limited">Omezený</SelectItem>
                <SelectItem value="normal">Normální</SelectItem>
                <SelectItem value="full">Plný</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* RPE */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Vnímaná náročnost</Label>
            <span className="text-lg font-bold text-primary">{rpe}/10</span>
          </div>
          <Slider
            value={[rpe]}
            onValueChange={([value]) => setRpe(value)}
            min={1}
            max={10}
            step={1}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="p-4 rounded-xl bg-muted/50 border">
        <Label className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4" />
          Poznámka
        </Label>
        <Textarea
          placeholder="Omezení, pocity, pokrok..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Validation hint */}
      {!isValid && (
        <p className="text-sm text-destructive">
          Zadejte čas výdrže nebo celkovou dobu.
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
