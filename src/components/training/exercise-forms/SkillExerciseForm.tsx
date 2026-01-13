import { useState } from 'react';
import { Target, Timer, Hash, CheckCircle, Star, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ExerciseWithType, CreateSkillEntryInput } from '@/types/exercise-entries';

interface SkillExerciseFormProps {
  exercise: ExerciseWithType;
  clientId: string;
  date: string;
  trainingSessionId?: string;
  onSubmit: (data: CreateSkillEntryInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  defaultValues?: Partial<CreateSkillEntryInput>;
}

export function SkillExerciseForm({
  exercise,
  clientId,
  date,
  trainingSessionId,
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues,
}: SkillExerciseFormProps) {
  const [durationMinutes, setDurationMinutes] = useState(Math.floor((defaultValues?.duration_seconds || 0) / 60) || null);
  const [attempts, setAttempts] = useState<number | null>(defaultValues?.attempts || null);
  const [successful, setSuccessful] = useState<number | null>(defaultValues?.successful || null);
  const [techniqueRating, setTechniqueRating] = useState<'learning' | 'developing' | 'competent' | 'proficient' | 'mastered' | null>(
    defaultValues?.technique_rating || null
  );
  const [rpe, setRpe] = useState(defaultValues?.rpe || 5);
  const [isBreakthrough, setIsBreakthrough] = useState(defaultValues?.is_breakthrough || false);
  const [notes, setNotes] = useState(defaultValues?.notes || '');

  const isValid = (durationMinutes && durationMinutes > 0) || (attempts && attempts > 0);
  const successRate = attempts && successful ? Math.round((successful / attempts) * 100) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    await onSubmit({
      client_id: clientId,
      exercise_id: exercise.id,
      exercise_name: exercise.name_cs || exercise.name,
      date,
      training_session_id: trainingSessionId || null,
      duration_seconds: durationMinutes ? durationMinutes * 60 : null,
      attempts,
      successful,
      technique_rating: techniqueRating,
      rpe,
      is_breakthrough: isBreakthrough,
      notes: notes || null,
    });
  };

  const getTechniqueLabel = (rating: string | null) => {
    switch (rating) {
      case 'learning': return 'Učím se';
      case 'developing': return 'Rozvíjím';
      case 'competent': return 'Zvládám';
      case 'proficient': return 'Ovládám';
      case 'mastered': return 'Mistr';
      default: return 'Vyberte...';
    }
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
            <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
              <Target className="w-3 h-3 mr-1" />
              SKILL
            </Badge>
            {isBreakthrough && (
              <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                <Star className="w-3 h-3 mr-1" />
                PRŮLOM
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main inputs */}
      <div className="space-y-4 p-4 rounded-xl bg-muted/50 border">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Duration */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Timer className="w-4 h-4 text-primary" />
              Doba (min)
            </Label>
            <Input
              type="number"
              value={durationMinutes || ''}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || null)}
              min={1}
              placeholder="10"
              className="text-center text-lg font-medium"
            />
          </div>

          {/* Attempts */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-primary" />
              Pokusy
            </Label>
            <Input
              type="number"
              value={attempts || ''}
              onChange={(e) => setAttempts(parseInt(e.target.value) || null)}
              min={0}
              placeholder="10"
              className="text-center text-lg font-medium"
            />
          </div>

          {/* Successful */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Úspěšné
            </Label>
            <Input
              type="number"
              value={successful || ''}
              onChange={(e) => setSuccessful(parseInt(e.target.value) || null)}
              min={0}
              max={attempts || undefined}
              placeholder="8"
              className="text-center text-lg font-medium"
            />
          </div>
        </div>

        {/* Success rate indicator */}
        {successRate !== null && (
          <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-background">
            <span className="text-sm text-muted-foreground">Úspěšnost:</span>
            <span className={`text-lg font-bold ${successRate >= 80 ? 'text-success' : successRate >= 50 ? 'text-warning' : 'text-destructive'}`}>
              {successRate}%
            </span>
          </div>
        )}
      </div>

      {/* Technique assessment */}
      <div className="space-y-4 p-4 rounded-xl bg-muted/50 border">
        <h4 className="text-sm font-medium text-muted-foreground">Úroveň techniky</h4>
        
        <Select value={techniqueRating || ''} onValueChange={(v) => setTechniqueRating(v as typeof techniqueRating)}>
          <SelectTrigger>
            <SelectValue placeholder="Vyberte úroveň..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="learning">🌱 Učím se - základy</SelectItem>
            <SelectItem value="developing">🌿 Rozvíjím - pokroky</SelectItem>
            <SelectItem value="competent">🌳 Zvládám - stabilní</SelectItem>
            <SelectItem value="proficient">⭐ Ovládám - pokročilý</SelectItem>
            <SelectItem value="mastered">🏆 Mistr - dokonalé</SelectItem>
          </SelectContent>
        </Select>

        {/* RPE */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Mentální náročnost</Label>
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

        {/* Breakthrough toggle */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <Label htmlFor="breakthrough" className="cursor-pointer font-medium">
              Průlomový moment
            </Label>
            <p className="text-xs text-muted-foreground">
              Poprvé se podařilo / nová úroveň
            </p>
          </div>
          <Switch
            id="breakthrough"
            checked={isBreakthrough}
            onCheckedChange={setIsBreakthrough}
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
          placeholder="Co se povedlo, co zlepšit..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Validation hint */}
      {!isValid && (
        <p className="text-sm text-destructive">
          Zadejte dobu trvání nebo počet pokusů.
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
