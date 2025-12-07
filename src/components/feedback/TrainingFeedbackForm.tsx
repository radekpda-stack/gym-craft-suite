import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { MessageSquare, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateFeedback, CreateFeedbackInput } from '@/hooks/useTrainingFeedback';
import { cn } from '@/lib/utils';

interface TrainingFeedbackFormProps {
  trainingSessionId: string;
  clientId: string;
  trainingDate: string;
  trainingType?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const MUSCLE_GROUPS = [
  { id: 'calves', label: 'Lýtka' },
  { id: 'quads', label: 'Přední stehna' },
  { id: 'hamstrings', label: 'Hamstringy' },
  { id: 'glutes', label: 'Hýždě' },
  { id: 'back', label: 'Záda' },
  { id: 'shoulders', label: 'Ramena' },
  { id: 'arms', label: 'Paže' },
  { id: 'abs', label: 'Břicho' },
  { id: 'chest', label: 'Hrudník' },
];

const ENERGY_OPTIONS = [
  { value: 'stable', label: 'Stabilní' },
  { value: 'better_end', label: 'Lepší ke konci' },
  { value: 'low_entire', label: 'Nízká celou dobu' },
  { value: 'good_start_only', label: 'Jen začátek dobrý' },
] as const;

const GOAL_RELEVANCE_OPTIONS = [
  { value: 'yes', label: 'Ano' },
  { value: 'partially', label: 'Částečně' },
  { value: 'no', label: 'Ne' },
] as const;

export function TrainingFeedbackForm({
  trainingSessionId,
  clientId,
  trainingDate,
  trainingType,
  open,
  onOpenChange,
  onSuccess,
}: TrainingFeedbackFormProps) {
  const createFeedback = useCreateFeedback();

  // Form state
  const [rpeRating, setRpeRating] = useState(5);
  const [fatigueLevel, setFatigueLevel] = useState(3);
  const [muscleSoreness, setMuscleSoreness] = useState<string[]>([]);
  const [muscleSorenessComment, setMuscleSorenessComment] = useState('');
  const [energyLevel, setEnergyLevel] = useState<CreateFeedbackInput['energy_level']>('stable');
  const [sleepHours, setSleepHours] = useState<string>('');
  const [sleepQuality, setSleepQuality] = useState(3);
  const [moodRating, setMoodRating] = useState(3);
  const [techniqueRating, setTechniqueRating] = useState(3);
  const [goalRelevance, setGoalRelevance] = useState<CreateFeedbackInput['goal_relevance']>('yes');
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    const input: CreateFeedbackInput = {
      training_session_id: trainingSessionId,
      client_id: clientId,
      training_date: trainingDate,
      training_type: trainingType,
      rpe_rating: rpeRating,
      fatigue_level: fatigueLevel,
      muscle_soreness: muscleSoreness,
      muscle_soreness_comment: muscleSorenessComment || null,
      energy_level: energyLevel,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
      sleep_quality: sleepHours ? sleepQuality : null,
      mood_rating: moodRating,
      technique_rating: techniqueRating,
      goal_relevance: goalRelevance,
      comment: comment || null,
    };

    await createFeedback.mutateAsync(input);
    onOpenChange(false);
    onSuccess?.();
  };

  const toggleMuscleSoreness = (muscleId: string) => {
    setMuscleSoreness(prev =>
      prev.includes(muscleId)
        ? prev.filter(id => id !== muscleId)
        : [...prev, muscleId]
    );
  };

