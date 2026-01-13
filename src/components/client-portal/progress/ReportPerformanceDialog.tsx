import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Timer, Calendar, Trophy, AlertCircle, Dumbbell, Repeat } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseTimeToMs } from '@/lib/timeUtils';

interface ReportPerformanceDialogProps {
  trigger?: React.ReactNode;
}

type ExerciseCategory = 'cardio' | 'strength' | 'bodyweight';

interface ExerciseOption {
  name: string;
  category: ExerciseCategory;
  distance?: number;
  unit?: 'kg' | 'reps' | 'time';
}

const EXERCISE_OPTIONS: ExerciseOption[] = [
  // Cardio exercises
  { name: 'Veslo 500m', category: 'cardio', distance: 500, unit: 'time' },
  { name: 'Veslo 1000m', category: 'cardio', distance: 1000, unit: 'time' },
  { name: 'Veslo 2000m', category: 'cardio', distance: 2000, unit: 'time' },
  { name: 'SkiErg 500m', category: 'cardio', distance: 500, unit: 'time' },
  { name: 'SkiErg 1000m', category: 'cardio', distance: 1000, unit: 'time' },
  { name: 'BikeErg 1km', category: 'cardio', distance: 1000, unit: 'time' },
  { name: 'Běh 500m', category: 'cardio', distance: 500, unit: 'time' },
  { name: 'Běh 1km', category: 'cardio', distance: 1000, unit: 'time' },
  { name: 'Běh 5km', category: 'cardio', distance: 5000, unit: 'time' },
  // Strength exercises
  { name: 'Bench Press', category: 'strength', unit: 'kg' },
  { name: 'Dřep (Squat)', category: 'strength', unit: 'kg' },
  { name: 'Mrtvý tah (Deadlift)', category: 'strength', unit: 'kg' },
  { name: 'Tlak nad hlavu (OHP)', category: 'strength', unit: 'kg' },
  { name: 'Přítahy na hrazdě', category: 'bodyweight', unit: 'reps' },
  { name: 'Kliky', category: 'bodyweight', unit: 'reps' },
  { name: 'Dipy', category: 'bodyweight', unit: 'reps' },
  { name: 'Výpady', category: 'strength', unit: 'kg' },
  { name: 'Předkopávání', category: 'strength', unit: 'kg' },
  { name: 'Zakopávání', category: 'strength', unit: 'kg' },
  { name: 'Leg Press', category: 'strength', unit: 'kg' },
  { name: 'Přítahy kladky', category: 'strength', unit: 'kg' },
  { name: 'Veslo s činkou', category: 'strength', unit: 'kg' },
  { name: 'Bicepsový zdvih', category: 'strength', unit: 'kg' },
  { name: 'Tricepsové kliky', category: 'strength', unit: 'kg' },
  // Core / Time-based
  { name: 'Prkno (Plank)', category: 'bodyweight', unit: 'time' },
  { name: 'Boční prkno', category: 'bodyweight', unit: 'time' },
  { name: 'Dead hang', category: 'bodyweight', unit: 'time' },
];

// Group exercises by category for display
const CARDIO_EXERCISES = EXERCISE_OPTIONS.filter(e => e.category === 'cardio');
const STRENGTH_EXERCISES = EXERCISE_OPTIONS.filter(e => e.category === 'strength');
const BODYWEIGHT_EXERCISES = EXERCISE_OPTIONS.filter(e => e.category === 'bodyweight');

