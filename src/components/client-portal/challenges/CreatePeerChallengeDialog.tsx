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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Swords, Users, Globe, Loader2, ChevronRight, ChevronLeft, Settings2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAvailableChallengers } from '@/hooks/useAvailableChallengers';
import { useCreatePeerChallenge } from '@/hooks/usePeerChallenges';
import { useToast } from '@/hooks/use-toast';
import { MultiMetricConfig, MetricConfig, LeaderboardConfig } from './MultiMetricConfig';
import { PublicChallengeSettings } from './PublicChallengeSettings';

interface CreatePeerChallengeDialogProps {
  open: boolean;
  onClose: () => void;
}

const SIMPLE_METRICS = [
  { value: 'reps', label: 'Opakování (více = lepší)' },
  { value: 'time_lower_better', label: 'Čas (méně = lepší)' },
  { value: 'time_higher_better', label: 'Čas (více = lepší)' },
  { value: 'distance', label: 'Vzdálenost (více = lepší)' },
  { value: 'weight', label: 'Váha (více = lepší)' },
];

const DEFAULT_METRIC: MetricConfig = {
  key: 'primary',
  label: 'Hlavní výsledek',
  unit: 'reps',
  type: 'integer',
  required: true,
  order: 0,
};

export function CreatePeerChallengeDialog({ open, onClose }: CreatePeerChallengeDialogProps) {
  const [step, setStep] = useState(1);
  const [challengeType, setChallengeType] = useState<'duel' | 'private' | 'public'>('duel');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 7));
  const [selectedOpponent, setSelectedOpponent] = useState<string>('');
  
  // Simple mode
  const [metricMode, setMetricMode] = useState<'simple' | 'advanced'>('simple');
  const [simpleMetric, setSimpleMetric] = useState('reps');
  const [simpleScoringType, setSimpleScoringType] = useState('value_higher_better');
  
  // Advanced multi-metric mode
  const [metrics, setMetrics] = useState<MetricConfig[]>([{ ...DEFAULT_METRIC }]);
  const [leaderboardConfig, setLeaderboardConfig] = useState<LeaderboardConfig>({
    primary_metric_key: 'primary',
    direction: 'max',
    tie_breakers: [],
  });
  
  // Public settings
  const [isPublic, setIsPublic] = useState(false);
  const [publicSlug, setPublicSlug] = useState('');
  const [requirePhotoProof, setRequirePhotoProof] = useState(false);

  const { data: challengers = [], isLoading: loadingChallengers } = useAvailableChallengers();
  const createChallenge = useCreatePeerChallenge();
  const { toast } = useToast();

  const handleSimpleMetricChange = (value: string) => {
    setSimpleMetric(value);
    if (value === 'time_lower_better') {
      setSimpleScoringType('time_lower_better');
    } else {
      setSimpleScoringType('value_higher_better');
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

    if (metricMode === 'advanced' && metrics.length === 0) {
      toast({ title: 'Přidejte alespoň jednu metriku', variant: 'destructive' });
      return;
    }

    if (metricMode === 'advanced' && metrics.some(m => !m.label)) {
      toast({ title: 'Vyplňte názvy všech metrik', variant: 'destructive' });
      return;
    }

    if (isPublic && !publicSlug) {
      toast({ title: 'Zadejte veřejný odkaz', variant: 'destructive' });
      return;
    }

    try {
      // Build metrics config for advanced mode
      const metricsConfig = metricMode === 'advanced' ? {
        metrics,
        leaderboard: leaderboardConfig,
      } : null;

      await createChallenge.mutateAsync({
        title,
        description: description || undefined,
        challenge_type: isPublic ? 'public' : challengeType,
        source_type: 'custom',
        primary_metric: metricMode === 'simple' ? simpleMetric : 'custom',
        scoring_type: metricMode === 'simple' ? simpleScoringType : 
          (leaderboardConfig.direction === 'max' ? 'value_higher_better' : 'time_lower_better'),
        end_at: endDate.toISOString(),
        invited_client_ids: challengeType === 'duel' && selectedOpponent ? [selectedOpponent] : undefined,
        // Extended fields for public challenges
        is_public: isPublic,
        public_slug: isPublic ? publicSlug : undefined,
        require_photo_proof: requirePhotoProof,
        metrics_config: metricsConfig,
        leaderboard_config: metricsConfig ? leaderboardConfig : undefined,
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
    setEndDate(addDays(new Date(), 7));
    setSelectedOpponent('');
    setMetricMode('simple');
    setSimpleMetric('reps');
    setSimpleScoringType('value_higher_better');
    setMetrics([{ ...DEFAULT_METRIC }]);
    setLeaderboardConfig({ primary_metric_key: 'primary', direction: 'max', tie_breakers: [] });
    setIsPublic(false);
    setPublicSlug('');
    setRequirePhotoProof(false);
  };

  const totalSteps = 3;

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); resetForm(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Nová výzva
            <span className="text-sm font-normal text-muted-foreground">
              (krok {step}/{totalSteps})
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
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
                        <div className="text-sm text-muted-foreground">
                          Kdokoliv od stejného trenéra + veřejná stránka
                        </div>
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
                        Klienti bez povolení jsou zobrazeni pod přezdívkou
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-base mb-3 block">Hodnocení výsledků</Label>
                    <Tabs value={metricMode} onValueChange={(v) => setMetricMode(v as any)}>
                      <TabsList className="w-full">
                        <TabsTrigger value="simple" className="flex-1">Jednoduchý režim</TabsTrigger>
                        <TabsTrigger value="advanced" className="flex-1">
                          <Settings2 className="h-4 w-4 mr-1" />
                          Více metrik
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="simple" className="mt-4">
                        <div>
                          <Label>Metrika hodnocení *</Label>
                          <Select value={simpleMetric} onValueChange={handleSimpleMetricChange}>
                            <SelectTrigger className="mt-1.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SIMPLE_METRICS.map((m) => (
                                <SelectItem key={m.value} value={m.value}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="advanced" className="mt-4">
                        <MultiMetricConfig
                          metrics={metrics}
                          leaderboardConfig={leaderboardConfig}
                          onMetricsChange={setMetrics}
                          onLeaderboardConfigChange={setLeaderboardConfig}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <PublicChallengeSettings
                isPublic={isPublic || challengeType === 'public'}
                publicSlug={publicSlug}
                requirePhotoProof={requirePhotoProof}
                onIsPublicChange={(v) => {
                  setIsPublic(v);
                  if (v && challengeType !== 'public') {
                    setChallengeType('public');
                  }
                }}
                onPublicSlugChange={setPublicSlug}
                onRequirePhotoProofChange={setRequirePhotoProof}
              />
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row justify-between">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Zrušit
              </Button>
              <Button onClick={() => setStep(2)}>
                Pokračovat
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : step === 2 ? (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Zpět
              </Button>
              <Button onClick={() => setStep(3)}>
                Pokračovat
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
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
