import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useClients } from '@/hooks/useClients';
import {
  useCreateRxWorkoutResult,
  timeInputToSeconds,
  amrapInputToScore,
} from '@/hooks/useRxWorkoutResults';
import { RxWorkout, RxScoringMode } from '@/hooks/useRxWorkouts';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon, Loader2, Timer, Repeat, Weight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RxResultEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: RxWorkout;
}

export function RxResultEntryDialog({
  open,
  onOpenChange,
  workout,
}: RxResultEntryDialogProps) {
  const { data: clients = [] } = useClients();
  const createResult = useCreateRxWorkoutResult();

  const [clientId, setClientId] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');

  // Score inputs based on scoring mode
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [reps, setReps] = useState(0);
  const [weight, setWeight] = useState(0);

  const scoringMode = (workout.scoring_mode || 'for_time') as RxScoringMode;

  const handleSubmit = async () => {
    if (!clientId) return;

    let scorePrimary = 0;
    let scoreSecondary: number | undefined;

    switch (scoringMode) {
      case 'for_time':
        scorePrimary = timeInputToSeconds(minutes, seconds);
        break;
      case 'amrap':
      case 'rounds_reps':
        const amrap = amrapInputToScore(rounds, reps);
        scorePrimary = amrap.primary;
        scoreSecondary = amrap.secondary;
        break;
      case 'max_load':
        scorePrimary = weight;
        break;
    }

    await createResult.mutateAsync({
      rx_workout_id: workout.id,
      client_id: clientId,
      score_primary: scorePrimary,
      score_secondary: scoreSecondary,
      performed_at: format(date, 'yyyy-MM-dd'),
      notes: notes || undefined,
    });

    // Reset form
    setClientId('');
    setMinutes(0);
    setSeconds(0);
    setRounds(0);
    setReps(0);
    setWeight(0);
    setNotes('');
    onOpenChange(false);
  };

  const renderScoreInput = () => {
    switch (scoringMode) {
      case 'for_time':
        return (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Čas
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={99}
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                className="w-20"
                placeholder="0"
              />
              <span className="text-muted-foreground">min</span>
              <Input
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => setSeconds(parseInt(e.target.value) || 0)}
                className="w-20"
                placeholder="0"
              />
              <span className="text-muted-foreground">sec</span>
            </div>
          </div>
        );

      case 'amrap':
      case 'rounds_reps':
        return (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Kola + Opakování
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={rounds}
                onChange={(e) => setRounds(parseInt(e.target.value) || 0)}
                className="w-20"
                placeholder="0"
              />
              <span className="text-muted-foreground">kol</span>
              <span className="text-xl">+</span>
              <Input
                type="number"
                min={0}
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                className="w-20"
                placeholder="0"
              />
              <span className="text-muted-foreground">reps</span>
            </div>
          </div>
        );

      case 'max_load':
        return (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Weight className="h-4 w-4" />
              Váha
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-28"
                placeholder="0"
              />
              <span className="text-muted-foreground">kg</span>
            </div>
          </div>
        );
    }
  };

  const scoringModeLabels: Record<RxScoringMode, string> = {
    for_time: 'For Time',
    amrap: 'AMRAP',
    max_load: 'Max Load',
    rounds_reps: 'Rounds + Reps',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Zapsat výsledek</DialogTitle>
          <DialogDescription>
            {workout.name} ({scoringModeLabels[scoringMode]})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client selection */}
          <div className="space-y-2">
            <Label>Klient</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Vybrat klienta..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                    {client.gender && (
                      <span className="text-muted-foreground ml-1">
                        ({client.gender === 'male' ? 'M' : 'Ž'})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Score input */}
          {renderScoreInput()}

          {/* Date picker */}
          <div className="space-y-2">
            <Label>Datum výkonu</Label>
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
                  {date ? format(date, 'PPP', { locale: cs }) : 'Vybrat datum'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={cs}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Poznámka (volitelné)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Poznámky k výkonu..."
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!clientId || createResult.isPending}
          >
            {createResult.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Zapsat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