export function ReportPerformanceDialog({ trigger }: ReportPerformanceDialogProps) {
  const { clientId, user, clientAccount } = useClientPortal();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeInput, setTimeInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [notes, setNotes] = useState('');

  const selectedExercise = EXERCISE_OPTIONS.find(e => e.name === exerciseName);
  const inputType = selectedExercise?.unit || 'time';

  const resetForm = () => {
    setExerciseName('');
    setTimeInput('');
    setWeightInput('');
    setRepsInput('');
    setNotes('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const submitPerformance = useMutation({
    mutationFn: async () => {
      if (!clientId || !clientAccount?.trainer_id) {
        throw new Error('Klient není přihlášen');
      }

      if (!selectedExercise) {
        throw new Error('Vyberte cvik');
      }

      // Validate input based on type
      let timeMs: number | null = null;
      let timeSeconds: number | null = null;
      let weightKg: number | null = null;
      let reps: number | null = null;

      if (inputType === 'time') {
        timeMs = parseTimeToMs(timeInput);
        if (!timeMs) {
          throw new Error('Zadejte platný čas (mm:ss nebo mm:ss.SS)');
        }
        timeSeconds = Math.round(timeMs / 1000);
      } else if (inputType === 'kg') {
        weightKg = parseFloat(weightInput);
        if (isNaN(weightKg) || weightKg <= 0) {
          throw new Error('Zadejte platnou váhu v kg');
        }
        reps = parseInt(repsInput) || 1;
      } else if (inputType === 'reps') {
        reps = parseInt(repsInput);
        if (isNaN(reps) || reps <= 0) {
          throw new Error('Zadejte platný počet opakování');
        }
      }

      // Find exercise_id by matching name
      const searchName = selectedExercise.name.split(' ')[0].split('(')[0].trim();
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, name, name_cs')
        .or(`name.ilike.%${searchName}%,name_cs.ilike.%${searchName}%`)
        .limit(1);

      const exerciseId = exercises?.[0]?.id || null;

      // Insert as pending (client_self_report)
      const { data, error } = await supabase
        .from('exercise_entries')
        .insert({
          user_id: clientAccount.trainer_id,
          client_id: clientId,
          exercise_id: exerciseId,
          exercise_name: selectedExercise.name,
          date,
          sets: 1,
          reps: reps,
          weight_kg: weightKg,
          time_ms: timeMs,
          time_seconds: timeSeconds,
          distance_meters: selectedExercise.distance || null,
          is_bodyweight: selectedExercise.category === 'bodyweight',
          notes: notes || null,
          is_test: inputType === 'time', // Only mark as test for cardio
          source: 'client_self_report',
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Performance report error:', error);
        throw new Error(error.message || 'Nepodařilo se nahlásit výkon');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-cardio-progress'] });
      queryClient.invalidateQueries({ queryKey: ['client-exercise-prs'] });
      queryClient.invalidateQueries({ queryKey: ['pending-performances'] });
      toast.success('Výkon nahlášen ke schválení');
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Nepodařilo se nahlásit výkon');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPerformance.mutate();
  };

  const isFormValid = () => {
    if (!exerciseName) return false;
    if (inputType === 'time' && !timeInput) return false;
    if (inputType === 'kg' && (!weightInput || !repsInput)) return false;
    if (inputType === 'reps' && !repsInput) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="default" className="gap-1.5">
            <Trophy className="w-4 h-4" />
            Nahlásit výkon
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Nahlásit výkon
          </DialogTitle>
          <DialogDescription>
            Nahlas svůj výkon mimo trénink. Trenér ho potvrdí.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="bg-warning/10 border-warning/30">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            Výkon bude čekat na schválení trenérem před započítáním do statistik.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cvik</Label>
            <Select value={exerciseName} onValueChange={setExerciseName}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte cvik" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Kardio</div>
                {CARDIO_EXERCISES.map(opt => (
                  <SelectItem key={opt.name} value={opt.name}>
                    {opt.name}
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Silové cviky</div>
                {STRENGTH_EXERCISES.map(opt => (
                  <SelectItem key={opt.name} value={opt.name}>
                    {opt.name}
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">S vlastní vahou</div>
                {BODYWEIGHT_EXERCISES.map(opt => (
                  <SelectItem key={opt.name} value={opt.name}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Datum</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-10"
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>

          {/* Dynamic input based on exercise type */}
          {inputType === 'time' && (
            <div className="space-y-2">
              <Label>Čas (mm:ss nebo mm:ss.SS)</Label>
              <div className="relative">
                <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="1:41.35"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Např. 1:41 nebo 1:41.35 pro čas s desetinami
              </p>
            </div>
          )}

          {inputType === 'kg' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Váha (kg)</Label>
                <div className="relative">
                  <Dumbbell className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="80"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Opakování</Label>
                <div className="relative">
                  <Repeat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={repsInput}
                    onChange={(e) => setRepsInput(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          )}

          {inputType === 'reps' && (
            <div className="space-y-2">
              <Label>Počet opakování</Label>
              <div className="relative">
                <Repeat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="1"
                  placeholder="10"
                  value={repsInput}
                  onChange={(e) => setRepsInput(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Poznámka (volitelné)</Label>
            <Textarea
              placeholder="Např. po rozcvičení, max tempo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={submitPerformance.isPending || !isFormValid()}>
              {submitPerformance.isPending ? 'Odesílám...' : 'Nahlásit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
