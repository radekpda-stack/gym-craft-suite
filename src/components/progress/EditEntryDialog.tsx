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

interface EditEntryDialogProps {
  entry: ExerciseEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEntryDialog({ entry, open, onOpenChange }: EditEntryDialogProps) {
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
    }
  }, [entry]);
  
  const handleSave = async () => {
    if (!entry) return;
    
    const timeSeconds = msToSeconds(timeMs);
    
    await updateEntry.mutateAsync({
      id: entry.id,
      sets,
      reps: reps ? parseInt(reps, 10) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      time_seconds: timeSeconds,
      is_bodyweight: isBodyweight,
      tempo: tempo || null,
      notes: notes || null,
      distance_meters: distanceMeters ? parseInt(distanceMeters, 10) : null,
      date,
    });
    
    onOpenChange(false);
  };
  
  const isTimeBased = entry?.time_seconds != null && entry.time_seconds > 0;
  const isStrengthBased = (entry?.weight_kg != null && entry.weight_kg > 0) || entry?.is_bodyweight;
  
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
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          
          {/* Sets & Reps */}
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
            <Switch
              checked={isBodyweight}
              onCheckedChange={setIsBodyweight}
            />
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
          
          {/* Time - show if entry has time or is time-based */}
          <div className="space-y-2">
            <Label>Čas (mm:ss nebo mm:ss.SS)</Label>
            <TimeInput
              value={timeMs}
              onChange={setTimeMs}
              placeholder="1:41.35"
            />
          </div>
          
          {/* Distance */}
          <div className="space-y-2">
            <Label>Vzdálenost (m)</Label>
            <Input
              type="number"
              min={0}
              placeholder="—"
              value={distanceMeters}
              onChange={(e) => setDistanceMeters(e.target.value)}
            />
          </div>
          
          {/* Tempo */}
          <div className="space-y-2">
            <Label>Tempo</Label>
            <Input
              placeholder="3-1-2-0"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
            />
          </div>
          
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
