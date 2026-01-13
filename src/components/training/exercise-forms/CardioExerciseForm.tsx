import { useState } from 'react';
import { Timer, MapPin, Zap, Heart, Activity, Gauge, MessageSquare, FlaskConical, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExerciseWithType, CreateCardioEntryInput } from '@/types/exercise-entries';

interface CardioExerciseFormProps {
  exercise: ExerciseWithType;
  clientId: string;
  date: string;
  trainingSessionId?: string;
  onSubmit: (data: CreateCardioEntryInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  defaultValues?: Partial<CreateCardioEntryInput>;
}

export function CardioExerciseForm({
  exercise,
  clientId,
  date,
  trainingSessionId,
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues,
}: CardioExerciseFormProps) {
  // Core performance state
  const [minutes, setMinutes] = useState(Math.floor((defaultValues?.duration_seconds || 0) / 60));
  const [seconds, setSeconds] = useState((defaultValues?.duration_seconds || 0) % 60);
  const [distanceMeters, setDistanceMeters] = useState(defaultValues?.distance_meters || null);
  const [avgSpeed, setAvgSpeed] = useState(defaultValues?.avg_speed_kmh || null);
  const [maxSpeed, setMaxSpeed] = useState(defaultValues?.max_speed_kmh || null);

  // Physiology state
  const [avgHeartRate, setAvgHeartRate] = useState(defaultValues?.avg_heart_rate || null);
  const [maxHeartRate, setMaxHeartRate] = useState(defaultValues?.max_heart_rate || null);
  const [avgWatts, setAvgWatts] = useState(defaultValues?.avg_watts || null);
  const [maxWatts, setMaxWatts] = useState(defaultValues?.max_watts || null);
  const [physiologyOpen, setPhysiologyOpen] = useState(false);

  // Subjective state
  const [rpe, setRpe] = useState(defaultValues?.rpe || 5);
  const [legFatigue, setLegFatigue] = useState(defaultValues?.leg_fatigue || false);
  const [notes, setNotes] = useState(defaultValues?.notes || '');

  // Metadata state
  const [isTest, setIsTest] = useState(defaultValues?.is_test || false);
  const [metadataOpen, setMetadataOpen] = useState(false);

  const durationSeconds = minutes * 60 + seconds;
  const isValid = durationSeconds > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    await onSubmit({
      client_id: clientId,
      exercise_id: exercise.id,
      exercise_name: exercise.name_cs || exercise.name,
      date,
      training_session_id: trainingSessionId || null,
      duration_seconds: durationSeconds,
      distance_meters: distanceMeters,
      avg_speed_kmh: avgSpeed,
      max_speed_kmh: maxSpeed,
      avg_heart_rate: avgHeartRate,
      max_heart_rate: maxHeartRate,
      avg_watts: avgWatts,
      max_watts: maxWatts,
      rpe,
      leg_fatigue: legFatigue,
      notes: notes || null,
      is_test: isTest,
      is_pr: false, // Will be calculated server-side
    });
  };

  const getRpeColor = (value: number) => {
    if (value <= 3) return 'text-success';
    if (value <= 5) return 'text-warning';
    if (value <= 7) return 'text-warning';
    return 'text-destructive';
  };