  const getRatingLabel = (value: number, max: number = 5) => {
    if (max === 10) {
      if (value <= 2) return 'Velmi lehké';
      if (value <= 4) return 'Lehké';
      if (value <= 6) return 'Střední';
      if (value <= 8) return 'Těžké';
      return 'Maximální';
    }
    if (value === 1) return 'Špatné';
    if (value === 2) return 'Podprůměrné';
    if (value === 3) return 'Průměrné';
    if (value === 4) return 'Dobré';
    return 'Výborné';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Zpětná vazba po tréninku
          </DialogTitle>
          <DialogDescription>
            Vyplňte rychlý dotazník o vašem tréninku.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Automatic info */}
          <div className="p-3 rounded-lg bg-secondary/50 border text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Datum:</span>
              <span className="font-medium">{format(new Date(trainingDate), 'd.M.yyyy HH:mm', { locale: cs })}</span>
            </div>
            {trainingType && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Typ:</span>
                <span className="font-medium">{trainingType}</span>
              </div>
            )}
          </div>

          {/* RPE Rating (1-10) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Celková náročnost (RPE)</Label>
              <span className="text-sm font-medium text-primary">{rpeRating}/10 - {getRatingLabel(rpeRating, 10)}</span>
            </div>
            <Slider
              value={[rpeRating]}
              onValueChange={([v]) => setRpeRating(v)}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Lehké</span>
              <span>Maximální</span>
            </div>
          </div>

          {/* Fatigue Level (1-5) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Míra únavy po tréninku</Label>
              <span className="text-sm font-medium text-primary">{fatigueLevel}/5 - {getRatingLabel(fatigueLevel)}</span>
            </div>
            <Slider
              value={[fatigueLevel]}
              onValueChange={([v]) => setFatigueLevel(v)}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          {/* Muscle Soreness */}
          <div className="space-y-3">
            <Label>Svalová bolest</Label>
            <div className="grid grid-cols-3 gap-2">
              {MUSCLE_GROUPS.map(muscle => (
                <div
                  key={muscle.id}
                  onClick={() => toggleMuscleSoreness(muscle.id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm",
                    muscleSoreness.includes(muscle.id)
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background hover:bg-secondary/50"
                  )}
                >
                  <Checkbox
                    checked={muscleSoreness.includes(muscle.id)}
                    onCheckedChange={() => toggleMuscleSoreness(muscle.id)}
                    className="pointer-events-none"
                  />
                  <span>{muscle.label}</span>
                </div>
              ))}
            </div>
            {muscleSoreness.length > 0 && (
              <Input
                placeholder="Komentář k bolesti (volitelné)..."
                value={muscleSorenessComment}
                onChange={(e) => setMuscleSorenessComment(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Energy Level */}
          <div className="space-y-3">
            <Label>Energie během tréninku</Label>
            <RadioGroup value={energyLevel} onValueChange={(v) => setEnergyLevel(v as CreateFeedbackInput['energy_level'])}>
              <div className="grid grid-cols-2 gap-2">
                {ENERGY_OPTIONS.map(option => (
                  <div
                    key={option.value}
                    onClick={() => setEnergyLevel(option.value)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                      energyLevel === option.value
                        ? "bg-primary/10 border-primary"
                        : "bg-background hover:bg-secondary/50"
                    )}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="pointer-events-none" />
                    <Label htmlFor={option.value} className="cursor-pointer font-normal">{option.label}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Sleep */}
          <div className="space-y-3">
            <Label>Spánek před tréninkem</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Počet hodin</Label>
                <Input
                  type="number"
                  placeholder="např. 7.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  min={0}
                  max={24}
                  step={0.5}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Kvalita</Label>
                  <span className="text-xs font-medium text-primary">{sleepQuality}/5</span>
                </div>
                <Slider
                  value={[sleepQuality]}
                  onValueChange={([v]) => setSleepQuality(v)}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full mt-3"
                  disabled={!sleepHours}
                />
              </div>
            </div>
          </div>

          {/* Mood Rating */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Nálada a motivace po tréninku</Label>
              <span className="text-sm font-medium text-primary">{moodRating}/5 - {getRatingLabel(moodRating)}</span>
            </div>
            <Slider
              value={[moodRating]}
              onValueChange={([v]) => setMoodRating(v)}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          {/* Technique Rating */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Sebehodnocení techniky</Label>
              <span className="text-sm font-medium text-primary">{techniqueRating}/5 - {getRatingLabel(techniqueRating)}</span>
            </div>
            <Slider
              value={[techniqueRating]}
              onValueChange={([v]) => setTechniqueRating(v)}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          {/* Goal Relevance */}
          <div className="space-y-3">
            <Label>Byl trénink relevantní vůči vašemu cíli?</Label>
            <RadioGroup value={goalRelevance} onValueChange={(v) => setGoalRelevance(v as CreateFeedbackInput['goal_relevance'])}>
              <div className="flex gap-2">
                {GOAL_RELEVANCE_OPTIONS.map(option => (
                  <div
                    key={option.value}
                    onClick={() => setGoalRelevance(option.value)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                      goalRelevance === option.value
                        ? "bg-primary/10 border-primary"
                        : "bg-background hover:bg-secondary/50"
                    )}
                  >
                    <RadioGroupItem value={option.value} id={`goal-${option.value}`} className="pointer-events-none" />
                    <Label htmlFor={`goal-${option.value}`} className="cursor-pointer font-normal">{option.label}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label>Komentář (volitelné, max 200 znaků)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Krátká poznámka k tréninku..."
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/200</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSubmit} disabled={createFeedback.isPending}>
            {createFeedback.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ukládám...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Uložit zpětnou vazbu
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
