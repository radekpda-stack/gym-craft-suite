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
import { useClients } from '@/hooks/useClients';
import { 
  useTrainerResultEntry, 
  calculateAmrapScore, 
  timeToSeconds 
} from '@/hooks/useTrainerResultEntry';
import { Challenge } from '@/hooks/useChallenges';
import { Loader2, ClipboardEdit } from 'lucide-react';

interface TrainerResultEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge;
}

export function TrainerResultEntry({ 
  open, 
  onOpenChange, 
  challenge 
}: TrainerResultEntryProps) {
  const [clientId, setClientId] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [rounds, setRounds] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');

  const { data: clients = [], isLoading: isLoadingClients } = useClients();
  const submitResult = useTrainerResultEntry();

  // Determine scoring mode from challenge
  const getScoringMode = () => {
    if (challenge.scoring_type === 'time_lower_better') return 'for_time';
    if (challenge.primary_metric === 'weight_kg') return 'max_load';
    if (challenge.primary_metric === 'reps' || challenge.primary_metric === 'rounds') return 'amrap';
    return 'for_time';
  };

  const scoringMode = getScoringMode();

  const handleSubmit = async () => {
    if (!clientId) return;

    let scorePrimary: number;
    let scoreSecondary: number | undefined;

    switch (scoringMode) {
      case 'for_time':
        scorePrimary = timeToSeconds(
          parseInt(minutes) || 0, 
          parseInt(seconds) || 0
        );
        break;
      case 'amrap':
        scorePrimary = calculateAmrapScore(
          parseInt(rounds) || 0, 
          parseInt(reps) || 0
        );
        scoreSecondary = parseInt(reps) || 0;
        break;
      case 'max_load':
        scorePrimary = parseFloat(weight) || 0;
        break;
      default:
        scorePrimary = 0;
    }

    try {
      await submitResult.mutateAsync({
        challengeId: challenge.id,
        clientId,
        scorePrimary,
        scoreSecondary,
        note: note || undefined,
      });
      
      // Reset form
      setClientId('');
      setMinutes('');
      setSeconds('');
      setRounds('');
      setReps('');
      setWeight('');
      setNote('');
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const renderScoreInput = () => {
    switch (scoringMode) {
      case 'for_time':
        return (
          <div className="space-y-2">
            <Label>Čas</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-20"
                min="0"
              />
              <span className="text-muted-foreground">:</span>
              <Input
                type="number"
                placeholder="Sec"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                className="w-20"
                min="0"
                max="59"
              />
            </div>
          </div>
        );
      case 'amrap':
        return (
          <div className="space-y-2">
            <Label>Výsledek</Label>
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <Input
                  type="number"
                  placeholder="Kola"
                  value={rounds}
                  onChange={(e) => setRounds(e.target.value)}
                  className="w-24"
                  min="0"
                />
                <span className="text-xs text-muted-foreground">kola</span>
              </div>
              <span className="text-muted-foreground">+</span>
              <div className="space-y-1">
                <Input
                  type="number"
                  placeholder="Opak."
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="w-24"
                  min="0"
                />
                <span className="text-xs text-muted-foreground">opakování</span>
              </div>
            </div>
          </div>
        );
      case 'max_load':
        return (
          <div className="space-y-2">
            <Label>Váha (kg)</Label>
            <Input
              type="number"
              placeholder="Váha v kg"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min="0"
              step="0.5"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const isValid = () => {
    if (!clientId) return false;
    switch (scoringMode) {
      case 'for_time':
        return (parseInt(minutes) || 0) > 0 || (parseInt(seconds) || 0) > 0;
      case 'amrap':
        return (parseInt(rounds) || 0) > 0 || (parseInt(reps) || 0) > 0;
      case 'max_load':
        return (parseFloat(weight) || 0) > 0;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardEdit className="h-5 w-5" />
            Zápis výsledku: {challenge.title}
          </DialogTitle>
          <DialogDescription>
            Zapište výsledek klienta pro tuto výzvu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client selection */}
          <div className="space-y-2">
            <Label>Klient</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte klienta..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingClients ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  clients
                    .filter(c => !c.is_archived)
                    .map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                        {client.gender && (
                          <span className="ml-2 text-muted-foreground">
                            ({client.gender === 'male' ? 'M' : 'Ž'})
                          </span>
                        )}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Score input based on scoring mode */}
          {renderScoreInput()}

          {/* Note */}
          <div className="space-y-2">
            <Label>Poznámka (volitelné)</Label>
            <Textarea
              placeholder="Poznámka k výsledku..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValid() || submitResult.isPending}
          >
            {submitResult.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Zapsat výsledek
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
