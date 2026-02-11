import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon, Dumbbell, Timer, Trophy } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useClients } from '@/hooks/useClients';
import { useExercises } from '@/hooks/useExercises';
import { useCreatePerformanceLog, PerformanceLogInput } from '@/hooks/usePerformanceLog';
import { TimeInput } from '@/components/ui/time-input';

interface AddPerformanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
  defaultExerciseId?: string;
}

export function AddPerformanceSheet({
  open,
  onOpenChange,
  defaultClientId,
  defaultExerciseId,
}: AddPerformanceSheetProps) {
  const { data: clients = [] } = useClients();
  const { exercises = [] } = useExercises();
  const createPerformance = useCreatePerformanceLog();

  const activeClients = clients.filter(c => !c.is_archived);
  const activeExercises = exercises.filter(e => !e.is_archived);

  // Form state
  const [clientId, setClientId] = useState(defaultClientId || '');
  const [exerciseId, setExerciseId] = useState(defaultExerciseId || '');
  const [date, setDate] = useState<Date>(new Date());
  const [sets, setSets] = useState('1');
  const [reps, setReps] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [timeMs, setTimeMs] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState('');
  const [avgWatts, setAvgWatts] = useState('');
  const [rpe, setRpe] = useState('');
  const [level, setLevel] = useState('');
  const [resistance, setResistance] = useState('');
  const [notes, setNotes] = useState('');
  const [isTest, setIsTest] = useState(false);

  // Get selected exercise details
  const selectedExercise = activeExercises.find(e => e.id === exerciseId);
  const isTimeBased = selectedExercise?.is_time_based || false;
  const isCardio = selectedExercise?.category?.toLowerCase().includes('kardio') ||
                   selectedExercise?.category?.toLowerCase().includes('cardio') ||
                   selectedExercise?.category?.toLowerCase().includes('conditioning');
  const isRowerOrSkierg = selectedExercise?.name?.toLowerCase().includes('veslo') ||
                          selectedExercise?.name?.toLowerCase().includes('row') ||
                          selectedExercise?.name?.toLowerCase().includes('skierg') ||
                          selectedExercise?.name?.toLowerCase().includes('skillup') ||
                          selectedExercise?.name?.toLowerCase().includes('skyark');

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setClientId(defaultClientId || '');
      setExerciseId(defaultExerciseId || '');
      setDate(new Date());
      setSets('1');
      setReps('');
      setWeightKg('');
      setTimeMs(null);
      setDistanceMeters('');
      setAvgWatts('');
      setRpe('');
      setLevel('');
      setResistance('');
      setNotes('');
      setIsTest(false);
    }
  }, [open, defaultClientId, defaultExerciseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientId || !exerciseId) {
      return;
    }

    const input: PerformanceLogInput = {
      client_id: clientId,
      exercise_id: exerciseId,
      exercise_name: selectedExercise?.name || selectedExercise?.name_cs || '',
      date: format(date, 'yyyy-MM-dd'),
      sets: parseInt(sets) || 1,
      reps: reps ? parseInt(reps) : undefined,
      weight_kg: weightKg ? parseFloat(weightKg.replace(',', '.')) : undefined,
      time_ms: timeMs || undefined,
      time_seconds: timeMs ? Math.round(timeMs / 1000) : undefined,
      distance_meters: distanceMeters ? parseFloat(distanceMeters) : undefined,
      avg_watts: avgWatts ? parseInt(avgWatts) : undefined,
      rpe: rpe ? parseInt(rpe) : undefined,
      level: level ? parseInt(level) : undefined,
      resistance: resistance ? parseInt(resistance) : undefined,
      notes: notes || undefined,
      is_test: isTest,
      source: 'coach_manual',
      status: 'approved',
    };

    await createPerformance.mutateAsync(input);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Přidat výkon
          </SheetTitle>
          <SheetDescription>
            Zaznamenejte výkon klienta mimo trénink
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client">Klient *</Label>
            <ClientSearchSelect
              clients={activeClients}
              value={clientId}
              onValueChange={setClientId}
              placeholder="Vyhledat klienta..."
              filterArchived
            />
          </div>

          {/* Exercise Selection */}
          <div className="space-y-2">
            <Label htmlFor="exercise">Cvik *</Label>
            <Select value={exerciseId} onValueChange={setExerciseId}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte cvik" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {activeExercises.filter(exercise => exercise.id).map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    <span className="flex items-center gap-2">
                      {exercise.is_time_based ? (
                        <Timer className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Dumbbell className="h-3 w-3 text-muted-foreground" />
                      )}
                      {exercise.name_cs || exercise.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: cs }) : 'Vyberte datum'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Metrics based on exercise type */}
          {selectedExercise && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium">Metriky</h4>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Sets (always shown) */}
                <div className="space-y-1">
                  <Label className="text-xs">Série</Label>
                  <Input
                    type="number"
                    min="1"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                  />
                </div>

                {/* Time for time-based exercises */}
                {isTimeBased && (
                  <div className="space-y-1">
                    <Label className="text-xs">Čas (mm:ss.SS)</Label>
                    <TimeInput
                      value={timeMs}
                      onChange={setTimeMs}
                      placeholder="1:41.35"
                    />
                  </div>
                )}

                {/* Reps for non-time-based */}
                {!isTimeBased && (
                  <div className="space-y-1">
                    <Label className="text-xs">Opakování</Label>
                    <Input
                      type="number"
                      min="1"
                      value={reps}
                      onChange={(e) => setReps(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                )}

                {/* Weight for strength exercises */}
                {!isCardio && (
                  <div className="space-y-1">
                    <Label className="text-xs">Váha (kg)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="80"
                    />
                  </div>
                )}

                {/* Distance for cardio */}
                {(isCardio || isTimeBased) && (
                  <div className="space-y-1">
                    <Label className="text-xs">Vzdálenost (m)</Label>
                    <Input
                      type="number"
                      value={distanceMeters}
                      onChange={(e) => setDistanceMeters(e.target.value)}
                      placeholder="500"
                    />
                  </div>
                )}

                {/* Watts for cardio */}
                {isCardio && (
                  <div className="space-y-1">
                    <Label className="text-xs">Průměr Watt</Label>
                    <Input
                      type="number"
                      value={avgWatts}
                      onChange={(e) => setAvgWatts(e.target.value)}
                      placeholder="200"
                    />
                  </div>
                )}

                {/* RPE (always shown) */}
                <div className="space-y-1">
                  <Label className="text-xs">RPE (1-10)</Label>
                  <Select value={rpe} onValueChange={setRpe}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                        <SelectItem key={v} value={String(v)}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Level and Resistance for rower/skierg */}
                {isRowerOrSkierg && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Obtížnost (1-10)</Label>
                      <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                            <SelectItem key={v} value={String(v)}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Magnet (1-3)</Label>
                      <Select value={resistance} onValueChange={setResistance}>
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3].map((v) => (
                            <SelectItem key={v} value={String(v)}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              {/* Is Test toggle */}
              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="is-test" className="text-sm">Označit jako test</Label>
                <Switch
                  id="is-test"
                  checked={isTest}
                  onCheckedChange={setIsTest}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Poznámky</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Volitelné poznámky k výkonu..."
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              disabled={!clientId || !exerciseId || createPerformance.isPending}
              className="flex-1"
            >
              {createPerformance.isPending ? 'Ukládám...' : 'Uložit výkon'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