  const getRpeLabel = (value: number) => {
    if (value <= 2) return 'Velmi lehké';
    if (value <= 4) return 'Lehké';
    if (value <= 6) return 'Střední';
    if (value <= 8) return 'Těžké';
    return 'Maximum';
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
              CARDIO
            </Badge>
            {isTest && (
              <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                <FlaskConical className="w-3 h-3 mr-1" />
                TEST
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Core Performance */}
      <div className="space-y-4 p-4 rounded-xl bg-muted/50 border">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Základní výkon
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Duration - REQUIRED */}
          <div className="col-span-2 sm:col-span-1">
            <Label className="flex items-center gap-2 mb-2">
              <Timer className="w-4 h-4 text-primary" />
              Čas <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="min"
                  value={minutes || ''}
                  onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                  min={0}
                  className="text-center"
                />
                <span className="text-xs text-muted-foreground mt-1 block text-center">min</span>
              </div>
              <span className="text-2xl text-muted-foreground self-start mt-1">:</span>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="sec"
                  value={seconds || ''}
                  onChange={(e) => setSeconds(Math.min(59, parseInt(e.target.value) || 0))}
                  min={0}
                  max={59}
                  className="text-center"
                />
                <span className="text-xs text-muted-foreground mt-1 block text-center">sec</span>
              </div>
            </div>
          </div>

          {/* Distance */}
          <div className="col-span-2 sm:col-span-1">
            <Label className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary" />
              Vzdálenost
            </Label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0"
                value={distanceMeters || ''}
                onChange={(e) => setDistanceMeters(parseInt(e.target.value) || null)}
                min={0}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">m</span>
            </div>
          </div>

          {/* Avg Speed */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-primary" />
              Ø Rychlost
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={avgSpeed || ''}
                onChange={(e) => setAvgSpeed(parseFloat(e.target.value) || null)}
                min={0}
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">km/h</span>
            </div>
          </div>

          {/* Max Speed */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Max rychlost
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={maxSpeed || ''}
                onChange={(e) => setMaxSpeed(parseFloat(e.target.value) || null)}
                min={0}
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Physiology (Collapsible) */}
      <Collapsible open={physiologyOpen} onOpenChange={setPhysiologyOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full p-4 rounded-xl bg-muted/50 border hover:bg-muted/70 transition-colors"
          >
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              Fyziologie
            </span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", physiologyOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 p-4 rounded-xl bg-muted/50 border space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Avg HR */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-red-500" />
                Ø TF
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={avgHeartRate || ''}
                  onChange={(e) => setAvgHeartRate(parseInt(e.target.value) || null)}
                  min={0}
                  max={250}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">bpm</span>
              </div>
            </div>

            {/* Max HR */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-red-600" />
                Max TF
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={maxHeartRate || ''}
                  onChange={(e) => setMaxHeartRate(parseInt(e.target.value) || null)}
                  min={0}
                  max={250}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">bpm</span>
              </div>
            </div>

            {/* Avg Watts */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Ø Watty
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={avgWatts || ''}
                  onChange={(e) => setAvgWatts(parseInt(e.target.value) || null)}
                  min={0}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">W</span>
              </div>
            </div>

            {/* Max Watts */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Max Watty
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={maxWatts || ''}
                  onChange={(e) => setMaxWatts(parseInt(e.target.value) || null)}
                  min={0}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">W</span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 3: Subjective */}
      <div className="space-y-4 p-4 rounded-xl bg-muted/50 border">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Subjektivní vnímání
        </h4>

        {/* RPE Slider */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>RPE (vnímaná náročnost)</Label>
            <span className={cn("text-lg font-bold", getRpeColor(rpe))}>
              {rpe}/10
            </span>
          </div>
          <Slider
            value={[rpe]}
            onValueChange={([value]) => setRpe(value)}
            min={1}
            max={10}
            step={1}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Lehké</span>
            <span className={getRpeColor(rpe)}>{getRpeLabel(rpe)}</span>
            <span>Maximum</span>
          </div>
        </div>

        {/* Leg Fatigue */}
        <div className="flex items-center justify-between">
          <Label htmlFor="leg-fatigue" className="cursor-pointer">
            Únava dolních končetin
          </Label>
          <Switch
            id="leg-fatigue"
            checked={legFatigue}
            onCheckedChange={setLegFatigue}
          />
        </div>

        {/* Notes */}
        <div>
          <Label className="mb-2 block">Poznámka</Label>
          <Textarea
            placeholder="Jak se cítím, technické poznámky..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Section 4: Metadata (Collapsible) */}
      <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full p-4 rounded-xl bg-muted/50 border hover:bg-muted/70 transition-colors"
          >
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Metadata
            </span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", metadataOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 p-4 rounded-xl bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is-test" className="cursor-pointer font-medium">
                Testovací cvik
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Označí výkon jako test pro porovnání
              </p>
            </div>
            <Switch
              id="is-test"
              checked={isTest}
              onCheckedChange={setIsTest}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Validation hint */}
      {!isValid && (
        <p className="text-sm text-destructive">
          Zadejte čas trvání pro uložení záznamu.
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
