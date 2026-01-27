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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useClients } from '@/hooks/useClients';
import { 
  useTrainerResultEntry, 
  calculateAmrapScore, 
  timeToSeconds 
} from '@/hooks/useTrainerResultEntry';
import { Challenge } from '@/hooks/useChallenges';
import { Loader2, ClipboardEdit, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [rounds, setRounds] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');

  const { data: clients = [], isLoading: isLoadingClients } = useClients();
  const submitResult = useTrainerResultEntry();

  // Filter non-archived clients
  const activeClients = clients.filter(c => !c.is_archived);
  
  // Filter clients for searchable combobox
  const filteredClients = clientSearch.trim()
    ? activeClients.filter((client) => {
        const searchLower = clientSearch.toLowerCase();
        return client.name.toLowerCase().includes(searchLower);
      })
    : activeClients;

  const selectedClient = clients.find((c) => c.id === clientId);

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
          {/* Client selection with search */}
          <div className="space-y-2">
            <Label>Klient</Label>
            <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientSearchOpen}
                  className="w-full justify-between"
                >
                  {selectedClient
                    ? `${selectedClient.name}${selectedClient.gender ? ` (${selectedClient.gender === 'male' ? 'M' : 'Ž'})` : ''}`
                    : 'Vyberte klienta...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Hledat klienta..."
                    value={clientSearch}
                    onValueChange={setClientSearch}
                  />
                  <CommandList>
                    {isLoadingClients ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>Žádný klient nenalezen</CommandEmpty>
                        <CommandGroup>
                          {filteredClients.slice(0, 50).map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.id}
                              onSelect={() => {
                                setClientId(client.id);
                                setClientSearchOpen(false);
                                setClientSearch('');
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  clientId === client.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span>{client.name}</span>
                              {client.gender && (
                                <span className="text-muted-foreground ml-1">
                                  ({client.gender === 'male' ? 'M' : 'Ž'})
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
