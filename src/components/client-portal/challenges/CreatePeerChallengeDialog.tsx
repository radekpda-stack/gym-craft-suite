import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Swords, Users, Globe, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAvailableChallengers } from '@/hooks/useAvailableChallengers';
import { useCreatePeerChallenge } from '@/hooks/usePeerChallenges';
import { useToast } from '@/hooks/use-toast';

interface CreatePeerChallengeDialogProps {
  open: boolean;
  onClose: () => void;
}

const METRICS = [
  { value: 'reps', label: 'Opakování (více = lepší)' },
  { value: 'time_lower_better', label: 'Čas (méně = lepší)' },
  { value: 'time_higher_better', label: 'Čas (více = lepší)' },
  { value: 'distance', label: 'Vzdálenost (více = lepší)' },
  { value: 'weight', label: 'Váha (více = lepší)' },
];

export function CreatePeerChallengeDialog({ open, onClose }: CreatePeerChallengeDialogProps) {
  const [step, setStep] = useState(1);
  const [challengeType, setChallengeType] = useState<'duel' | 'private' | 'public'>('duel');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [primaryMetric, setPrimaryMetric] = useState('reps');
  const [scoringType, setScoringType] = useState('value_higher_better');
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 7));
  const [selectedOpponent, setSelectedOpponent] = useState<string>('');

  const { data: challengers = [], isLoading: loadingChallengers } = useAvailableChallengers();
  const createChallenge = useCreatePeerChallenge();
  const { toast } = useToast();

  const handleMetricChange = (value: string) => {
    setPrimaryMetric(value);
    if (value === 'time_lower_better') {
      setScoringType('time_lower_better');
    } else {
      setScoringType('value_higher_better');
    }
  };

  const handleCreate = async () => {
    if (!title || !endDate) {
      toast({ title: 'Vyplňte všechna povinná pole', variant: 'destructive' });
      return;
    }

    if (challengeType === 'duel' && !selectedOpponent) {
      toast({ title: 'Vyberte soupeře pro duel', variant: 'destructive' });
      return;
    }

    try {
      await createChallenge.mutateAsync({
        title,
        description: description || undefined,
        challenge_type: challengeType,
        source_type: 'custom',
        primary_metric: primaryMetric,
        scoring_type: scoringType,
        end_at: endDate.toISOString(),
        invited_client_ids: challengeType === 'duel' && selectedOpponent ? [selectedOpponent] : undefined,
      });

      toast({ title: 'Výzva vytvořena!' });
      onClose();
      resetForm();
    } catch (error: any) {
      toast({ 
        title: 'Chyba při vytváření výzvy', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  const resetForm = () => {
    setStep(1);
    setChallengeType('duel');
    setTitle('');
    setDescription('');
    setPrimaryMetric('reps');
    setScoringType('value_higher_better');
    setEndDate(addDays(new Date(), 7));
    setSelectedOpponent('');
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); resetForm(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nová výzva</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {step === 1 && (
            <>
              <div>
                <Label className="text-base mb-3 block">Typ výzvy</Label>
                <RadioGroup
                  value={challengeType}
                  onValueChange={(v) => setChallengeType(v as any)}
                  className="grid gap-3"
                >
                  <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                    <RadioGroupItem value="duel" />
                    <Swords className="h-5 w-5 text-orange-500" />
                    <div>
                      <div className="font-medium">1v1 Duel</div>
                      <div className="text-sm text-muted-foreground">Osobní souboj s jedním soupeřem</div>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                    <RadioGroupItem value="private" />
                    <Users className="h-5 w-5 text-purple-500" />
                    <div>
                      <div className="font-medium">Privátní skupina</div>
                      <div className="text-sm text-muted-foreground">Pozvi vybrané klienty přes kód</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                    <RadioGroupItem value="public" />
                    <Globe className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="font-medium">Veřejná výzva</div>
                      <div className="text-sm text-muted-foreground">Kdokoliv od stejného trenéra se může připojit</div>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Název výzvy *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="např. Kdo dá víc shybů"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Popis (volitelné)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Pravidla, motivace..."
                    className="mt-1.5"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Metrika hodnocení *</Label>
                  <Select value={primaryMetric} onValueChange={handleMetricChange}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRICS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Konec výzvy *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal mt-1.5',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP', { locale: cs }) : 'Vyberte datum'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {challengeType === 'duel' && (
                  <div>
                    <Label>Vyber soupeře *</Label>
                    <Select value={selectedOpponent} onValueChange={setSelectedOpponent}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Vyber soupeře..." />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingChallengers ? (
                          <div className="p-2 text-center text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : challengers.length === 0 ? (
                          <div className="p-2 text-center text-muted-foreground text-sm">
                            Žádní dostupní soupeři
                          </div>
                        ) : (
                          challengers.map((c) => (
                            <SelectItem key={c.client_id} value={c.client_id}>
                              {c.display_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Zobrazují se pouze klienti, kteří jsou viditelní v žebříčku
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Zrušit
              </Button>
              <Button onClick={() => setStep(2)}>
                Pokračovat
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Zpět
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={createChallenge.isPending}
              >
                {createChallenge.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Vytvořit výzvu
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
