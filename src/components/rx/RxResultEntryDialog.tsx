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
import { Switch } from '@/components/ui/switch';
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
  formatRxScore,
} from '@/hooks/useRxWorkoutResults';
import { RxWorkout, RxScoringMode } from '@/hooks/useRxWorkouts';
import { checkForPR, markAsPR } from '@/lib/rxPRDetection';
import { RxPRCelebration } from './RxPRCelebration';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon, Loader2, Timer, Repeat, Weight, AlertTriangle } from 'lucide-react';
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

  // CAP mode
  const [isCapped, setIsCapped] = useState(false);
  const [cappedRounds, setCappedRounds] = useState(0);
  const [cappedReps, setCappedReps] = useState(0);

  // Score inputs based on scoring mode
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [reps, setReps] = useState(0);
  const [weight, setWeight] = useState(0);

  // PR celebration
  const [showPRCelebration, setShowPRCelebration] = useState(false);
  const [prData, setPrData] = useState<{
    clientName: string;
    newScore: string;
    previousScore?: string;
    improvementLabel?: string;
  } | null>(null);

  const scoringMode = (workout.scoring_mode || 'for_time') as RxScoringMode;

  const handleSubmit = async () => {
    if (!clientId) return;

    let scorePrimary = 0;
    let scoreSecondary: number | undefined;

    if (isCapped) {
      // For CAP results, use time cap as the primary score
      // and store the remaining work in capped_rounds/capped_reps
      scorePrimary = workout.time_cap_seconds || 0;
    } else {
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
    }

    // Check for PR before saving
    const prCheck = !isCapped 
      ? await checkForPR(workout.id, clientId, scorePrimary, scoringMode)
      : { isPR: false, previousBest: null, improvement: null, improvementLabel: null };

    const result = await createResult.mutateAsync({
      rx_workout_id: workout.id,
      client_id: clientId,
      score_primary: scorePrimary,
      score_secondary: scoreSecondary,
      performed_at: format(date, 'yyyy-MM-dd'),
      notes: notes || undefined,
      is_capped: isCapped,
      capped_rounds: isCapped ? cappedRounds : undefined,
      capped_reps: isCapped ? cappedReps : undefined,
    });

    // Mark as PR and show celebration
    if (prCheck.isPR && result) {
      await markAsPR(result.id);
      
      const client = clients.find(c => c.id === clientId);
      const newScoreFormatted = formatRxScore(scorePrimary, scoringMode, scoreSecondary);
      const previousScoreFormatted = prCheck.previousBest 
        ? formatRxScore(prCheck.previousBest, scoringMode)
        : undefined;

      setPrData({
        clientName: client?.name || 'Klient',
        newScore: newScoreFormatted,
        previousScore: previousScoreFormatted,
        improvementLabel: prCheck.improvementLabel || undefined,
      });
      setShowPRCelebration(true);
    }

    // Reset form
    setClientId('');
    setMinutes(0);
    setSeconds(0);
    setRounds(0);
    setReps(0);
    setWeight(0);
    setNotes('');
    setIsCapped(false);
    setCappedRounds(0);
    setCappedReps(0);
    onOpenChange(false);
  };

  const renderScoreInput = () => {
    if (isCapped) {
      return (
        <div className="space-y-4 p-4 border border-yellow-500/50 rounded-lg bg-yellow-500/10">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Nedokončeno v časovém limitu</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dokončená kola</Label>
              <Input
                type="number"
                min={0}
                value={cappedRounds}
                onChange={(e) => setCappedRounds(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Zbývající reps</Label>
              <Input
                type="number"
                min={0}
                value={cappedReps}
                onChange={(e) => setCappedReps(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
        </div>
      );
    }

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

  const showCapOption = scoringMode === 'for_time' && workout.time_cap_seconds;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zapsat výsledek</DialogTitle>
            <DialogDescription>
              {workout.name} ({scoringModeLabels[scoringMode]})
              {workout.time_cap_seconds && (
                <span className="ml-1">
                  • {Math.floor(workout.time_cap_seconds / 60)} min cap
                </span>
              )}
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

            {/* CAP toggle for time-based workouts */}
            {showCapOption && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Nedokončeno (CAP)</Label>
                  <p className="text-xs text-muted-foreground">
                    Klient nedokončil v časovém limitu
                  </p>
                </div>
                <Switch
                  checked={isCapped}
                  onCheckedChange={setIsCapped}
                />
              </div>
            )}

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

      {/* PR Celebration */}
      {prData && (
        <RxPRCelebration
          open={showPRCelebration}
          onOpenChange={setShowPRCelebration}
          clientName={prData.clientName}
          workoutName={workout.name}
          newScore={prData.newScore}
          previousScore={prData.previousScore}
          improvementLabel={prData.improvementLabel}
        />
      )}
    </>
  );
}
