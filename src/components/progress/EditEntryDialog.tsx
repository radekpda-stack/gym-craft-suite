/**
 * Dialog for editing an exercise entry
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ExerciseEntry, useExerciseEntries } from '@/hooks/useExerciseEntries';
import { TimeInput } from '@/components/ui/time-input';
import { secondsToMs, msToSeconds } from '@/lib/timeUtils';
import { AssistanceBandSelector, isPullUpExercise, type BandType } from '@/components/exercises/AssistanceBandSelector';

interface EditEntryDialogProps {
  entry: ExerciseEntry | null;
  /** Optional: helps show the right fields (e.g. skierg/rower/treadmill vs strength) */
  metricCategory?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEntryDialog({ entry, metricCategory, open, onOpenChange }: EditEntryDialogProps) {
  const { updateEntry } = useExerciseEntries();

  const [sets, setSets] = useState(1);
  const [reps, setReps] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [timeMs, setTimeMs] = useState<number | null>(null);
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [tempo, setTempo] = useState('');
  const [notes, setNotes] = useState('');
  const [distanceMeters, setDistanceMeters] = useState<string>('');
  const [date, setDate] = useState('');

  // Cardio / extended metrics
  const [avgWatts, setAvgWatts] = useState<string>('');
  const [maxWatts, setMaxWatts] = useState<string>('');
  const [avgSpeedKmh, setAvgSpeedKmh] = useState<string>('');
  const [maxSpeedKmh, setMaxSpeedKmh] = useState<string>('');
  const [pace500m, setPace500m] = useState<string>('');
  const [paceKm, setPaceKm] = useState<string>('');
  const [avgHr, setAvgHr] = useState<string>('');
  const [maxHr, setMaxHr] = useState<string>('');
  const [cadence, setCadence] = useState<string>('');
  const [strokes, setStrokes] = useState<string>('');
  const [rpe, setRpe] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [resistance, setResistance] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [isTest, setIsTest] = useState(false);
  const [legFatigue, setLegFatigue] = useState(false);
  const [assistanceBands, setAssistanceBands] = useState<BandType[]>([]);
  
  // Sync form with entry when it changes
  useEffect(() => {
    if (entry) {
      setSets(entry.sets || 1);
      setReps(entry.reps?.toString() || '');
      setWeightKg(entry.weight_kg?.toString() || '');
      setTimeMs(secondsToMs(entry.time_seconds));
      setIsBodyweight(entry.is_bodyweight || false);
      setTempo(entry.tempo || '');
      setNotes(entry.notes || '');
      setDistanceMeters(entry.distance_meters?.toString() || '');
      setDate(entry.date || '');

      setAvgWatts(entry.avg_watts?.toString() || '');
      setMaxWatts(entry.max_watts?.toString() || '');
      setAvgSpeedKmh(entry.avg_speed_kmh?.toString() || '');
      setMaxSpeedKmh(entry.max_speed_kmh?.toString() || '');
      setPace500m(entry.pace_sec_per_500m?.toString() || '');
      setPaceKm(entry.pace_sec_per_km?.toString() || '');
      setAvgHr(entry.avg_heart_rate?.toString() || '');
      setMaxHr(entry.max_heart_rate?.toString() || '');
      setCadence(entry.cadence_spm?.toString() || '');
      setStrokes(entry.strokes?.toString() || '');
      setRpe(entry.rpe?.toString() || '');
      setLevel(entry.level?.toString() || '');
      setResistance(entry.resistance?.toString() || '');
      setCalories(entry.calories_kcal?.toString() || '');
      setIsTest(!!entry.is_test);
      setLegFatigue(!!entry.leg_fatigue);
      
      // Extract assistance bands from metrics_json
      const metricsJson = (entry as any).metrics_json as { assistance_bands?: BandType[] } | null;
      setAssistanceBands(metricsJson?.assistance_bands || []);
    }
  }, [entry]);
  
  const parseIntOrNull = (v: string) => (v.trim() ? parseInt(v, 10) : null);
  const parseFloatOrNull = (v: string) => (v.trim() ? parseFloat(v) : null);

  const isCardio = metricCategory ? metricCategory !== 'strength' : (
    !!avgWatts || !!maxWatts || !!avgSpeedKmh || !!pace500m || !!paceKm || !!avgHr || !!distanceMeters
  );
  
  // Check if this is a pull-up exercise
  const isPullUp = entry ? isPullUpExercise(entry.exercise_name || '') : false;
  const handleSave = async () => {
    if (!entry) return;

    const timeSeconds = msToSeconds(timeMs);

    await updateEntry.mutateAsync({
      id: entry.id,
      date,

      // Strength
      sets: isCardio ? entry.sets : sets,
      reps: isCardio ? entry.reps : parseIntOrNull(reps),
      weight_kg: isCardio ? entry.weight_kg : parseFloatOrNull(weightKg),
      is_bodyweight: isCardio ? entry.is_bodyweight : isBodyweight,
      tempo: isCardio ? entry.tempo : (tempo || null),

      // Cardio / shared
      time_seconds: timeSeconds,
      time_ms: timeMs,
      distance_meters: parseIntOrNull(distanceMeters),

      avg_watts: parseIntOrNull(avgWatts),
      max_watts: parseIntOrNull(maxWatts),
      avg_speed_kmh: parseFloatOrNull(avgSpeedKmh),
      max_speed_kmh: parseFloatOrNull(maxSpeedKmh),
      pace_sec_per_500m: parseFloatOrNull(pace500m),
      pace_sec_per_km: parseFloatOrNull(paceKm),
      avg_heart_rate: parseIntOrNull(avgHr),
      max_heart_rate: parseIntOrNull(maxHr),
      cadence_spm: parseIntOrNull(cadence),
      strokes: parseIntOrNull(strokes),
      rpe: parseIntOrNull(rpe),
      level: parseIntOrNull(level),
      resistance: parseIntOrNull(resistance),
      calories_kcal: parseIntOrNull(calories),
      is_test: isTest,
      leg_fatigue: legFatigue,

      // Pull-up assistance bands
      metrics_json: assistanceBands.length > 0 
        ? { assistance_bands: assistanceBands }
        : null,

      notes: notes || null,
    });

    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Upravit záznam: {entry?.exercise_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Date */}
          <div className="space-y-2">
            <Label>Datum</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {!isCardio ? (
            <>
              {/* Strength: Sets & Reps */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Série</Label>
                  <Input
                    type="number"
                    min={1}
                    value={sets}
                    onChange={(e) => setSets(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Opakování</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="—"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                  />
                </div>
              </div>

              {/* Bodyweight toggle */}
              <div className="flex items-center justify-between">
                <Label>Vlastní váha</Label>
                <Switch checked={isBodyweight} onCheckedChange={setIsBodyweight} />
              </div>

              {/* Weight */}
              {!isBodyweight && (
                <div className="space-y-2">
                  <Label>Váha (kg)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    placeholder="0"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                  />
                </div>
              )}

              {/* Tempo */}
              <div className="space-y-2">
                <Label>Tempo</Label>
                <Input
                  placeholder="3-1-2-0"
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                />
              </div>

              {/* Assistance Bands for Pull-up exercises */}
              {isPullUp && (
                <AssistanceBandSelector
                  value={assistanceBands}
                  onChange={setAssistanceBands}
                />
              )}
            </>
          ) : (
            <>
              {/* Cardio: Time */}
              <div className="space-y-2">
                <Label>Čas (mm:ss nebo mm:ss.SS)</Label>
                <TimeInput value={timeMs} onChange={setTimeMs} placeholder="1:41.35" />
              </div>

              {/* Distance */}
              <div className="space-y-2">
                <Label>Vzdálenost (m)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="500"
                  value={distanceMeters}
                  onChange={(e) => setDistanceMeters(e.target.value)}
                />
              </div>

              {/* Performance */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Avg W</Label>
                  <Input type="number" placeholder="—" value={avgWatts} onChange={(e) => setAvgWatts(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Max W</Label>
                  <Input type="number" placeholder="—" value={maxWatts} onChange={(e) => setMaxWatts(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Avg km/h</Label>
                  <Input type="number" step="0.1" placeholder="—" value={avgSpeedKmh} onChange={(e) => setAvgSpeedKmh(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Max km/h</Label>
                  <Input type="number" step="0.1" placeholder="—" value={maxSpeedKmh} onChange={(e) => setMaxSpeedKmh(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pace /500m (s)</Label>
                  <Input type="number" step="0.1" placeholder="—" value={pace500m} onChange={(e) => setPace500m(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Pace /km (s)</Label>
                  <Input type="number" step="0.1" placeholder="—" value={paceKm} onChange={(e) => setPaceKm(e.target.value)} />
                </div>
              </div>

              {/* Physiology + effort */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Avg HR</Label>
                  <Input type="number" placeholder="—" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Max HR</Label>
                  <Input type="number" placeholder="—" value={maxHr} onChange={(e) => setMaxHr(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cadence (spm)</Label>
                  <Input type="number" placeholder="—" value={cadence} onChange={(e) => setCadence(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Strokes</Label>
                  <Input type="number" placeholder="—" value={strokes} onChange={(e) => setStrokes(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>RPE</Label>
                  <Input type="number" min={0} max={10} placeholder="—" value={rpe} onChange={(e) => setRpe(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Kalorie (kcal)</Label>
                  <Input type="number" placeholder="—" value={calories} onChange={(e) => setCalories(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Input type="number" placeholder="—" value={level} onChange={(e) => setLevel(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Resistance</Label>
                  <Input type="number" placeholder="—" value={resistance} onChange={(e) => setResistance(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Test</Label>
                <Switch checked={isTest} onCheckedChange={setIsTest} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Únava nohou</Label>
                <Switch checked={legFatigue} onCheckedChange={setLegFatigue} />
              </div>
            </>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Poznámky</Label>
            <Textarea
              placeholder="Poznámky k záznamu..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={updateEntry.isPending}>
            {updateEntry.isPending ? 'Ukládám...' : 'Uložit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
